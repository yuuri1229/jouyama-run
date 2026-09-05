import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Analytics from "../components/Analytics";
import { asset, siteUrl, SITE } from "../lib/site";
import { EVENT, LABEL, toIso, toIsoDate } from "../lib/event";
import { FONT_HREFS, HERO_LCP_IMAGE } from "../lib/assets";

const title = "新潟・城山運動公園24＆12時間走";
const description =
  `${LABEL.eventDateRange}開催。${EVENT.venue.locality}・${EVENT.venue.name}、1周約${EVENT.lapMeters}mの周回コースで行われる24時間走・12時間走の公式サイト。決められた時間のなかで走った距離を競う大会で、ウォーカーの参加も歓迎しています。`;
// タイトル末尾の「2026.11.22-23」。開催日から組み立てる
const dateSuffix = `${toIsoDate(EVENT.startAt).replaceAll("-", ".")}-${toIsoDate(
  EVENT.endAt
).slice(8)}`;
const ogImageUrl = `${siteUrl}${asset("/img/og-image.jpg")}`;

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${title}｜${dateSuffix}`,
    template: `%s｜${title}`,
  },
  description,
  keywords: [
    "24時間走",
    "12時間走",
    "時間走",
    "新潟",
    "城山運動公園",
    "ウルトラマラソン",
    "タイムレース",
  ],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    siteName: title,
    title: `${title}｜${dateSuffix}`,
    description,
    url: siteUrl,
    locale: "ja_JP",
    type: "website",
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: title,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${title}｜${dateSuffix}`,
    description,
    images: [ogImageUrl],
  },
  icons: {
    icon: [
      { url: asset("/favicon.ico"), sizes: "any" },
      { url: asset("/icon-192.png"), sizes: "192x192", type: "image/png" },
      { url: asset("/icon-512.png"), sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: asset("/apple-touch-icon.png") }],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: "#167a1e",
};

// 大会情報の構造化データ（Event）。Google検索でイベント情報として
// 認識されやすくするためのJSON-LD。
const eventJsonLd = {
  "@context": "https://schema.org",
  "@type": "SportsEvent",
  name: title,
  description,
  startDate: toIso(EVENT.startAt),
  endDate: toIso(EVENT.endAt),
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  eventStatus: "https://schema.org/EventScheduled",
  sport: "Ultramarathon",
  image: [ogImageUrl],
  url: siteUrl,
  location: {
    "@type": "Place",
    name: EVENT.venue.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: EVENT.venue.street,
      addressLocality: EVENT.venue.locality,
      addressRegion: EVENT.venue.region,
      postalCode: EVENT.venue.postalCode,
      addressCountry: "JP",
    },
  },
  organizer: {
    "@type": "Organization",
    name: EVENT.organizer.name,
    url: siteUrl,
  },
  // Googleのイベント リッチリザルトは price / priceCurrency を要求するため、
  // 種目ごとに Offer を分けて金額まで書き出す。
  offers: [
    { name: "24時間走", price: EVENT.race24.fee },
    { name: "12時間走", price: EVENT.race12.fee },
  ].map((o) => ({
    "@type": "Offer",
    name: o.name,
    url: SITE.entryFormUrl,
    price: String(o.price),
    priceCurrency: "JPY",
    availability: "https://schema.org/InStock",
    validFrom: toIso(EVENT.entryOpenAt),
    validThrough: toIso(EVENT.entryCloseAt),
  })),
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <head>
        {/* フォントはCSSの@importではなく<link>で読む。
            @importだとCSSを読み終えてから初めてフォントCSSの取得が
            始まり、描画開始が1往復ぶん遅れるため。 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {FONT_HREFS.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}

        {/* ファーストビューの背景写真。CSSの背景画像はCSS解析後にしか
            取得が始まらないので、先に読み始めてLCPを縮める。 */}
        <link
          rel="preload"
          as="image"
          href={asset(HERO_LCP_IMAGE)}
          fetchPriority="high"
        />

        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
        />

        {/* スクロール表示演出(.reveal)は初期状態が opacity:0 のため、
            JSが動かない環境では本文が最後まで見えない。
            その場合だけ演出を無効化して素の状態で見せる。 */}
        <noscript>
          {/* eslint-disable-next-line react/no-danger */}
          <style
            dangerouslySetInnerHTML={{
              __html: ".reveal{opacity:1!important;transform:none!important}",
            }}
          />
        </noscript>
      </head>
      <body id="top">
        <a className="skip-link" href="#main">
          本文へスキップ
        </a>
        <Header />
        {children}
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
