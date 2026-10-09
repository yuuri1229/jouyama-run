import Link from "next/link";
import Icon from "../../components/Icon";
import Reveal from "../../components/Reveal";
import { BreadcrumbJsonLd } from "../../components/JsonLd";
import { getNewsItems, newsExcerpt } from "../../lib/microcms";

const description = "新潟・城山運動公園24＆12時間走の最新情報一覧。";

export const metadata = {
  title: "最新情報",
  description,
  alternates: { canonical: "/news/" },
  openGraph: { title: "最新情報｜新潟・城山運動公園24＆12時間走", description },
  twitter: { title: "最新情報｜新潟・城山運動公園24＆12時間走", description },
};

export default async function NewsPage() {
  const newsItems = await getNewsItems();

  return (
    <main className="page-main" id="main">
      <BreadcrumbJsonLd
        items={[
          { name: "トップ", path: "/" },
          { name: "最新情報", path: "/news/" },
        ]}
      />
      <div className="container">
        <nav className="breadcrumb" aria-label="パンくずリスト">
          <Link href="/" prefetch={false}>
            トップ
          </Link>
          <Icon name="chevron_right" />
          <span aria-current="page">最新情報</span>
        </nav>

        <header className="sec-head">
          <p className="sec-eyebrow">
            <Icon name="campaign" />
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
                  <Icon name="arrow_forward" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>

        <div className="sec-more">
          <Link className="text-arrow" href="/" prefetch={false}>
            トップへ戻る
            <Icon name="arrow_back" />
          </Link>
        </div>
      </div>
    </main>
  );
}
