// =========================================================
// 外部フォントとファーストビュー画像の指定
// ---------------------------------------------------------
// globals.css の @import をやめてここに集約しています。
// @import はCSSを読み終えてから初めてフォントCSSの取得が始まるため、
// 描画開始が1往復ぶん遅れます（<link> なら並行して取得できる）。
// =========================================================

// サイト内で使っているMaterial Symbolsのアイコン名。
// icon_names を付けないと全アイコン入りの可変フォント（約2.3MB）を
// 丸ごとダウンロードしてしまうため、使う分だけに絞る（約20KB）。
// ★アイコンを追加したら、このリストにも名前を足してください。
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

export const FONT_HREFS = [
  // 和文（本文・見出し）。900は未使用なので読み込まない
  "https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap",
  // 数字・英字（Oswald）とデータ表記の等幅（IBM Plex Mono）
  "https://fonts.googleapis.com/css2?family=Oswald:wght@400;600&family=IBM+Plex+Mono:wght@400;500&display=swap",
  // アイコン。display=block にしないと、フォント到着前に
  // 「campaign」「chevron_right」といった英単語が生で表示される
  `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,300..600,0..1,0&icon_names=${MATERIAL_ICONS.join(
    ","
  )}&display=block`,
];

// ---------------------------------------------------------
// 写真（WebPの幅ちがい）
// ---------------------------------------------------------
// scripts/build-images.mjs（npm run images）が
// public/img/ に hero-1-960.webp のような幅つきファイルを書き出す。
// ページ側は <picture> で「WebP対応なら軽い方、非対応なら元のjpg」に
// 出し分ける。幅の選択はブラウザが sizes を見て決める。
export const HERO_WIDTHS = [960, 1440, 1920];
export const GALLERY_WIDTHS = [600, 1200];

// "/img/hero-1.jpg" -> "/img/hero-1-960.webp 960w, /img/hero-1-1440.webp 1440w, ..."
// asset() は basePath を前置するヘルパー（lib/site.js）
export function webpSrcSet(jpgPath, widths, asset = (p) => p) {
  const base = jpgPath.replace(/\.jpg$/, "");
  return widths.map((w) => `${asset(`${base}-${w}.webp`)} ${w}w`).join(", ");
}

// ヒーロー1枚目＝LCP要素。preloadで先に読み始める
export const HERO_LCP_IMAGE = "/img/hero-1.jpg";
