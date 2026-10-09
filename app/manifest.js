import { asset, SITE, THEME } from "../lib/site";

// 静的書き出し（output: "export"）で1つのファイルとして出力する
export const dynamic = "force-static";

// ホーム画面に追加したときのアイコン・名称。
export default function manifest() {
  return {
    name: SITE.name,
    short_name: "24＆12時間走",
    description:
      "新潟市西蒲区・城山運動公園で開催する24時間走・12時間走の公式サイト",
    start_url: `${asset("/")}`,
    display: "standalone",
    background_color: THEME.background,
    theme_color: THEME.color,
    lang: "ja",
    icons: [
      { src: asset("/icon-192.png"), sizes: "192x192", type: "image/png" },
      { src: asset("/icon-512.png"), sizes: "512x512", type: "image/png" },
    ],
  };
}
