import { siteUrl } from "../lib/site";

// 構造化データ（JSON-LD）を <script> として出力する。
// JSON を <script> の中に埋めるとき、値に "</script>" が含まれていると
// タグを閉じられて任意のHTMLを差し込める。記事タイトルなど microCMS 由来の
// 文字列も通るので、"<" を \u003c に置き換えて無害化する。
export function JsonLd({ data }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

// パンくずの構造化データ。検索結果に「トップ > 最新情報 > 記事名」と
// 出るようになり、下層ページがどこに属するかGoogleに伝わる。
export function BreadcrumbJsonLd({ items }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.name,
          item: `${siteUrl}${item.path}`,
        })),
      }}
    />
  );
}
