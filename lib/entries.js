// =========================================================
// エントリーリスト（参加者一覧）の設定と読み込み
// ---------------------------------------------------------
// 非公開のエントリー管理シート（Googleスプレッドシート）は、
// GitHub Actions のビルド時に scripts/fetch-entries.mjs が読みに行き、
// 入金ステータスが「振込済み」の行の公開項目だけを
// data/entries.generated.json に書き出す。ページはそのファイルを読むだけ。
//
// 【シートの見出し（1行目）を変えたとき】
//   下の ENTRY_SHEET.columns に新しい見出し名を足してください。
//   見出しが見つからないとビルドが止まり、どの列が無いかを表示します
//   （その場合、サイトは直前の内容のまま変わりません）。
// =========================================================
import { readFile } from "node:fs/promises";
import { EVENT } from "./event.js";

export const ENTRY_SHEET = {
  // この値の行だけを掲載する（前後の空白・全角半角の違いは無視）
  paidStatus: "振込済み",
  // 列ごとに、シートの見出しとして使われていそうな名前を並べる。
  // どれか1つに一致した列を使う（空白・全角半角の違いは無視）。
  columns: {
    status: ["入金ステータス", "入金状況", "入金確認", "入金"],
    category: ["出走カテゴリ", "出走カテゴリー", "出走種目", "参加種目", "種目", "カテゴリ"],
    bib: ["ゼッケンNo.", "ゼッケンNo", "ゼッケン番号", "ゼッケン", "No."],
    name: ["参加者氏名", "氏名", "お名前", "名前"],
    kana: ["フリガナ", "ふりがな", "氏名(フリガナ)", "氏名フリガナ", "カナ"],
    residence: ["居住地", "お住まい", "在住", "都道府県", "住所(都道府県)"],
    gender: ["性別"],
  },
};

// 出走カテゴリ。シートの「出走カテゴリ」の値を match で振り分ける。
// 「24」は12時間走の時刻表記（11/23 12:00 など）にも含まれうるため、
// デイ・ナイトを先に判定し、どちらでもなければ24時間走とみなす。
export const ENTRY_CATEGORIES = [
  {
    id: "day",
    label: "12時間走 デイ",
    en: "12H DAY",
    match: /デイ|昼|day/i,
    capacity: EVENT.race12.capacityEach,
  },
  {
    id: "night",
    label: "12時間走 ナイト",
    en: "12H NIGHT",
    match: /ナイト|夜|night/i,
    capacity: EVENT.race12.capacityEach,
  },
  {
    id: "race24",
    label: "24時間走",
    en: "24H",
    match: /24/,
    capacity: EVENT.race24.capacity,
  },
];

// 画面に並べる順番（24H → 12Hデイ → 12Hナイト）
export const ENTRY_CATEGORY_ORDER = ["race24", "day", "night"];

export const ENTRIES_FILE = "data/entries.generated.json";

// ビルド時に呼ぶ。シート未連携（ファイルが無い）なら null を返し、
// ページは「準備中」の表示になる。
export async function loadEntries() {
  let raw;
  try {
    raw = await readFile(ENTRIES_FILE, "utf8");
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
  const data = JSON.parse(raw);
  const groups = ENTRY_CATEGORY_ORDER.map((id) => {
    const cat = ENTRY_CATEGORIES.find((c) => c.id === id);
    const entries = data.entries.filter((e) => e.category === id);
    return {
      id,
      label: cat.label,
      en: cat.en,
      capacity: cat.capacity,
      entries,
    };
  });
  return { updatedAt: new Date(data.updatedAt), groups };
}
