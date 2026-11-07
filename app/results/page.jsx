import Link from "next/link";
import Icon from "../../components/Icon";
import ResultsView from "../../components/ResultsView";
import { BreadcrumbJsonLd } from "../../components/JsonLd";
import { RESULTS } from "../../data/results";

const description =
  "新潟・城山運動公園24＆12時間走の過去大会リザルト（24時間走・12時間走）。";

export const metadata = {
  title: "リザルト",
  description,
  alternates: { canonical: "/results/" },
  openGraph: { title: "リザルト｜新潟・城山運動公園24＆12時間走", description },
  twitter: { title: "リザルト｜新潟・城山運動公園24＆12時間走", description },
};

export default function ResultsPage() {
  return (
    <main className="page-main" id="main">
      <BreadcrumbJsonLd
        items={[
          { name: "トップ", path: "/" },
          { name: "リザルト", path: "/results/" },
        ]}
      />
      <div className="container">
        <nav className="breadcrumb" aria-label="パンくずリスト">
          <Link href="/" prefetch={false}>
            トップ
          </Link>
          <Icon name="chevron_right" />
          <span aria-current="page">リザルト</span>
        </nav>

        <header className="sec-head">
          <p className="sec-eyebrow">
            <Icon name="sports_score" />
            RESULTS
          </p>
          <h1 className="sec-title">リザルト</h1>
        </header>

        <p className="res-lead">
          過去大会の最終結果です。大会ごと・種目ごとに切り替えて見られます。
        </p>

        <ResultsView editions={RESULTS} />

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
