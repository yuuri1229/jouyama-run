// =========================================================
// SEO・SNS共有（メタデータと構造化データ）
// ---------------------------------------------------------
// 以前は、ニュース一覧・記事ページが og:image / og:url / og:site_name / og:locale を
// 持たず、記事のリンクをLINE・X・Facebookで共有しても画像が出なかった。
// Next.js は openGraph / twitter を「丸ごと」置き換える（親 layout の値とマージしない）ため、
// ページ側で title だけ書くと親の項目が消える。下層ページは必ず pageMeta() を通す。
// =========================================================
import { asset, SITE, siteUrl } from "./site";
import { EVENT, LABEL, entryStatus, toIso } from "./event";

export const SITE_TITLE = SITE.name;

export const SITE_DESCRIPTION = `${LABEL.eventDateRange}開催。${EVENT.venue.locality}・${EVENT.venue.name}、1周約${EVENT.lapMeters}mの周回コースで行われる24時間走・12時間走の公式サイト。決められた時間のなかで走った距離を競う大会で、ウォーカーの参加も歓迎しています。`;

export const OG_IMAGE_URL = `${siteUrl}${asset("/img/og-image.jpg")}`;
const OG_IMAGE = { url: OG_IMAGE_URL, width: 1200, height: 630, alt: SITE_TITLE };

/**
 * 下層ページのメタデータ。
 * @param {object} o
 * @param {string} o.title        ページ名（末尾に「｜サイト名」を付けて og:title にする）
 * @param {string} o.description
 * @param {string} o.path         "/news/" のような、先頭と末尾にスラッシュのあるパス
 * @param {"website"|"article"} [o.type]
 * @param {object} [o.openGraph]  type が article のときの publishedTime など
 */
export function pageMeta({ title, description, path, type = "website", openGraph = {} }) {
  const full = `${title}｜${SITE_TITLE}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: full,
      description,
      url: `${siteUrl}${path}`,
      siteName: SITE_TITLE,
      locale: "ja_JP",
      type,
      images: [OG_IMAGE],
      ...openGraph,
    },
    twitter: {
      card: "summary_large_image",
      title: full,
      description,
      images: [OG_IMAGE_URL],
    },
  };
}

// 受付状況に応じた在庫表記。以前は常に InStock で、締切後も「申込可能」と伝えていた。
// 静的サイトなので判定はビルド時（毎朝の再ビルドで切り替わる）
const AVAILABILITY = {
  before: "https://schema.org/PreOrder",
  open: "https://schema.org/InStock",
  closed: "https://schema.org/SoldOut",
};

// 大会情報の構造化データ（SportsEvent）。トップページにだけ置く
// （以前は layout にあり、ニュース記事・404ページにも同じものが出ていた）。
export function eventJsonLd(now = new Date()) {
  const status = entryStatus(now);
  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: SITE_TITLE,
    description: SITE_DESCRIPTION,
    startDate: toIso(EVENT.startAt),
    endDate: toIso(EVENT.endAt),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    sport: "Ultramarathon",
    image: [OG_IMAGE_URL],
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
    organizer: { "@type": "Organization", name: EVENT.organizer.name, url: siteUrl },
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
      availability: AVAILABILITY[status.state],
      validFrom: toIso(EVENT.entryOpenAt),
      validThrough: toIso(EVENT.entryCloseAt),
    })),
  };
}
