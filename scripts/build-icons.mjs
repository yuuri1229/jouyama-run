// =========================================================
// アイコンのSVGスプライトを作る（npm run build / dev の最初に自動実行）
// ---------------------------------------------------------
// 以前はアイコンを Google Fonts のアイコンフォントとして読んでいたため、
//   ・描画を止める外部CSSの取得（fonts.googleapis.com）と
//     フォント本体の取得（fonts.gstatic.com）が毎回の初回表示に挟まる
//   ・フォントが届くまでアイコンが空白になる
// という遅れがあった。lib/assets.js の MATERIAL_ICONS に並べた名前だけを
// npm パッケージ（@material-symbols/svg-400）からSVGとして取り出し、
// ページに埋め込む。外部への通信は発生しない。
//
// 出力: lib/icons.generated.js（ビルドのたびに作り直すので git には入れない）
// =========================================================
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { MATERIAL_ICONS } from "../lib/assets.js";

const require = createRequire(import.meta.url);
const pkgDir = path.dirname(require.resolve("@material-symbols/svg-400/package.json"));
const OUT = "lib/icons.generated.js";

const paths = {};
const missing = [];
for (const name of [...new Set(MATERIAL_ICONS)].sort()) {
  let svg;
  try {
    svg = await readFile(path.join(pkgDir, "outlined", `${name}.svg`), "utf8");
  } catch {
    missing.push(name);
    continue;
  }
  // Material Symbols のSVGは viewBox="0 -960 960 960" の <path> 1本だけでできている。
  // それ以外の形なら黙って崩れないよう止める
  const d = svg.match(/^<svg[^>]*viewBox="0 -960 960 960"[^>]*><path d="([^"]+)"\/><\/svg>\s*$/);
  if (!d) throw new Error(`[icons] ${name}.svg の形式が想定外です`);
  paths[name] = d[1];
}

if (missing.length) {
  console.error(
    `[icons] 見つからないアイコン名があります: ${missing.join(", ")}\n` +
      "        lib/assets.js の MATERIAL_ICONS の綴りを https://fonts.google.com/icons で確認してください。"
  );
  process.exit(1);
}

await writeFile(
  OUT,
  "// scripts/build-icons.mjs が自動生成するファイルです。直接編集しないでください。\n" +
    `export const ICON_PATHS = ${JSON.stringify(paths, null, 2)};\n`
);
console.log(`[icons] ${Object.keys(paths).length} icons -> ${OUT}`);
