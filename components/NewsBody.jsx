import Icon from "./Icon";
import { asset } from "../lib/site";
import { sanitizeNewsHtml } from "../lib/sanitize";

// data/news.js の link ブロックは http(s) のURLだけを通す
const isWebUrl = (href) => /^https?:\/\//i.test(href || "");

// data/news.js の body 配列を描画するコンポーネント。
// type: "p"（段落） / "link"（外部リンク） / "image"（画像） / "html"（microCMSのリッチエディタ）に対応。
export default function NewsBody({ body }) {
  return (
    <div className="news-article-body">
      {body.map((block, i) => {
        if (block.type === "p") {
          return <p key={i}>{block.text}</p>;
        }
        if (block.type === "html") {
          return (
            <div
              key={i}
              dangerouslySetInnerHTML={{ __html: sanitizeNewsHtml(block.html) }}
            />
          );
        }
        if (block.type === "link" && isWebUrl(block.href)) {
          return (
            <p key={i}>
              <a
                className="text-arrow"
                href={block.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {block.text}
                <Icon name="arrow_outward" />
              </a>
            </p>
          );
        }
        if (block.type === "image") {
          return (
            <figure key={i}>
              <img src={asset(block.src)} alt={block.alt || ""} loading="lazy" decoding="async" />
              {block.caption ? <figcaption>{block.caption}</figcaption> : null}
            </figure>
          );
        }
        return null;
      })}
    </div>
  );
}
