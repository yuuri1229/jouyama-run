import sanitizeHtml from "sanitize-html";

// microCMS のリッチエディタから来るHTMLは、ビルド時にそのままページへ書き出される。
// 万一 microCMS のアカウントやAPIキーが乗っ取られた場合や、
// 他サイトから貼り付けたHTMLに想定外のタグが混ざっていた場合でも、
// <script>・イベント属性（onerror 等）・javascript: のリンクなどが
// 公開ページに載らないよう、使ってよいタグと属性だけを残す（許可リスト方式）。

// 埋め込みは「ドメイン」だけでなく「パス」まで絞る。
// www.google.com 全体を許すと /url?q= などの転送を経由して別サイトを枠に出せるため、
// 動画は /embed/、地図は /maps/embed だけを通す（scripts/postbuild-csp.mjs の frame-src と揃える）
const EMBED_PATHS = {
  "www.youtube.com": /^\/embed\//,
  "www.youtube-nocookie.com": /^\/embed\//,
  "www.google.com": /^\/maps\/embed/,
};
function isAllowedEmbed(src) {
  try {
    const u = new URL(src);
    return u.protocol === "https:" && !!EMBED_PATHS[u.hostname]?.test(u.pathname);
  } catch {
    return false;
  }
}

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
  // 許可していない埋め込み（src が消えた空の枠・許可外のパス）は枠ごと取り除く
  exclusiveFilter: (frame) => frame.tag === "iframe" && !isAllowedEmbed(frame.attribs.src),
  transformTags: {
    a: (tagName, attribs) => {
      // 別タブで開くリンクは、開いた先から元のページを操作されないようにする
      if (attribs.target === "_blank") attribs.rel = "noopener noreferrer";
      return { tagName, attribs };
    },
    // 埋め込みの中身が親ページを操作できないよう sandbox をかける
    // （上位ページの遷移・フォーム送信は不可。「YouTubeで見る」「大きな地図で見る」の
    //   別タブは開けるよう、ポップアップだけは許可する）
    iframe: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        sandbox:
          "allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox",
        referrerpolicy: "strict-origin-when-cross-origin",
        loading: "lazy",
      },
    }),
    img: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, loading: "lazy", decoding: "async" },
    }),
  },
};
// transformTags で足した属性も残す
SANITIZE_OPTIONS.allowedAttributes.img.push("loading", "decoding");
SANITIZE_OPTIONS.allowedAttributes.iframe.push("sandbox", "referrerpolicy", "loading");

export function sanitizeNewsHtml(html) {
  return sanitizeHtml(html || "", SANITIZE_OPTIONS);
}
