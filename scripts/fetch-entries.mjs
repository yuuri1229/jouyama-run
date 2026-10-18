// =========================================================
// エントリー管理シートから掲載用の参加者一覧を作る（デプロイ時に自動実行）
// ---------------------------------------------------------
// 管理シートはURL非公開のまま、Google Cloud の「サービスアカウント」に
// 閲覧権限だけを共有して読み取る。鍵は GitHub の Secrets に置き、
// リポジトリには入れない。
//
//   GOOGLE_SERVICE_ACCOUNT_JSON  サービスアカウントの鍵（JSONの中身そのまま）
//   ENTRY_SHEET_ID               管理シートのID（URLの /d/ と /edit の間）
//   ENTRY_SHEET_RANGE            読むシート名（任意。省略時は先頭のシート）
//
// 書き出すのは入金ステータスが「振込済み」の行の
// 出走カテゴリ・ゼッケンNo.・氏名・フリガナ・居住地・性別 だけ。
// メールアドレスや電話番号、入金情報などの列は読み込んでもここで捨てる。
//
// 【個人情報の扱い】Actions のログは誰でも見られるため、
// このスクリプトはシートの値を一切ログに出さない（件数と見出し名だけ）。
// 依存パッケージを入れる前に動かすので、Node.js の標準機能だけで書いている。
// =========================================================
import { createSign } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { ENTRIES_FILE, ENTRY_CATEGORIES, ENTRY_SHEET } from "../lib/entries.js";

const SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

const { GOOGLE_SERVICE_ACCOUNT_JSON, ENTRY_SHEET_ID, ENTRY_SHEET_RANGE } = process.env;

if (!GOOGLE_SERVICE_ACCOUNT_JSON || !ENTRY_SHEET_ID) {
  // 未連携のあいだはファイルを作らない。ページは「準備中」表示になる
  console.log("[entries] シート連携が未設定のためスキップします");
  await rm(ENTRIES_FILE, { force: true });
  process.exit(0);
}

// 見出し・値の比較用。全角英数→半角、空白・括弧の全角半角の違いを吸収する
const norm = (s) => String(s ?? "").normalize("NFKC").replace(/\s+/g, "").trim();

const b64url = (buf) => Buffer.from(buf).toString("base64url");

// サービスアカウントの鍵で署名したJWTを、Googleのアクセストークンに引き換える
async function getAccessToken(key) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: key.client_email,
      scope: SCOPE,
      aud: key.token_uri || "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 600,
    })
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const jwt = `${header}.${claims}.${b64url(signer.sign(key.private_key))}`;

  const res = await fetch(key.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    throw new Error(`[entries] 認証に失敗しました（HTTP ${res.status}）。鍵の内容を確認してください`);
  }
  return (await res.json()).access_token;
}

async function sheetsGet(url, token) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 403 || res.status === 404) {
    throw new Error(
      `[entries] シートを読めません（HTTP ${res.status}）。` +
        "シートのIDと、サービスアカウントのメールアドレスに閲覧権限を共有したかを確認してください"
    );
  }
  if (!res.ok) throw new Error(`[entries] シートの取得に失敗しました（HTTP ${res.status}）`);
  return res.json();
}

let key;
try {
  key = JSON.parse(GOOGLE_SERVICE_ACCOUNT_JSON);
} catch {
  throw new Error("[entries] GOOGLE_SERVICE_ACCOUNT_JSON がJSONとして読めません");
}
const token = await getAccessToken(key);
const sheetUrl = `${SHEETS_API}/${encodeURIComponent(ENTRY_SHEET_ID)}`;

// 読む範囲。シート名だけを渡すと、そのシートの入力済みの範囲全体になる
let range = ENTRY_SHEET_RANGE;
if (!range) {
  const meta = await sheetsGet(`${sheetUrl}?fields=sheets.properties.title`, token);
  const title = meta.sheets[0].properties.title;
  range = `'${title.replaceAll("'", "''")}'`;
}
const { values = [] } = await sheetsGet(
  `${sheetUrl}/values/${encodeURIComponent(range)}`,
  token
);
if (values.length === 0) throw new Error("[entries] シートが空です");

// 見出し行から各列の位置を決める
const headers = values[0].map(norm);
const col = {};
const missing = [];
for (const [field, names] of Object.entries(ENTRY_SHEET.columns)) {
  const idx = headers.findIndex((h) => names.some((n) => norm(n) === h));
  if (idx === -1) missing.push(field);
  else col[field] = idx;
}
if (missing.length) {
  // 見出し名は個人情報ではないのでログに出してよい
  throw new Error(
    `[entries] 見出しが見つからない列があります: ${missing.join(", ")}\n` +
      `          シートの見出し: ${values[0].join(" / ")}\n` +
      "          lib/entries.js の ENTRY_SHEET.columns に見出し名を足してください"
  );
}

const paid = norm(ENTRY_SHEET.paidStatus);
const cell = (row, field) => String(row[col[field]] ?? "").trim();
const entries = [];
let unknownCategory = 0;
for (const row of values.slice(1)) {
  if (norm(cell(row, "status")) !== paid) continue;
  const categoryText = norm(cell(row, "category"));
  const category = ENTRY_CATEGORIES.find((c) => c.match.test(categoryText));
  if (!category) {
    unknownCategory++;
    continue;
  }
  // ゼッケンは数字だけを取り出す（「No.1001」「1001番」などの書き方の揺れを吸収）
  const bib = norm(cell(row, "bib")).replace(/\D/g, "");
  entries.push({
    category: category.id,
    bib,
    name: cell(row, "name"),
    kana: cell(row, "kana"),
    residence: cell(row, "residence"),
    gender: cell(row, "gender"),
  });
}
if (unknownCategory) {
  console.warn(
    `[entries] 出走カテゴリを判別できない「振込済み」の行が ${unknownCategory} 件あり、掲載していません`
  );
}

// ゼッケン順。未割り当て（空）の人はフリガナ順で後ろに並べる
entries.sort((a, b) => {
  if (a.bib && b.bib) return Number(a.bib) - Number(b.bib);
  if (a.bib || b.bib) return a.bib ? -1 : 1;
  return a.kana.localeCompare(b.kana, "ja");
});

await mkdir(path.dirname(ENTRIES_FILE), { recursive: true });
await writeFile(
  ENTRIES_FILE,
  JSON.stringify({ updatedAt: new Date().toISOString(), entries }, null, 2) + "\n"
);
const counts = ENTRY_CATEGORIES.map(
  (c) => `${c.en} ${entries.filter((e) => e.category === c.id).length}`
).join(" / ");
console.log(`[entries] 掲載 ${entries.length} 名（${counts}） -> ${ENTRIES_FILE}`);
