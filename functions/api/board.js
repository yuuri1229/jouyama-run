// =========================================================
// 選手＆スタッフ交流掲示板の API（Cloudflare Pages Functions）
// ---------------------------------------------------------
//   GET    /api/board           … 投稿一覧（新しい順・返信つき）
//   POST   /api/board           … 投稿／返信（Turnstile 確認つき）
//   DELETE /api/board?id=N      … 運営による削除（Authorization: Bearer 管理キー）
//
// 必要な設定（Cloudflare Pages プロジェクト → 設定）
//   ・D1 バインディング: DB     （migrations/0001_board.sql を流したデータベース）
//   ・シークレット: TURNSTILE_SECRET（Turnstile のシークレットキー）
//   ・シークレット: ADMIN_KEY      （運営が削除するときの管理キー。長い文字列）
// 未設定のときは 503 を返し、画面側は「準備中」と表示する。
// =========================================================
const NAME_MAX = 20;
const POST_MAX = 1000;
const REPLY_MAX = 500;
const LIST_LIMIT = 100; // 一覧に出す親投稿の数
const GAP_SEC = 30; // 同じ人の連続投稿の最短間隔
const HOURLY_MAX = 20; // 同じ人の1時間あたりの上限

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

async function sha256(text) {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}

// 管理キーを時間差攻撃されにくい形で比べる
async function sameKey(a, b) {
  const [x, y] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ error: "not_ready" }, 503);
  const parents = await env.DB.prepare(
    "SELECT id, name, body, created_at AS createdAt FROM posts WHERE parent_id IS NULL AND deleted = 0 ORDER BY id DESC LIMIT ?",
  )
    .bind(LIST_LIMIT)
    .all();
  const replies = await env.DB.prepare(
    "SELECT id, parent_id AS parentId, name, body, created_at AS createdAt FROM posts WHERE parent_id IN (SELECT id FROM (SELECT id FROM posts WHERE parent_id IS NULL AND deleted = 0 ORDER BY id DESC LIMIT ?)) AND deleted = 0 ORDER BY id ASC",
  )
    .bind(LIST_LIMIT)
    .all();
  const byParent = new Map();
  for (const r of replies.results) {
    if (!byParent.has(r.parentId)) byParent.set(r.parentId, []);
    byParent.get(r.parentId).push({ id: r.id, name: r.name, body: r.body, createdAt: r.createdAt });
  }
  const posts = parents.results.map((p) => ({ ...p, replies: byParent.get(p.id) || [] }));
  return json({ posts });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB || !env.TURNSTILE_SECRET) return json({ error: "not_ready" }, 503);

  // 別のサイトのページからの書き込みは受け付けない
  const origin = request.headers.get("Origin");
  if (!origin || origin !== new URL(request.url).origin) return json({ error: "forbidden" }, 403);

  let input;
  try {
    input = await request.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const name = String(input?.name ?? "").trim();
  const body = String(input?.body ?? "").replace(/\r\n/g, "\n").trim();
  const parentId = input?.parentId == null ? null : Number(input.parentId);
  const token = String(input?.token ?? "");

  const max = parentId == null ? POST_MAX : REPLY_MAX;
  if (!name || name.length > NAME_MAX) return json({ error: "bad_name" }, 400);
  if (!body || body.length > max) return json({ error: "bad_body" }, 400);
  if (parentId != null && !Number.isInteger(parentId)) return json({ error: "bad_request" }, 400);

  // スパム防止（Turnstile）
  const ip = request.headers.get("CF-Connecting-IP") || "";
  const verify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip }),
  });
  const result = await verify.json().catch(() => ({}));
  if (!result.success) return json({ error: "turnstile" }, 400);

  // 連続投稿の制限。IP は保存せず、ハッシュ化して比べるだけにする
  const ipHash = await sha256(`${ip}|${env.ADMIN_KEY || env.TURNSTILE_SECRET}`);
  const recent = await env.DB.prepare(
    "SELECT COUNT(*) AS n, MAX(created_at) AS last FROM posts WHERE ip_hash = ? AND created_at > strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-1 hour')",
  )
    .bind(ipHash)
    .first();
  if (recent.n >= HOURLY_MAX) return json({ error: "rate" }, 429);
  if (recent.last && Date.now() - Date.parse(recent.last) < GAP_SEC * 1000) return json({ error: "rate" }, 429);

  // 返信は親の投稿にだけ（返信への返信は不可）
  if (parentId != null) {
    const parent = await env.DB.prepare("SELECT id FROM posts WHERE id = ? AND parent_id IS NULL AND deleted = 0")
      .bind(parentId)
      .first();
    if (!parent) return json({ error: "no_parent" }, 400);
  }

  await env.DB.prepare("INSERT INTO posts (parent_id, name, body, ip_hash) VALUES (?, ?, ?, ?)")
    .bind(parentId, name, body, ipHash)
    .run();
  return json({ ok: true }, 201);
}

export async function onRequestDelete({ request, env }) {
  if (!env.DB || !env.ADMIN_KEY) return json({ error: "not_ready" }, 503);
  const auth = request.headers.get("Authorization") || "";
  const key = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!key || !(await sameKey(key, env.ADMIN_KEY))) return json({ error: "unauthorized" }, 401);
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return json({ error: "bad_request" }, 400);
  // 親を消したら返信もまとめて非表示にする（記録は残す）
  await env.DB.prepare("UPDATE posts SET deleted = 1 WHERE id = ? OR parent_id = ?").bind(id, id).run();
  return json({ ok: true });
}

// 上記以外のメソッドは 405
export const onRequest = () => json({ error: "method_not_allowed" }, 405);
