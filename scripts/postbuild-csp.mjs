// =========================================================
// Content-Security-Policy をHTMLに書き込む（npm run build の最後に自動実行）
// ---------------------------------------------------------
// CSP は「このページで実行・読み込みしてよいものの一覧」をブラウザに伝える仕組み。
// 万一ページに不正なスクリプトが紛れ込んでも（記事HTMLへの埋め込み、
// 外部サービス経由の改ざんなど）、一覧に無いものはブラウザが実行しない。
//
// GitHub Pages はレスポンスヘッダーを設定できないため、
// <meta http-equiv="Content-Security-Policy"> として各HTMLの先頭に入れる。
//
// Next.js が書き出すインラインスクリプト（ページの初期データ）は
// ビルドごとに中身が変わるので、ここで1本ずつ SHA-256 を計算して
// 「この中身のものだけ実行してよい」と指定する。'unsafe-inline' は使わない。
// =========================================================
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = "out";

// 外部の読み込み先。Googleアナリティクス（GA4）は Google の推奨設定に合わせる
// https://developers.google.com/tag-platform/security/guides/csp
const GA_SCRIPT = ["https://*.googletagmanager.com"];
const GA_IMG = ["https://*.google-analytics.com", "https://*.googletagmanager.com"];
const GA_CONNECT = [
  "https://*.google-analytics.com",
  "https://*.analytics.google.com",
  "https://*.googletagmanager.com",
];
// microCMS の記事に載せた画像
const MICROCMS_IMG = ["https://images.microcms-assets.io"];
// 記事に埋め込める動画・地図（components/NewsBody.jsx の許可リストと揃える）
const FRAMES = ["https://www.youtube.com", "https://www.youtube-nocookie.com", "https://www.google.com"];

function policy(scriptHashes) {
  const directives = {
    "default-src": ["'self'"],
    "script-src": ["'self'", ...scriptHashes, ...GA_SCRIPT],
    // React の style 属性（タイムバンドの色など）があるため、スタイルだけはインラインを許可
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", ...MICROCMS_IMG, ...GA_IMG],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...GA_CONNECT],
    "frame-src": FRAMES,
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "upgrade-insecure-requests": [],
  };
  return Object.entries(directives)
    .map(([k, v]) => [k, ...v].join(" "))
    .join("; ");
}

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(p);
    else if (entry.name.endsWith(".html")) yield p;
  }
}

// 実行されるインラインスクリプト（src なし・JavaScript として扱われるもの）
const INLINE_SCRIPT = /<script(?![^>]*\ssrc=)([^>]*)>([\s\S]*?)<\/script>/g;
const isJavaScript = (attrs) => {
  const type = attrs.match(/\stype="([^"]*)"/)?.[1];
  return !type || /^(text|application)\/javascript$|^module$/i.test(type);
};

let pages = 0;
for await (const file of htmlFiles(OUT_DIR)) {
  let html = await readFile(file, "utf8");
  // Google Search Console の確認用ファイルなど、Next.js のページ以外は触らない
  if (!html.includes("<head>")) continue;
  if (html.includes('http-equiv="Content-Security-Policy"')) {
    throw new Error(`[csp] ${file} には既に CSP があります（二重実行？）`);
  }

  const hashes = new Set();
  for (const [, attrs, body] of html.matchAll(INLINE_SCRIPT)) {
    if (!isJavaScript(attrs)) continue;
    hashes.add(`'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`);
  }

  // CSP の meta は、それより後ろに書かれたものにしか効かない。
  // 文字コード指定の直後＝どのスクリプトよりも前に置く。
  const meta = `<meta http-equiv="Content-Security-Policy" content="${policy([...hashes])}"/>`;
  const charset = /<meta charSet="utf-8"\/>/i;
  if (!charset.test(html)) throw new Error(`[csp] ${file} に <meta charSet> が見つかりません`);
  html = html.replace(charset, (m) => `${m}${meta}`);

  // 念のため、CSP より前にスクリプトが無いことを確かめる
  const beforeCsp = html.slice(0, html.indexOf(meta));
  if (/<script/i.test(beforeCsp)) throw new Error(`[csp] ${file}: CSP より前に <script> があります`);

  await writeFile(file, html);
  pages++;
}
console.log(`[csp] Content-Security-Policy を ${pages} ページに設定しました`);
