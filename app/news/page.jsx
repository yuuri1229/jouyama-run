import Link from "next/link";
import Reveal from "../../components/Reveal";
import NewsBody from "../../components/NewsBody";
import { getNewsItems } from "../../lib/microcms";

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

        {newsItems.map((item) => (
          <Reveal as="article" className="news-article" id={item.id} key={item.id}>
            <header className="news-article-head">
              <time dateTime={item.date}>{item.dateLabel}</time>
              <span className="news-tag">{item.tag}</span>
            </header>
            <h2 className="news-article-title">{item.title}</h2>
            <NewsBody body={item.body} />
          </Reveal>
        ))}

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
