// =========================================================
// microCMS 連携
// ---------------------------------------------------------
// 最新情報（news）を microCMS から取得します。
//
// ・ビルド時に環境変数 MICROCMS_API_KEY が設定されていれば
//   microCMS から取得します（GitHub Actions のシークレットで設定）。
// ・未設定の場合は data/news.js のサンプルにフォールバックするので、
//   ローカルや設定前でもビルドは通ります。
//
// 想定スキーマ（API「news」／リスト形式）:
//   title : テキスト
//   date  : 日付（未設定なら publishedAt を使用）
//   tag   : テキスト or セレクト
//   body  : 繰り返しフィールド
//     - fieldId "paragraph" → text
//     - fieldId "link"      → href, text
//     - fieldId "image"     → image, alt, caption
// =========================================================

import { createClient } from "microcms-js-sdk";
import { newsItems as fallbackNews } from "../data/news";

const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN || "niigata24h";
const apiKey = process.env.MICROCMS_API_KEY;
const endpoint = process.env.MICROCMS_NEWS_ENDPOINT || "news";

const client = apiKey ? createClient({ serviceDomain, apiKey }) : null;

const toDateStr = (v) => String(v || "").slice(0, 10);
const toDateLabel = (v) => toDateStr(v).replaceAll("-", ".");

// セレクトフィールドは配列で返るため先頭を採用
function normalizeTag(tag) {
  if (Array.isArray(tag)) return tag[0] || "";
  return tag || "";
}

// 繰り返しフィールドを NewsBody が扱える形に整形
function normalizeBody(body) {
  if (!Array.isArray(body)) return [];
  return body
    .map((block) => {
      switch (block.fieldId) {
        case "paragraph":
          return { type: "p", text: block.text };
        case "link":
          return { type: "link", href: block.href, text: block.text };
        case "image":
          return {
            type: "image",
            src: block.image?.url,
            alt: block.alt,
            caption: block.caption,
          };
        default:
          return null;
      }
    })
    .filter(Boolean);
}

function normalizeItem(item) {
  const date = item.date || item.publishedAt || item.createdAt;
  return {
    id: item.id,
    date: toDateStr(date),
    dateLabel: toDateLabel(date),
    tag: normalizeTag(item.tag),
    title: item.title,
    body: normalizeBody(item.body),
  };
}

export async function getNewsItems() {
  console.log(
    "[microcms] apiKey:",
    apiKey ? `set (length ${apiKey.length})` : "NOT SET",
    "serviceDomain:", serviceDomain,
    "endpoint:", endpoint
  );

  if (!client) {
    console.log("[microcms] no client -> using fallback data/news.js");
    return fallbackNews;
  }

  try {
    const data = await client.getList({
      endpoint,
      queries: { limit: 100 },
    });
    console.log(
      "[microcms] fetched",
      data.contents.length,
      "items:",
      data.contents.map((c) => `${c.id}:${c.title}`).join(", ")
    );

    return data.contents
      .map(normalizeItem)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  } catch (err) {
    console.error("[microcms] fetch failed, falling back:", err?.message || err);
    return fallbackNews;
  }
}
