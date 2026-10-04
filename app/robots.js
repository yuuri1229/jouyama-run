import { siteUrl } from "../lib/site";

// output: "export"（静的書き出し）では、メタデータ用のルートにも
// force-static の明示が必要（Next.js 15 以降）。
export const dynamic = "force-static";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
