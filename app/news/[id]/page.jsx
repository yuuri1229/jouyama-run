import Link from "next/link";
import { notFound } from "next/navigation";
import NewsBody from "../../../components/NewsBody";
import { getNewsItems } from "../../../lib/microcms";

// 静的エクスポートのため、全記事のIDを事前に列挙してページを生成する。
export const dynamicParams = false;

export async function generateStaticParams() {
  const items = await getNewsItems();
  return items.map((item) => ({ id: item.id }));
}

export async function generateMetadata({ params }) {
  const items = await getNewsItems();
  const item = items.find((n) => n.id === params.id);
  if (!item) return {};
  return {
    title: `${item.title}｜新潟・城山運動公園24＆12時間走`,
    description: `新潟・城山運動公園24＆12時間走の最新情報「${item.title}」`,
  };
}

export default async function NewsArticlePage({ params }) {
  const items = await getNewsItems();
  const item = items.find((n) => n.id === params.id);
  if (!item) notFound();

  return (
    <main className="page-main">
      <div className="container">
        <nav className="breadcrumb" aria-label="パンくずリスト">
          <Link href="/">トップ</Link>
          <span className="material-symbols-outlined" aria-hidden="true">
            chevron_right
          </span>
          <Link href="/news/">最新情報</Link>
          <span className="material-symbols-outlined" aria-hidden="true">
            chevron_right
          </span>
          <span aria-current="page">{item.title}</span>
        </nav>

        <article className="news-article">
          <header className="news-article-head">
            <time dateTime={item.date}>{item.dateLabel}</time>
            {item.tag ? <span className="news-tag">{item.tag}</span> : null}
          </header>
          <h1 className="news-article-title">{item.title}</h1>
          <NewsBody body={item.body} />
        </article>

        <div className="sec-more">
          <Link className="text-arrow" href="/news/">
            最新情報一覧へ戻る
            <span className="material-symbols-outlined" aria-hidden="true">
              arrow_back
            </span>
          </Link>
        </div>
      </div>
    </main>
  );
}
