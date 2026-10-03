// =========================================================
// microCMS 連携
// ---------------------------------------------------------
// 最新情報（news）を microCMS から取得します。
//
// ・ビルド時に環境変数 MICROCMS_API_KEY が設定されていれば
//   microCMS から取得します（GitHub Actions のシークレットで設定）。
// ・未設定の場合は data/news.js のサンプルにフォールバックするので、
//   ローカルや設定前でもビルドは通ります。
// ・★APIキーがあるのに取得できなかった場合は、サンプルに差し替えず【ビルドを失敗させる】。
//   以前は黙ってサンプル（1件）にフォールバックしていたため、毎朝の自動再ビルドが
//   microCMS の一時的な障害に当たると、記事が消えたサイトがそのまま公開されていた。
//   ビルドが失敗すれば、デプロイは実行されず、公開中のサイトはそのまま残る。
//
// 実際のスキーマ（API「news」／リスト形式）:
//   title    : テキスト
//   content  : リッチエディタ（HTML文字列）
//   category : コンテンツ参照 -> API「categories」の name フィールド
//   date     : フィールドなし。公開日時(publishedAt)を使用（UTC保存のためJSTに変換）
// =========================================================

import { createClient } from "microcms-js-sdk";
import { newsItems as fallbackNews } from "../data/news";
import { fetchAllContents } from "./paginate";

const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN || "niigata24h";
const apiKey = process.env.MICROCMS_API_KEY;
const endpoint = process.env.MICROCMS_NEWS_ENDPOINT || "news";

const client = apiKey ? createClient({ serviceDomain, apiKey }) : null;

const PAGE_SIZE = 100; // microCMS の1回あたりの取得上限
const MAX_ATTEMPTS = 3;
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

// 本文（body配列）から一覧用の抜粋テキストを生成する。
// HTMLタグと主要なエンティティを除去してプレーンテキスト化する。
export function newsExcerpt(item, maxLen = 90) {
  const text = (item.body || [])
    .map((block) => {
      if (block.type === "html") return block.html || "";
      if (block.type === "p") return block.text || "";
      if (block.type === "link") return block.text || "";
      return "";
    })
    .join(" ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
}

// 全件取得＋再試行は lib/paginate.js
const fetchAll = () =>
  fetchAllContents(
    ({ limit, offset }) => client.getList({ endpoint, queries: { limit, offset } }),
    {
      pageSize: PAGE_SIZE,
      maxAttempts: MAX_ATTEMPTS,
      onRetry: ({ attempt, wait, err }) =>
        console.warn(`[microcms] attempt ${attempt} failed (${err?.message}); retrying in ${wait}ms`),
    }
  );

async function load() {
  if (!client) return fallbackNews;

  try {
    const contents = await fetchAll();
    console.log(`[microcms] fetched ${contents.length} news items`);
    return contents
      .map(normalizeItem)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  } catch (err) {
    // APIキーが設定されている＝本番ビルド。サンプルで置き換えて公開してはいけない
    throw new Error(
      `[microcms] ニュースを取得できませんでした（${err?.message || err}）。` +
        "サンプルデータで公開するのを避けるため、ビルドを中止します。" +
        "microCMSの状態とAPIキー(MICROCMS_API_KEY)・サービスドメインを確認してください。"
    );
  }
}

// モジュール単位で1回だけ取得する。以前は react の cache() で包んでいたが、
// cache() は「1回のレンダリング」の中でしか効かず、トップ・一覧・記事・sitemap・
// generateStaticParams・generateMetadata のそれぞれで取得し直していた
// （失敗時のログが1ビルドで7回出ていた）。失敗した場合も同じ結果を返す。
let pending;
export function getNewsItems() {
  pending ??= load();
  return pending;
}
