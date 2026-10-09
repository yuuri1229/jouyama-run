import { ICON_PATHS } from "../lib/icons.generated";

// 全ページ共通のアイコン定義（<symbol> の集まり）。app/layout.jsx で
// <body> の先頭に一度だけ置き、各所の <Icon> が <use> で参照する。
// 中身は scripts/build-icons.mjs がビルド時に生成する。
export default function IconSprite() {
  return (
    <svg className="icon-sprite" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      {Object.entries(ICON_PATHS).map(([name, d]) => (
        <symbol key={name} id={`i-${name}`} viewBox="0 -960 960 960">
          <path d={d} />
        </symbol>
      ))}
    </svg>
  );
}
