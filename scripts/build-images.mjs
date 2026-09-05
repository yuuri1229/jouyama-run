// =========================================================
// 写真のWebP変換（配信用の軽量版をつくる）
// ---------------------------------------------------------
//   npm run images
//
// public/img/ の元写真（.jpg）はそのまま残し、隣に
// 幅ちがいの .webp を書き出します。ページ側は <picture> で
//   ・WebP対応ブラウザ → 画面幅に合った軽い .webp
//   ・非対応ブラウザ   → もとの .jpg
// を出し分けます。元写真を触らないので、やり直しがききます。
//
// ★写真を差し替えたら、このコマンドを実行してから
//   コミットしてください（.webp も一緒にコミットします）。
// =========================================================
import sharp from "sharp";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const DIR = "public/img";

// ヒーローは全画面に敷くので大きめ、ギャラリーは最大でも
// 4分割表示なので小さめ、と用途ごとに書き出す幅を変える。
// 品質は78→68に落としている。元写真が粒状(高感度)でWebPが不得意な素材のため、
// 78のままだと元のJPEGとほとんど変わらなかった。ヒーローは暗いスクリムと
// 文字が重なる面なので、68でも見た目の劣化は分からない。
const TARGETS = [
  { match: /^hero-\d+\.jpg$/, widths: [960, 1440, 1920], quality: 68 },
  { match: /^gallery-\d+\.jpg$/, widths: [600, 1200], quality: 72 },
];

const kb = (n) => `${(n / 1024).toFixed(0)}KB`;

const files = (await readdir(DIR)).sort();
let before = 0;
let after = 0;

for (const file of files) {
  const target = TARGETS.find((t) => t.match.test(file));
  if (!target) continue;

  const src = path.join(DIR, file);
  const srcSize = (await stat(src)).size;
  const image = sharp(src);
  const meta = await image.metadata();
  before += srcSize;

  const made = [];
  for (const width of target.widths) {
    // 元画像より大きく引き伸ばしても意味がないので上限は元の幅
    if (width > meta.width) continue;
    const out = path.join(DIR, `${path.basename(file, ".jpg")}-${width}.webp`);
    const info = await sharp(src)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: target.quality, effort: 6 })
      .toFile(out);
    made.push(`${width}w ${kb(info.size)}`);
    // 実際に配信されるのは幅ちがいのうち1枚だけ。ノートPC相当の
    // 1440w（ギャラリーは1200w）を代表値として元JPEGと比べる
    if (width === target.widths[1]) after += info.size;
  }
  console.log(
    `${file.padEnd(16)} ${String(meta.width).padStart(4)}x${meta.height}  ` +
      `${kb(srcSize).padStart(7)} -> ${made.join(" / ")}`
  );
}

console.log(
  `\n元JPEG(全幅) ${kb(before)} -> WebP(代表幅) ${kb(after)} ` +
    `(${(100 - (after / before) * 100).toFixed(1)}% 削減)`
);
