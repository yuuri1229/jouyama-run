import { asset } from "../lib/site";
import { SITE } from "../lib/site";

// ホーム画面に追加したときのアイコン・名称。
// public/icon-192.png と icon-512.png は用意済みだが、
// これまでどこからも参照されていなかった。
export default function manifest() {
  return {
    name: SITE.name,
    short_name: "24＆12時間走",
    description:
      "新潟市西蒲区・城山運動公園で開催する24時間走・12時間走の公式サイト",
    start_url: `${asset("/")}`,
    display: "standalone",
    background_color: "#f8f7f3",
    theme_color: "#167a1e",
    lang: "ja",
    icons: [
      { src: asset("/icon-192.png"), sizes: "192x192", type: "image/png" },
      { src: asset("/icon-512.png"), sizes: "512x512", type: "image/png" },
    ],
  };
}
