import Link from "next/link";
import Icon from "../../components/Icon";
import EntryList from "../../components/EntryList";
import { BreadcrumbJsonLd } from "../../components/JsonLd";
import { loadEntries } from "../../lib/entries";
import { formatDate, formatTime } from "../../lib/event";
import { SITE } from "../../lib/site";

const description = "新潟・城山運動公園24＆12時間走のエントリーリスト（出走カテゴリ別の参加者一覧）。";

export const metadata = {
  title: "エントリーリスト",
  description,
  alternates: { canonical: "/entries/" },
  // 参加者の氏名が載るページなので、検索結果には出さない
  robots: { index: false, follow: true },
  openGraph: { title: "エントリーリスト｜新潟・城山運動公園24＆12時間走", description },
  twitter: { title: "エントリーリスト｜新潟・城山運動公園24＆12時間走", description },
};

export default async function EntriesPage() {
  const data = await loadEntries();

  return (
    <main className="page-main" id="main">
      <BreadcrumbJsonLd
        items={[
          { name: "トップ", path: "/" },
          { name: "エントリーリスト", path: "/entries/" },
        ]}
      />
      <div className="container">
        <nav className="breadcrumb" aria-label="パンくずリスト">
          <Link href="/" prefetch={false}>
            トップ
          </Link>
          <Icon name="chevron_right" />
          <span aria-current="page">エントリーリスト</span>
        </nav>

        <header className="sec-head">
          <p className="sec-eyebrow">
            <Icon name="groups" />
            ENTRY LIST
          </p>
          <h1 className="sec-title">エントリーリスト</h1>
        </header>

        {data ? (
          <>
            <div className="entries-intro">
              <p>
                参加費のお振込みを確認できた方から順に掲載しています。
                <span className="ph">お名前の横の</span>
                <Icon name="info" className="entries-intro-icon" />
                <span className="ph">から、フリガナ・居住地・性別を確認できます。</span>
              </p>
              <p className="entries-updated">
                <Icon name="schedule" />
                最終更新{" "}
                <time dateTime={data.updatedAt.toISOString()}>
                  {formatDate(data.updatedAt)} {formatTime(data.updatedAt)}
                </time>
              </p>
            </div>

            <nav className="entries-tabs" aria-label="出走カテゴリ">
              {data.groups.map((g) => (
                <a href={`#${g.id}`} key={g.id} className={`entries-tab entries-tab--${g.id}`}>
                  <span>{g.label}</span>
                  <b>{g.entries.length}</b>
                </a>
              ))}
            </nav>

            <EntryList groups={data.groups} />
          </>
        ) : (
          // シート連携の設定前は、これまでの外部リストへ案内する
          <div className="entries-intro">
            <p>エントリーリストは別サイト（Googleスプレッドシート）で公開しています。</p>
            <p>
              <a
                className="btn btn-line"
                href={SITE.entryListUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                エントリーリストを見る
                <Icon name="open_in_new" />
              </a>
            </p>
          </div>
        )}

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
