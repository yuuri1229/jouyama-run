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
// 居住地は住所を「新潟県内＝市町村名／県外＝都道府県名」に変換してから書き出し、
// 住所そのものは書き出さない（lib/residence.js）。出走カテゴリも
// シートの文字列（金額入り）ではなく 24H／デイ／ナイト の区分だけを残す。
// 管理シートは読むだけで、書き換えない（権限も閲覧のみ）。
//
// 【個人情報の扱い】Actions のログは誰でも見られるため、
// このスクリプトはシートの値を一切ログに出さない（件数と見出し名だけ）。
// 依存パッケージを入れる前に動かすので、Node.js の標準機能だけで書いている。
// =========================================================
import { createSign } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { ENTRIES_FILE, ENTRY_CATEGORIES, ENTRY_SHEET } from "../lib/entries.js";
import { toResidence } from "../lib/residence.js";

const SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

const { GOOGLE_SERVICE_ACCOUNT_JSON, ENTRY_SHEET_ID, ENTRY_SHEET_RANGE } = process.env;

if (!GOOGLE_SERVICE_ACCOUNT_JSON || !ENTRY_SHEET_ID) {
  // 未連携のあいだはファイルを作らない。ページは「準備中」表示になる
  console.log("[entries] シート連携が未設定のためスキップします");
  await rm(ENTRIES_FILE, { force: true });
  process.exit(0);
}

// 値の比較用。全角英数→半角、空白・括弧の全角半角の違いを吸収する
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

// 列の文字（"A"〜"Z", "AA" …）→ 0始まりの位置
const colIndex = (letter) =>
  [...letter.toUpperCase()].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
const col = {};
for (const [field, letter] of Object.entries(ENTRY_SHEET.columns)) {
  if (letter) col[field] = colIndex(letter);
}

// 読むシート。未指定なら先頭のシート
let sheetName = ENTRY_SHEET_RANGE;
if (!sheetName) {
  const meta = await sheetsGet(`${sheetUrl}?fields=sheets.properties.title`, token);
  sheetName = meta.sheets[0].properties.title;
}
const lastCol = Object.values(ENTRY_SHEET.columns)
  .filter(Boolean)
  .sort((a, b) => colIndex(b) - colIndex(a))[0];
const range = `'${sheetName.replaceAll("'", "''")}'!A:${lastCol}`;
const { values = [] } = await sheetsGet(
  `${sheetUrl}/values/${encodeURIComponent(range)}`,
  token
);
if (values.length === 0) throw new Error("[entries] シートが空です");

const paid = norm(ENTRY_SHEET.paidStatus);
const cell = (row, field) => (field in col ? String(row[col[field]] ?? "").trim() : "");
const entries = [];
let unknownCategory = 0;
// ゼッケンNo.は管理シートに無いため、カテゴリごとにエントリー順（シートの行順）で振る。
// 掲載する（振込済みの）人だけで詰めて連番にする。そのため、先にエントリーした人が
// あとから入金すると、それより後ろの人の番号が1つずつずれる（実行委員会の判断）。
const nextBib = Object.fromEntries(ENTRY_CATEGORIES.map((c) => [c.id, c.bibStart]));
// 見出し行は入金ステータスが「振込済み」にならないので数えに入らない
for (const row of values) {
  const isPaid = norm(cell(row, "status")) === paid;
  const categoryText = norm(cell(row, "category"));
  const category = ENTRY_CATEGORIES.find((c) => c.match.test(categoryText));
  if (!category) {
    if (isPaid) unknownCategory++;
    continue;
  }
  if (!isPaid) continue;
  const bib = String(nextBib[category.id]++);
  entries.push({
    category: category.id,
    bib,
    name: cell(row, "name"),
    kana: cell(row, "kana"),
    residence: toResidence(cell(row, "address")),
    gender: cell(row, "gender"),
  });
}
const noResidence = entries.filter((e) => !e.residence).length;
if (noResidence) {
  console.warn(`[entries] 住所から居住地を判別できない行が ${noResidence} 件あり、「—」で掲載します`);
}
if (unknownCategory) {
  console.warn(
    `[entries] 出走カテゴリを判別できない「振込済み」の行が ${unknownCategory} 件あり、掲載していません`
  );
}

// ゼッケン順
entries.sort((a, b) => Number(a.bib) - Number(b.bib));

await mkdir(path.dirname(ENTRIES_FILE), { recursive: true });
await writeFile(
  ENTRIES_FILE,
  JSON.stringify({ updatedAt: new Date().toISOString(), entries }, null, 2) + "\n"
);
const counts = ENTRY_CATEGORIES.map(
  (c) => `${c.en} ${entries.filter((e) => e.category === c.id).length}`
).join(" / ");
console.log(`[entries] 掲載 ${entries.length} 名（${counts}） -> ${ENTRIES_FILE}`);
