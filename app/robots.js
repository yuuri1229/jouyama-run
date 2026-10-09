import { siteUrl } from "../lib/site";

// 静的書き出し（output: "export"）で1つのファイルとして出力する
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
