import { asset } from "../lib/site";

// data/news.js の body 配列を描画するコンポーネント。
// type: "p"（段落） / "link"（外部リンク） / "image"（画像）に対応。
export default function NewsBody({ body }) {
  return (
    <div className="news-article-body">
      {body.map((block, i) => {
        if (block.type === "p") {
          return <p key={i}>{block.text}</p>;
        }
        if (block.type === "link") {
          return (
            <p key={i}>
              <a
                className="text-arrow"
                href={block.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {block.text}
                <span className="material-symbols-outlined" aria-hidden="true">
                  arrow_outward
                </span>
              </a>
            </p>
          );
        }
        if (block.type === "image") {
          return (
            <figure key={i} className="news-article-image">
              <img src={asset(block.src)} alt={block.alt || ""} loading="lazy" />
              {block.caption ? <figcaption>{block.caption}</figcaption> : null}
            </figure>
          );
        }
        return null;
      })}
    </div>
  );
}
