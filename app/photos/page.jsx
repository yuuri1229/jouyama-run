import Link from "next/link";
import Icon from "../../components/Icon";
import { BreadcrumbJsonLd } from "../../components/JsonLd";
import { SITE } from "../../lib/site";

// フォトページ。写真はサイトに置かず、Googleフォトの共有アルバムへ案内する。
// アルバムは lib/site.js の SITE.photoAlbums（新しい大会を先頭）。

const description =
  "新潟・城山運動公園24＆12時間走の過去大会の写真（Googleフォトの共有アルバム）。";

export const metadata = {
  title: "フォト",
  description,
  alternates: { canonical: "/photos/" },
  openGraph: { title: "フォト｜新潟・城山運動公園24＆12時間走", description },
  twitter: { title: "フォト｜新潟・城山運動公園24＆12時間走", description },
};

export default function PhotosPage() {
  return (
    <main className="page-main" id="main">
      <BreadcrumbJsonLd
        items={[
          { name: "トップ", path: "/" },
          { name: "フォト", path: "/photos/" },
        ]}
      />
      <div className="container">
        <nav className="breadcrumb" aria-label="パンくずリスト">
          <Link href="/" prefetch={false}>
            トップ
          </Link>
          <Icon name="chevron_right" />
          <span aria-current="page">フォト</span>
        </nav>

        <header className="sec-head">
          <p className="sec-eyebrow">
            <Icon name="photo_library" />
            PHOTO
          </p>
          <h1 className="sec-title">フォト</h1>
        </header>

        <p className="res-lead">
          過去大会の写真は、Googleフォトの共有アルバムでご覧いただけます。写真のダウンロードもアルバムから行えます。
        </p>

        <ul className="albums">
          {SITE.photoAlbums.map((a) => (
            <li className="album" key={a.id}>
              <div className="album-txt">
                <p className="album-ed">
                  {a.label}
                  <small>
                    {a.year}
                    {a.sub ? `・${a.sub}` : ""}
                  </small>
                </p>
                <h2 className="album-title">{a.title}</h2>
              </div>
              <div className="album-act">
                <a
                  className="btn btn-primary"
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${a.title}をGoogleフォトで見る（新しいタブで開きます）`}
                >
                  アルバムを見る
                  <Icon name="open_in_new" />
                </a>
                <span className="album-note">Googleフォトが新しいタブで開きます</span>
              </div>
            </li>
          ))}
        </ul>

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
