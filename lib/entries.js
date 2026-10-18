// =========================================================
// エントリーリスト（参加者一覧）の設定と読み込み
// ---------------------------------------------------------
// 非公開のエントリー管理シート（Googleスプレッドシート）は、
// GitHub Actions のビルド時に scripts/fetch-entries.mjs が読みに行き、
// 入金ステータスが「振込済み」の行の公開項目だけを
// data/entries.generated.json に書き出す。ページはそのファイルを読むだけ。
//
// 管理シートは改変しない決まりのため、見出しの名前ではなく列の位置で読む。
// 【シートの列の並びが変わったとき】下の ENTRY_SHEET.columns を書き換える。
// =========================================================
import { readFile } from "node:fs/promises";
import { EVENT } from "./event.js";

export const ENTRY_SHEET = {
  // この値の行だけを掲載する（前後の空白・全角半角の違いは無視）
  paidStatus: "振込済み",
  // 各項目が入っている列（A, B, C …）。
  // ゼッケンNo.はシートに無いため、下の ENTRY_CATEGORIES の bibStart から
  // エントリー順（シートの行順）に自動で振る
  columns: {
    status: "C", // 入金ステータス
    category: "D", // 出走カテゴリ（カテゴリ名＋金額。金額は使わない）
    name: "G", // 氏名
    kana: "H", // フリガナ
    gender: "I", // 性別
    // 住所。そのまま載せず、lib/residence.js で
    // 新潟県内＝市町村名／県外＝都道府県名 に変換してから使う
    address: "K",
  },
};

// 出走カテゴリ。シートの「出走カテゴリ」の値を match で振り分ける
// （「12時間走　デイスタート　5,500円」のように金額が付いていてもよい）。
// サイトに出すのは label だけで、シートの文字列（金額を含む）は出さない。
export const ENTRY_CATEGORIES = [
  {
    id: "day",
    bibStart: 201,
    label: "12時間走 デイスタート",
    en: "12H DAY",
    match: /デイ/,
    capacity: EVENT.race12.capacityEach,
  },
  {
    id: "night",
    bibStart: 301,
    label: "12時間走 ナイトスタート",
    en: "12H NIGHT",
    match: /ナイト/,
    capacity: EVENT.race12.capacityEach,
  },
  {
    id: "race24",
    bibStart: 101,
    label: "24時間走",
    en: "24H",
    match: /24時間/,
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
