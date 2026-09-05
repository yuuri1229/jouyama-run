// =========================================================
// タイムバンドの空の色
// ---------------------------------------------------------
// 種目カードの帯（昼→夜→朝）を、実際の日の入り・日の出の時刻から
// 組み立てます。以前はCSSに停止位置を手書きしていたため、
// 「完全な夜になるのが23:30」「7時過ぎてもまだ暗い」のように
// 実時刻と2〜6時間ずれていました。
//
// 時刻を渡せば色が決まる形にしてあるので、開催日を動かしても
// （下の SUN に新しい日の太陽時刻を足せば）自動で追従します。
// =========================================================

// 空の基準色。--day / --night は globals.css の同名変数と揃えること。
//
// 橙(--day #c98a1e)から紺(--night #123049)へ直接グラデーションすると、
// 中間が #6d5d33 のような濁ったオリーブになり、夕焼けに見えない。
// 実際の空は「橙 → 深い橙 → 菫 → 紺」と紫side を通るので、
// その中継色を明示的に置く。
const SKY = {
  day: "#c98a1e", //   日中
  golden: "#d9922a", // 日の出/日の入り前後の斜光
  horizon: "#c2601c", // 太陽が地平線にある瞬間
  twilight: "#6d3a5d", // 市民薄明の境目（菫色）
  night: "#123049", //  夜
  midnight: "#0a1c2e", // 真夜中前後のいちばん暗い時間
};

// 新潟市西蒲区・城山運動公園（北緯37.72度／東経138.87度）の太陽時刻。
// NOAA Solar Calculator で算出。開催日を変えるときはここも更新する。
const SUN = {
  "2026-11-22": { dawn: "06:03", sunrise: "06:32", sunset: "16:29", dusk: "16:58" },
  "2026-11-23": { dawn: "06:04", sunrise: "06:33", sunset: "16:29", dusk: "16:57" },
};

// 日の出/日の入りの前後で、斜光→日中に移り変わるまでの時間（分）
const GOLDEN = 45;
const FULL_DAY = 100;
// 薄明の外側で完全な夜になるまでの時間（分）
const FULL_NIGHT = 35;

const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

const isoDate = (d) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);

const at = (dateStr, hhmm) => new Date(`${dateStr}T${hhmm}:00+09:00`);

// その日の「空の色の節目」を時刻順に並べる
function keyframesForDate(dateStr) {
  const sun = SUN[dateStr];
  // 太陽時刻を持たない日は、昼夜のない中立な帯にならないよう夜で埋める
  if (!sun) return [{ t: at(dateStr, "00:00"), color: SKY.night }];

  const dawn = at(dateStr, sun.dawn);
  const sunrise = at(dateStr, sun.sunrise);
  const sunset = at(dateStr, sun.sunset);
  const dusk = at(dateStr, sun.dusk);
  const shift = (d, m) => new Date(d.getTime() + m * MIN);

  return [
    { t: at(dateStr, "00:00"), color: SKY.midnight },
    { t: shift(dawn, -FULL_NIGHT), color: SKY.night },
    { t: dawn, color: SKY.twilight },
    { t: sunrise, color: SKY.horizon },
    { t: shift(sunrise, GOLDEN), color: SKY.golden },
    { t: shift(sunrise, FULL_DAY), color: SKY.day },
    { t: shift(sunset, -FULL_DAY), color: SKY.day },
    { t: shift(sunset, -GOLDEN), color: SKY.golden },
    { t: sunset, color: SKY.horizon },
    { t: dusk, color: SKY.twilight },
    { t: shift(dusk, FULL_NIGHT), color: SKY.night },
  ];
}

const toRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c) =>
  "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

function mix(a, b, t) {
  const [x, y] = [toRgb(a), toRgb(b)];
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
}

// 指定時刻の空の色（節目の間は線形に混ぜる）
function colorAt(time, keys) {
  if (time <= keys[0].t) return keys[0].color;
  const last = keys[keys.length - 1];
  if (time >= last.t) return last.color;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (time >= a.t && time <= b.t) {
      return mix(a.color, b.color, (time - a.t) / (b.t - a.t));
    }
  }
  return last.color;
}

/**
 * 開始〜終了の時間帯を、実際の空の移り変わりで塗るCSSグラデーションを返す。
 * 帯の左端が開始時刻、右端が終了時刻に対応する。
 */
export function skyGradient(startAt, endAt) {
  const span = endAt - startAt;
  if (!(span > 0)) return SKY.night;

  // 端の色を求めるために、前後1日ぶん余分に節目を用意する
  const keys = [];
  for (let t = startAt.getTime() - DAY; t <= endAt.getTime() + DAY; t += DAY) {
    keys.push(...keyframesForDate(isoDate(new Date(t))));
  }
  keys.sort((a, b) => a.t - b.t);

  const stops = [];
  const push = (time, color) => {
    const pct = ((time - startAt) / span) * 100;
    stops.push(`${color} ${Math.round(pct * 10) / 10}%`);
  };

  push(startAt, colorAt(startAt, keys));
  for (const k of keys) {
    if (k.t > startAt && k.t < endAt) push(k.t, k.color);
  }
  push(endAt, colorAt(endAt, keys));

  return `linear-gradient(90deg, ${stops.join(", ")})`;
}
