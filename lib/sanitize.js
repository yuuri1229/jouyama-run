import sanitizeHtml from "sanitize-html";

// microCMS のリッチエディタから来るHTMLは、ビルド時にそのままページへ書き出される。
// 万一 microCMS のアカウントやAPIキーが乗っ取られた場合や、
// 他サイトから貼り付けたHTMLに想定外のタグが混ざっていた場合でも、
// <script>・イベント属性（onerror 等）・javascript: のリンクなどが
// 公開ページに載らないよう、使ってよいタグと属性だけを残す（許可リスト方式）。
const SANITIZE_OPTIONS = {
  allowedTags: [
    "p", "br", "hr", "h2", "h3", "h4", "h5",
    "strong", "b", "em", "i", "u", "s", "del", "sub", "sup", "mark",
    "code", "pre", "blockquote", "span", "div",
    "ul", "ol", "li",
    "a", "img", "figure", "figcaption",
    "table", "thead", "tbody", "tr", "th", "td",
    "iframe",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "width", "height"],
    iframe: ["src", "width", "height", "title", "allow", "allowfullscreen"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
    "*": ["style"],
  },
  // 文字色・背景色・文字揃えだけを残す（position などでページを覆う細工を防ぐ）
  allowedStyles: {
    "*": {
      color: [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i],
      "background-color": [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i],
      "text-align": [/^(left|right|center|justify)$/],
    },
  },
  allowedSchemes: ["https", "http", "mailto", "tel"],
  allowedSchemesByTag: { img: ["https", "http"], iframe: ["https"] },
  allowProtocolRelative: false,
  // 埋め込みは YouTube と Google マップだけ（Content-Security-Policy の frame-src と揃える）
  allowedIframeHostnames: ["www.youtube.com", "www.youtube-nocookie.com", "www.google.com"],
  // 許可していない埋め込みは src だけ消えた空の枠になるので、枠ごと取り除く
  exclusiveFilter: (frame) => frame.tag === "iframe" && !frame.attribs.src,
  transformTags: {
    a: (tagName, attribs) => {
      // 別タブで開くリンクは、開いた先から元のページを操作されないようにする
      if (attribs.target === "_blank") attribs.rel = "noopener noreferrer";
      return { tagName, attribs };
    },
    img: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, loading: "lazy", decoding: "async" },
    }),
  },
};
// transformTags で足した属性も残す
SANITIZE_OPTIONS.allowedAttributes.img.push("loading", "decoding");

export function sanitizeNewsHtml(html) {
  return sanitizeHtml(html || "", SANITIZE_OPTIONS);
}
