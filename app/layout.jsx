import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Analytics from "../components/Analytics";
import { asset, siteUrl } from "../lib/site";
import { EVENT, entryStatus, toIsoDate } from "../lib/event";
import { OG_IMAGE_URL, SITE_DESCRIPTION, SITE_TITLE } from "../lib/seo";
import { FONT_HREFS, HERO_LCP_IMAGE, HERO_WIDTHS, webpSrcSet } from "../lib/assets";

const title = SITE_TITLE;
const description = SITE_DESCRIPTION;
// タイトル末尾の「2026.11.22-23」。開催日から組み立てる
const dateSuffix = `${toIsoDate(EVENT.startAt).replaceAll("-", ".")}-${toIsoDate(
  EVENT.endAt
).slice(8)}`;
const ogImageUrl = OG_IMAGE_URL;

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

export default function RootLayout({ children }) {
  // 受付状況はビルド時に決まる（毎朝の再ビルドで切り替わる）
  const entryOpen = entryStatus().open;
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
          type="image/webp"
          href={asset(HERO_LCP_IMAGE)}
          imageSrcSet={webpSrcSet(HERO_LCP_IMAGE, HERO_WIDTHS, asset)}
          imageSizes="100vw"
          fetchPriority="high"
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
        <Header entryOpen={entryOpen} />
        {children}
        <Footer entryOpen={entryOpen} />
        <Analytics />
      </body>
    </html>
  );
}
