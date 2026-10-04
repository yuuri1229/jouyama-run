import { getNewsItems } from "../lib/microcms";
import { siteUrl } from "../lib/site";

// output: "export"（静的書き出し）では、メタデータ用のルートにも
// force-static の明示が必要（Next.js 15 以降）。
export const dynamic = "force-static";

// 静的エクスポート用のsitemap.xmlを生成する。
// トップ・最新情報一覧に加え、公開中の記事詳細ページを全て含める。
export default async function sitemap() {
  const newsItems = await getNewsItems();

  const staticUrls = [
    {
      url: `${siteUrl}/`,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/news/`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  const articleUrls = newsItems.map((item) => ({
    url: `${siteUrl}/news/${item.id}/`,
    lastModified: item.date || undefined,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticUrls, ...articleUrls];
}
