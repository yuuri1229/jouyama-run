// =========================================================
// 写真のAVIF/WebP変換（配信用の軽量版をつくる）
// ---------------------------------------------------------
//   npm run images
//
// public/img/ の元写真（.jpg）はそのまま残し、隣に
// 幅ちがいの .avif と .webp を書き出します。ページ側は <picture> で
//   ・AVIF対応ブラウザ → いちばん軽い .avif
//   ・WebP対応ブラウザ → .webp
//   ・どちらも非対応   → もとの .jpg
// を、画面幅に合った大きさで出し分けます。元写真を触らないので、やり直しがききます。
//
// ★写真を差し替えたら、このコマンドを実行してから
//   コミットしてください（.avif / .webp も一緒にコミットします）。
// =========================================================
import sharp from "sharp";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const DIR = "public/img";

// ヒーローは全画面に敷くので大きめ、ギャラリーは最大でも
// 4分割表示なので小さめ、と用途ごとに書き出す幅を変える。
//
// 元写真は粒状（高感度）でWebPが不得意な素材のため、WebPは品質68まで落としても
// ヒーロー2〜4枚目が1440px幅で300〜400KBあった。AVIFは粒状の再現が得意で、
// 品質45で同等の見た目のまま約半分になる（実測：hero-2 411KB → 197KB）。
// ノイズ除去（メディアンフィルタ）も試したが、人物の顔が塗り絵のように
// 崩れたため採用していない。
const TARGETS = [
  { match: /^hero-\d+\.jpg$/, widths: [960, 1440, 1920], webp: 68, avif: 45 },
  { match: /^gallery-\d+\.jpg$/, widths: [600, 1200], webp: 72, avif: 50 },
];

const kb = (n) => `${(n / 1024).toFixed(0)}KB`;

const files = (await readdir(DIR)).sort();
const total = { jpg: 0, webp: 0, avif: 0 };

for (const file of files) {
  const target = TARGETS.find((t) => t.match.test(file));
  if (!target) continue;

  const src = path.join(DIR, file);
  const srcSize = (await stat(src)).size;
  const meta = await sharp(src).metadata();
  total.jpg += srcSize;

  const made = [];
  for (const width of target.widths) {
    // 元画像より大きく引き伸ばしても意味がないので上限は元の幅
    if (width > meta.width) continue;
    const base = path.join(DIR, `${path.basename(file, ".jpg")}-${width}`);
    const resized = () => sharp(src).resize({ width, withoutEnlargement: true });
    const webp = await resized().webp({ quality: target.webp, effort: 6 }).toFile(`${base}.webp`);
    const avif = await resized().avif({ quality: target.avif, effort: 6 }).toFile(`${base}.avif`);
    made.push(`${width}w avif ${kb(avif.size)} / webp ${kb(webp.size)}`);
    // 実際に配信されるのは幅ちがいのうち1枚だけ。ノートPC相当の
    // 1440w（ギャラリーは1200w）を代表値として元JPEGと比べる
    if (width === target.widths[1]) {
      total.webp += webp.size;
      total.avif += avif.size;
    }
  }
  console.log(
    `${file.padEnd(16)} ${String(meta.width).padStart(4)}x${meta.height}  ` +
      `${kb(srcSize).padStart(7)} -> ${made.join("  ")}`
  );
}

console.log(
  `\n元JPEG(全幅) ${kb(total.jpg)} -> WebP(代表幅) ${kb(total.webp)} / AVIF(代表幅) ${kb(total.avif)}`
);
