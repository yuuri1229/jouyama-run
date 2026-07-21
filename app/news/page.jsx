import Link from "next/link";
import Reveal from "../../components/Reveal";
import { getNewsItems, newsExcerpt } from "../../lib/microcms";

export const metadata = {
  title: "最新情報｜新潟・城山運動公園24＆12時間走",
  description: "新潟・城山運動公園24＆12時間走の最新情報一覧。",
};

export default async function NewsPage() {
  const newsItems = await getNewsItems();

  return (
    <main className="page-main">
      <div className="container">
        <nav className="breadcrumb" aria-label="パンくずリスト">
          <Link href="/">トップ</Link>
          <span className="material-symbols-outlined" aria-hidden="true">
            chevron_right
          </span>
          <span aria-current="page">最新情報</span>
        </nav>

        <header className="sec-head">
          <p className="sec-eyebrow">
            <span className="material-symbols-outlined" aria-hidden="true">
              campaign
            </span>
            NEWS
          </p>
          <h1 className="sec-title">最新情報</h1>
        </header>

        <div className="news-cards">
          {newsItems.map((item) => (
            <Reveal as="article" className="news-card" key={item.id}>
              <Link className="news-card-link" href={`/news/${item.id}/`}>
                <header className="news-card-head">
                  <time dateTime={item.date}>{item.dateLabel}</time>
                  {item.tag ? <span className="news-tag">{item.tag}</span> : null}
                </header>
                <h2 className="news-card-title">{item.title}</h2>
                <p className="news-card-excerpt">{newsExcerpt(item)}</p>
                <span className="news-card-more">
                  続きを読む
                  <span className="material-symbols-outlined" aria-hidden="true">
                    arrow_forward
                  </span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>

        <div className="sec-more">
          <Link className="text-arrow" href="/">
            トップへ戻る
            <span className="material-symbols-outlined" aria-hidden="true">
              arrow_back
            </span>
          </Link>
        </div>
      </div>
    </main>
  );
}
