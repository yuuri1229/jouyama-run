import { siteUrl } from "../lib/site";

// 構造化データ（JSON-LD）を <script> に書き出す。
// JSON.stringify は「<」をそのまま出すため、記事タイトルなど
// microCMS から来る文字列に「</script>」が含まれると、そこで script が終わり
// 続きがHTMLとして解釈される（任意のスクリプトを差し込める）。
// 「<」を < に置き換えて、JSONとしての意味は変えずにこれを防ぐ。
export function JsonLd({ data }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
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
