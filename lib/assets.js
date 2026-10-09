// =========================================================
// アイコンと写真の指定
// ---------------------------------------------------------
// フォントは app/fonts.js（ビルド時に取り込んで自サイトから配信）、
// アイコンはここに並べた名前から scripts/build-icons.mjs が
// SVGスプライトを作る。どちらも外部サーバーには取りに行かない。
// =========================================================

// サイト内で使っているアイコン（Material Symbols）の名前。
// ビルドのたびに、ここに並べた分だけをSVGにして埋め込む。
// ★アイコンを追加したら、このリストにも名前を足してください。
//   足し忘れるとビルドが止まり、どの名前が無いかを表示します。
//   名前は https://fonts.google.com/icons で確認できます。
export const MATERIAL_ICONS = [
  "arrow_back",
  "arrow_downward",
  "arrow_forward",
  "arrow_outward",
  "battery_charging_full",
  "calendar_month",
  "campaign",
  "checklist",
  "chevron_right",
  "close",
  "dark_mode",
  "directions_run",
  "directions_walk",
  "edit_calendar",
  "flag",
  "gavel",
  "groups",
  "home_work",
  "info",
  "light_mode",
  "location_on",
  "menu",
  "open_in_new",
  "payments",
  "restaurant",
  "route",
  "schedule",
  "sports_score",
  "timer",
  "verified",
  "warning",
];

// ---------------------------------------------------------
// 写真（AVIF / WebP の幅ちがい）
// ---------------------------------------------------------
// scripts/build-images.mjs（npm run images）が public/img/ に
// hero-1-960.avif / hero-1-960.webp のような幅つきファイルを書き出す。
// ページ側は <picture> で AVIF → WebP → 元のjpg の順に出し分ける。
// 幅の選択はブラウザが sizes を見て決める。
export const HERO_WIDTHS = [960, 1440, 1920];
export const GALLERY_WIDTHS = [600, 1200];

// 配信する形式。先に書いたものから順に、対応していれば使われる
export const IMAGE_FORMATS = ["avif", "webp"];

// ("/img/hero-1.jpg", [960, 1440], "avif")
//   -> "/img/hero-1-960.avif 960w, /img/hero-1-1440.avif 1440w"
// asset() は basePath を前置するヘルパー（lib/site.js）
export function imageSrcSet(jpgPath, widths, format, asset = (p) => p) {
  const base = jpgPath.replace(/\.jpg$/, "");
  return widths.map((w) => `${asset(`${base}-${w}.${format}`)} ${w}w`).join(", ");
}

// ヒーロー1枚目＝LCP要素。トップページでだけ preload する（app/page.jsx）
export const HERO_LCP_IMAGE = "/img/hero-1.jpg";
