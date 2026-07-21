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
// 実際のスキーマ（API「news」／リスト形式）:
//   title    : テキスト
//   content  : リッチエディタ（HTML文字列）
//   category : コンテンツ参照 -> API「categories」の name フィールド
//   date     : フィールドなし。公開日時(publishedAt)を使用（UTC保存のためJSTに変換）
// =========================================================

import { createClient } from "microcms-js-sdk";
import { newsItems as fallbackNews } from "../data/news";

const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN || "niigata24h";
const apiKey = process.env.MICROCMS_API_KEY;
const endpoint = process.env.MICROCMS_NEWS_ENDPOINT || "news";

const client = apiKey ? createClient({ serviceDomain, apiKey }) : null;

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

// publishedAt/createdAt はUTCで返るため、JSTの日付に変換してから切り出す
function toJstDateStr(isoString) {
  if (!isoString) return "";
  const jst = new Date(new Date(isoString).getTime() + JST_OFFSET_MS);
  return jst.toISOString().slice(0, 10);
}

// コンテンツ参照フィールドは単一/複数どちらでも来られるようにしておく
function normalizeCategory(category) {
  const c = Array.isArray(category) ? category[0] : category;
  return c?.name || "";
}

function normalizeItem(item) {
  const dateStr = toJstDateStr(item.publishedAt || item.createdAt);
  return {
    id: item.id,
    date: dateStr,
    dateLabel: dateStr.replaceAll("-", "."),
    tag: normalizeCategory(item.category),
    title: item.title,
    body: item.content ? [{ type: "html", html: item.content }] : [],
  };
}

export async function getNewsItems() {
  if (!client) return fallbackNews;

  try {
    const data = await client.getList({
      endpoint,
      queries: { limit: 100 },
    });
    console.log(`[microcms] fetched ${data.contents.length} news items`);

    return data.contents
      .map(normalizeItem)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  } catch (err) {
    console.error("[microcms] fetch failed, falling back:", err?.message || err);
    return fallbackNews;
  }
}
