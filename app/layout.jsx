import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Analytics from "../components/Analytics";
import { asset, siteUrl, SITE } from "../lib/site";

const title = "新潟・城山運動公園24＆12時間走";
const description =
  "2026年11月22日(日)〜23日(祝)開催。新潟市西蒲区・城山運動公園、1周約960mの周回コースで行われる24時間走・12時間走の公式サイト。決められた時間のなかで走った距離を競う大会で、ウォーカーの参加も歓迎しています。";
const ogImageUrl = `${siteUrl}${asset("/img/og-image.jpg")}`;

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${title}｜2026.11.22-23`,
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
    title: `${title}｜2026.11.22-23`,
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
    title: `${title}｜2026.11.22-23`,
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
};

// 大会情報の構造化データ（Event）。Google検索でイベント情報として
// 認識されやすくするためのJSON-LD。
const eventJsonLd = {
  "@context": "https://schema.org",
  "@type": "SportsEvent",
  name: title,
  description,
  startDate: "2026-11-22T12:00:00+09:00",
  endDate: "2026-11-23T12:00:00+09:00",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  eventStatus: "https://schema.org/EventScheduled",
  image: [ogImageUrl],
  url: siteUrl,
  location: {
    "@type": "Place",
    name: "城山運動公園",
    address: {
      "@type": "PostalAddress",
      addressLocality: "新潟市西蒲区",
      addressRegion: "新潟県",
      addressCountry: "JP",
    },
  },
  organizer: {
    "@type": "Organization",
    name: "新潟・城山運動公園24＆12時間走実行委員会",
  },
  offers: {
    "@type": "Offer",
    url: SITE.entryFormUrl,
    availability: "https://schema.org/InStock",
    validFrom: "2026-06-01T00:00:00+09:00",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <head>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
        />
      </head>
      <body id="top">
        <Header />
        {children}
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
