// =========================================================
// 大会情報の単一ソース（Single Source of Truth）
// ---------------------------------------------------------
// 開催日・エントリー期間・参加費・定員などは、以前は
// app/page.jsx / app/layout.jsx / components/Hero.jsx に
// バラバラの文字列として書かれていました。片方だけ直して
// もう片方が古いまま、という食い違いが実際に起きていたため、
// 「数値・日時の事実」はすべてこのファイルに集約します。
//
// 【毎年の更新はこのファイルだけでOK】
//   1. year と各日時（ISO 8601・JST）を書き換える
//   2. 参加費・定員を書き換える
// 表示用のラベル（「2026年11月22日(日)」など）は下の
// フォーマッタが日時から自動生成するので、手打ちしません。
// =========================================================

const JST = "+09:00";

// ISO文字列（JST）→ Date
const jst = (s) => new Date(`${s}${JST}`);

// 祝日は曜日から機械的に出せないため、該当日だけ「(祝)」に差し替える。
// 大会日程を動かしたときは、ここも合わせて更新してください。
const HOLIDAYS = {
  "2026-11-23": "祝", // 勤労感謝の日
};

// JSTの年月日・曜日・時分を取り出す（実行環境のタイムゾーンに依存しない）
function jstParts(date) {
  const p = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(date);
  const get = (t) => p.find((x) => x.type === t)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")) % 24,
    minute: get("minute"),
    weekday: get("weekday").replace("曜日", ""),
  };
}

// 「11月22日(日)」／「2026年11月22日(日)」。祝日は「(祝)」になる
export function formatDate(date, { withYear = false } = {}) {
  const { year, month, day, weekday } = jstParts(date);
  const head = withYear ? `${year}年` : "";
  const mark = HOLIDAYS[toIsoDate(date)] || weekday;
  return `${head}${month}月${day}日(${mark})`;
}

// 「11月22日(日)12時」（0分のときは「時」止め、それ以外は「12:30」形式）
export function formatDateTime(date, { withYear = false } = {}) {
  const { hour, minute } = jstParts(date);
  const time = minute === "00" ? `${hour}時` : `${hour}:${minute}`;
  return `${formatDate(date, { withYear })}${time}`;
}

// 「12:00」（タイムバンド等の時刻だけの表記用）
export function formatTime(date) {
  const { hour, minute } = jstParts(date);
  return `${hour}:${minute}`;
}

// 「22日 12:00」
export function formatDayTime(date) {
  const { day } = jstParts(date);
  return `${day}日 ${formatTime(date)}`;
}

// 機械可読な日付（time要素のdateTime属性・JSON-LD用）
export const toIso = (date) => date.toISOString();
export const toIsoDate = (date) => {
  const { year, month, day } = jstParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

// ---------------------------------------------------------
// ★ここから下が毎年書き換える値
// ---------------------------------------------------------
export const EVENT = {
  year: 2026,

  // エントリー受付期間
  entryOpenAt: jst("2026-06-01T00:00:00"),
  entryCloseAt: jst("2026-11-13T23:59:59"),

  // 24時間走
  race24: {
    id: "race24",
    hours: 24,
    capacity: 25,
    startAt: jst("2026-11-22T12:00:00"),
    finishAt: jst("2026-11-23T12:00:00"),
    fee: 8800,
    qualification: "過去にフルマラソン以上の距離を完走していること",
  },

  // 12時間走（デイ／ナイトの2スタート）
  race12: {
    id: "race12",
    hours: 12,
    capacityEach: 25,
    day: {
      startAt: jst("2026-11-22T12:00:00"),
      finishAt: jst("2026-11-23T00:00:00"),
    },
    night: {
      startAt: jst("2026-11-23T00:00:00"),
      finishAt: jst("2026-11-23T12:00:00"),
    },
    fee: 5500,
    qualification: "過去にハーフマラソン以上を完走していること",
  },

  lapMeters: 960,

  venue: {
    name: "城山運動公園",
    postalCode: "959-0402",
    region: "新潟県",
    locality: "新潟市西蒲区",
    street: "峰岡580番地",
  },

  organizer: {
    name: "新潟・城山運動公園24＆12時間走実行委員会",
    chair: "甲斐 愛子",
  },
};

// 大会そのものの開始／終了（＝24時間走の枠）
EVENT.startAt = EVENT.race24.startAt;
EVENT.endAt = EVENT.race24.finishAt;

// ---------------------------------------------------------
// 表示用ラベル（日時から自動生成。手打ちしないこと）
// ---------------------------------------------------------
export const LABEL = {
  // 「2026年11月22日(日)〜23日(祝)」
  eventDateRange: `${formatDate(EVENT.startAt, { withYear: true })}〜${
    jstParts(EVENT.endAt).day
  }日(${HOLIDAYS[toIsoDate(EVENT.endAt)] || jstParts(EVENT.endAt).weekday})`,
  entryPeriod: `${formatDate(EVENT.entryOpenAt, { withYear: true })}〜${formatDate(
    EVENT.entryCloseAt
  )}`,
  entryDeadline: formatDate(EVENT.entryCloseAt, { withYear: true }),
  fees: `24時間走 ${EVENT.race24.fee.toLocaleString()}円／12時間走 ${EVENT.race12.fee.toLocaleString()}円`,
  address: `${EVENT.venue.locality}${EVENT.venue.street}　${EVENT.venue.name}`,
  // ヒーローのゼッケン風チップ「2026.11.22 SUN — 11.23 MON」
  bibDate: (() => {
    // 曜日はJSTで判定する（UTC基準だと1日ずれる）
    const en = { 日: "SUN", 月: "MON", 火: "TUE", 水: "WED", 木: "THU", 金: "FRI", 土: "SAT" };
    const dow = (d) => en[jstParts(d).weekday];
    const md = (d) => toIsoDate(d).slice(5).replace("-", ".");
    return `${EVENT.year}.${md(EVENT.startAt)} ${dow(EVENT.startAt)} — ${md(
      EVENT.endAt
    )} ${dow(EVENT.endAt)}`;
  })(),
};

// ---------------------------------------------------------
// エントリー受付状態
// ---------------------------------------------------------
// 「エントリー受付中｜○月○日まで」を固定文字列で書いていると、
// 締切を過ぎてもサイトが「受付中」と言い続けてしまいます。
// ビルド時刻から状態を判定して、文言とボタンの出し分けに使います。
// （静的サイトなのでビルド時点の判定です。締切当日に自動で
//   切り替えたい場合は、GitHub Actions に日次ビルドを追加します）
export function entryStatus(now = new Date()) {
  if (now < EVENT.entryOpenAt) {
    return {
      state: "before",
      label: `エントリー受付は${formatDate(EVENT.entryOpenAt, { withYear: true })}から`,
      open: false,
    };
  }
  if (now > EVENT.entryCloseAt) {
    return {
      state: "closed",
      label: "エントリー受付は終了しました",
      open: false,
    };
  }
  return {
    state: "open",
    label: `エントリー受付中｜${LABEL.entryDeadline}まで`,
    open: true,
  };
}
