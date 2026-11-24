// =========================================================
// 公開ページ用の掲示板・閲覧専用 API（Cloudflare Pages Functions）
//   GET /api/board-view?limit=3&before=ID … 親投稿を新しい順に（返信つき）。before を付けるとその ID より古いものだけ
//   返す値: total（全体の件数）, remaining（返した分より古い投稿の件数）, posts
// 読み取りだけ。書き込み・削除はできない（/api/board の方で行う）。
// 1回に返す件数は最大 MAX_LIMIT 件。D1 の DB バインディングが未設定なら 503。
// =========================================================
const MAX_LIMIT = 10;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: "not_ready" }, 503);
  const q = new URL(request.url).searchParams;
  // ページ送りは件数ではなく「最後に表示した投稿のID」を基準にする（途中で削除・追加があってもずれない）
  const before = parseInt(q.get("before") || "", 10);
  const cursor = Number.isInteger(before) && before > 0 ? before : Number.MAX_SAFE_INTEGER;
  const limit = Math.max(1, Math.min(MAX_LIMIT, parseInt(q.get("limit") || "3", 10) || 3));

  const total = await env.DB.prepare("SELECT COUNT(*) AS n FROM posts WHERE parent_id IS NULL AND deleted = 0").first();
  const parents = await env.DB.prepare(
    "SELECT id, name, body, created_at AS createdAt FROM posts WHERE parent_id IS NULL AND deleted = 0 AND id < ? ORDER BY id DESC LIMIT ?",
  )
    .bind(cursor, limit)
    .all();
  const oldest = parents.results.length ? parents.results[parents.results.length - 1].id : cursor;
  const rest = await env.DB.prepare("SELECT COUNT(*) AS n FROM posts WHERE parent_id IS NULL AND deleted = 0 AND id < ?")
    .bind(oldest)
    .first();
  const ids = parents.results.map((p) => p.id);
  const byParent = new Map();
  if (ids.length) {
    const replies = await env.DB.prepare(
      `SELECT id, parent_id AS parentId, name, body, created_at AS createdAt FROM posts WHERE deleted = 0 AND parent_id IN (${ids
        .map(() => "?")
        .join(",")}) ORDER BY id ASC`,
    )
      .bind(...ids)
      .all();
    for (const r of replies.results) {
      if (!byParent.has(r.parentId)) byParent.set(r.parentId, []);
      byParent.get(r.parentId).push({ id: r.id, name: r.name, body: r.body, createdAt: r.createdAt });
    }
  }
  const posts = parents.results.map((p) => ({ ...p, replies: byParent.get(p.id) || [] }));
  return json({ total: total?.n ?? 0, remaining: rest?.n ?? 0, posts });
}

// 上記以外のメソッドは 405
export const onRequest = () => json({ error: "method_not_allowed" }, 405);
