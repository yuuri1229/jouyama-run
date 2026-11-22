"use client";

import MIcon from "./MIcon";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// =========================================================
// 計測管制コンソール（/ops/）
// ---------------------------------------------------------
// 周回計測BLE（Android受信アプリ）→ Google Apps Script → スプレッドシート
// に集まったデータを表示し、設定・遠隔コマンド・選手の紐付けを操作する。
// 合言葉（管制用）はコードに書かず、画面で入力してもらう。
// =========================================================

// Apps Script ウェブアプリのURL（URLだけでは読み書きできない。合言葉が必要）
const ENDPOINT =
  "https://script.google.com/macros/s/AKfycbzqREVgPY7kD4nG0q0VVrzEz9cYAj55X31Oofjn9t6rUUaJ_pHzOrCepXuyNwjs4iB_/exec";
const LAP_METERS = 960;
const REFRESH_CHOICES = [2, 3, 5, 10, 15, 30];
const REFRESH_STORE = "ops-console-refresh-sec";
const KEY_STORE = "ops-console-key";
const HIDE_STORE = "ops-console-hidden-bibs";
const CATEGORIES = ["", "24時間", "12時間デイ", "12時間ナイト", "スタッフ", "予備"];
const COMMANDS = [
  { value: "setLaps", label: "周回数を設定", needBib: true, needValue: true },
  { value: "add", label: "周回 +1", needBib: true },
  { value: "del", label: "周回 −1", needBib: true },
  { value: "restartScan", label: "スキャン再起動" },
];

async function call(action, key, payload = {}) {
  // text/plain で送ると、ブラウザの事前確認（CORSプリフライト）なしで Apps Script に届く
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, consoleKey: key, ...payload }),
  });
  const j = await res.json();
  if (!j.ok) throw new Error(j.error || "エラー");
  return j;
}

// rows_() の {head, rows} を [{列名: 値}] に
// 一覧シート（タグ番号 ↔ 印字ゼッケン・氏名）を タグ番号 をキーにした辞書へ
function ichiranMap(list) {
  const out = {};
  const head = (list && list.head) || [];
  const ix = (n) => head.indexOf(n);
  const [iTag, iShort, iName, iKana, iSex, iPre] = ["タグ番号", "short_label", "label", "label_kana", "gender", "周回済み"].map(ix);
  if (iTag < 0) return out;
  ((list && list.rows) || []).forEach((r) => {
    const tag = String(r[iTag] ?? "").trim();
    if (!/^\d+$/.test(tag)) return;
    const sex = String(r[iSex] ?? "").trim();
    out[String(Number(tag))] = {
      short: String(r[iShort] ?? "").trim(), name: String(r[iName] ?? "").trim(),
      pre: /^\d+$/.test(String(r[iPre] ?? "").trim()) ? Number(String(r[iPre]).trim()) : 0,
      kana: String(r[iKana] ?? "").trim(), sex: sex === "男性" || sex === "女性" ? sex : "",
    };
  });
  return out;
}

const toObjects = (t) =>
  !t || !t.head ? [] : t.rows.map((r) => Object.fromEntries(t.head.map((h, i) => [h, r[i]])));

// "11/22 13:57:19" と サーバー時刻 "2026/11/22 13:57:22" の差（秒）
function ageSec(mmddhhmmss, serverTime) {
  if (!mmddhhmmss || !serverTime) return null;
  const year = serverTime.slice(0, 4);
  const t = Date.parse(`${year}/${mmddhhmmss}`);
  const s = Date.parse(serverTime);
  return Number.isNaN(t) || Number.isNaN(s) ? null : Math.round((s - t) / 1000);
}

// 最終通過 "15:21:13" からの経過秒（サーバー時刻基準。日付をまたぐ場合は+24h）
function sinceSec(hms, serverTime) {
  if (!hms || !serverTime || !/^\d+:\d\d:\d\d$/.test(hms)) return null;
  const now = Date.parse(serverTime);
  let t = Date.parse(`${serverTime.slice(0, 10)} ${hms}`);
  if (Number.isNaN(now) || Number.isNaN(t)) return null;
  if (t > now + 60000) t -= 86400000;
  return Math.max(0, Math.round((now - t) / 1000));
}
// "2026-11-22 15:21:13" とサーバー時刻の差（秒）
function ageSecFull(t, serverTime) {
  const a = Date.parse(String(t).replace(/-/g, "/")); const b = Date.parse(serverTime);
  return Number.isNaN(a) || Number.isNaN(b) ? null : Math.round((b - a) / 1000);
}
const mins = (sec) => (sec == null ? "-" : sec < 90 ? `${sec}秒前` : sec < 5400 ? `${Math.round(sec / 60)}分前` : `${(sec / 3600).toFixed(1)}時間前`);
// 走行状態：色だけに頼らず文言も出す
function runState(sec) {
  if (sec == null) return ["none", "未通過"];
  if (sec <= 900) return ["run", "走行中"];
  if (sec <= 3600) return ["check", "要確認"];
  return ["rest", "休憩？"];
}
const STATE_ICON = { run: "directions_run", check: "schedule", rest: "pause_circle" };
const LV_ICON = { bad: "error", warn: "warning", info: "info" };

// ラップ「43:12」がスプレッドシートで時刻（43:12:00）に変換されて届く場合があるので「43分12秒」に戻す
const lapText = (v) => {
  const m = String(v || "").match(/^(\d+):(\d\d)(?::00)?$/);
  return m ? `${Number(m[1])}分${m[2]}秒` : v || "";
};

const num = (v) => (v === "" || v == null || Number.isNaN(Number(v)) ? null : Number(v));

function Level({ value, max = 4 }) {
  const n = num(value);
  return (
    <span className="ops-bars" aria-label={`電波レベル ${n ?? "-"} / ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <i key={i} className={n != null && i < n ? "on" : ""} style={{ height: `${(i + 1) * 25}%` }} />
      ))}
    </span>
  );
}

function Spark({ values }) {
  const v = values.filter((x) => x != null);
  if (v.length < 2) return <span className="ops-muted">履歴なし</span>;
  const w = 160, h = 32;
  const pts = v.map((y, i) => `${(i / (v.length - 1)) * w},${h - (y / 100) * h}`).join(" ");
  return (
    <svg className="ops-spark" viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-label="電池残量の推移">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function Login({ onLogin, error }) {
  const [v, setV] = useState("");
  return (
    <form
      className="ops-login"
      onSubmit={(e) => {
        e.preventDefault();
        if (v.trim()) onLogin(v.trim());
      }}
    >
      <h1>計測管制コンソール</h1>
      <p>大会スタッフ専用です。管制用の合言葉を入力してください。</p>
      <input type="password" value={v} onChange={(e) => setV(e.target.value)} placeholder="合言葉" autoComplete="off" />
      <button type="submit">開く</button>
      {error && <p className="ops-error">{error}</p>}
    </form>
  );
}

export default function OpsConsole() {
  const [key, setKey] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [auto, setAuto] = useState(true);
  const [refreshSec, setRefreshSec] = useState(() => {
    try { const v = Number(localStorage.getItem(REFRESH_STORE)); return REFRESH_CHOICES.includes(v) ? v : 5; } catch { return 5; }
  });
  const inFlight = useRef(false);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [toast, setToast] = useState("");
  const [filter, setFilter] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [tab, setTab] = useState("status");
  // 非表示にした選手（タグ番号）。この端末のブラウザにだけ保存する（表示上の操作で、記録や端末の周回数は変わらない）
  const [hidden, setHidden] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(HIDE_STORE) || "[]")); } catch { return new Set(); }
  });
  const [showHidden, setShowHidden] = useState(false);
  const setHiddenSaved = (next) => {
    setHidden(next);
    try { localStorage.setItem(HIDE_STORE, JSON.stringify([...next])); } catch {}
  };
  // 「閉じる」のたびに進める番号。閉じる前に出した通信の結果は捨てる
  // （閉じた後に合言葉が sessionStorage へ書き戻されるのを防ぐ）
  const session = useRef(0);

  useEffect(() => {
    try {
      const k = sessionStorage.getItem(KEY_STORE);
      if (k) setKey(k);
    } catch {}
  }, []);

  const load = useCallback(
    async (k = key) => {
      if (!k) return;
      const gen = session.current;
      setBusy(true);
      inFlight.current = true;
      try {
        const j = await call("console", k);
        if (gen !== session.current) return;
        setData(j);
        setError("");
        setFetchedAt(new Date());
        try { sessionStorage.setItem(KEY_STORE, k); } catch {}
      } catch (e) {
        if (gen !== session.current) return;
        setError(e.message === "key mismatch" ? "合言葉が違います" : `読み込み失敗: ${e.message}`);
        if (e.message === "key mismatch") { setKey(""); setData(null); try { sessionStorage.removeItem(KEY_STORE); } catch {} }
      } finally {
        inFlight.current = false;
        if (gen === session.current) setBusy(false);
      }
    },
    [key]
  );

  useEffect(() => { if (key) load(key); }, [key, load]);
  useEffect(() => {
    if (!key || !auto) return;
    // 前回の取得が終わっていなければ重ねて取らない
    const id = setInterval(() => { if (!inFlight.current && !document.hidden) load(key); }, refreshSec * 1000);
    const onVis = () => { if (!document.hidden && !inFlight.current) load(key); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [key, auto, load, refreshSec]);

  const act = async (action, payload, msg) => {
    const gen = session.current;
    try {
      await call(action, key, payload);
      if (gen !== session.current) return false;
      setToast(msg);
      setTimeout(() => setToast(""), 4000);
      load(key);
      return true;
    } catch (e) {
      if (gen === session.current) setToast(`失敗: ${e.message}`);
      return false;
    }
  };

  const close = () => {
    session.current += 1;
    try { sessionStorage.removeItem(KEY_STORE); } catch {}
    setKey(""); setData(null); setBusy(false); setError("");
  };

  const view = useMemo(() => {
    if (!data) return null;
    const runners = toObjects(data.runners).filter((r) => String(r["ゼッケン"] ?? "").trim() !== "");
    const ich = ichiranMap(data.list);
    const nameOf = (tag, r) => (r && String(r["氏名"] || "").trim()) || (ich[String(tag)] && ich[String(tag)].name) || "";
    const shortOf = (tag) => (ich[String(tag)] && ich[String(tag)].short) || "";
    const byBib = Object.fromEntries(runners.map((r) => [String(r["ゼッケン"]), { ...r, _short: shortOf(r["ゼッケン"]), _seed: (ich[String(r["ゼッケン"])] || {}).name || "" }]));
    const current = toObjects(data.current).map((c) => {
      const r = byBib[String(c["ゼッケン"])] || {};
      const info = ich[String(c["ゼッケン"])] || {};
      const pre = info.pre || 0;
      return { ...c, pre, total: pre + (num(c["周回"]) || 0), short: info.short || "", kana: info.kana || "", sex: info.sex || "", runner: { ...r, "氏名": nameOf(c["ゼッケン"], r) } };
    });
    current.sort((a, b) => b.total - a.total || String(a["最終通過"]).localeCompare(String(b["最終通過"])));
    // 出走していない予備チップの誤検知を出さない：一覧に無いタグ・「予備」「計測器」の行は自動で除外する
    // （一覧が空のときは判定できないので除外しない）
    const hasIch = Object.keys(ich).length > 0;
    const isSpare = (tag) => hasIch && (!ich[String(tag)] || /^(予備|計測器)/.test(ich[String(tag)].name || "") || !ich[String(tag)].name);
    // 「計測しない」に設定したタグ（選手タブで設定・設定シート excludeTags に保存し、全スタッフで共通）
    const exRow = toObjects(data.config).find((c) => c["項目"] === "excludeTags");
    const excluded = new Set(String(exRow ? exRow["値"] : "").split(/[,\s、]+/).filter((x) => /^\d+$/.test(x)).map((x) => String(Number(x))));
    const isHid = (tag) => hidden.has(String(tag)) || isSpare(tag) || excluded.has(String(tag));
    current.forEach((c) => { c.spare = isSpare(c["ゼッケン"]); c.excluded = excluded.has(String(c["ゼッケン"])); });
    const hiddenRows = current.filter((c) => isHid(c["ゼッケン"]));
    const visible = current.filter((c) => !isHid(c["ゼッケン"]));
    const devices = toObjects(data.devices);
    const log = toObjects(data.deviceLog);
    const config = toObjects(data.config);
    const passes = toObjects(data.passes).reverse();
    const commands = toObjects(data.commands).reverse();
    const cfg = Object.fromEntries(config.map((c) => [c["項目"], c["値"]]));

    const alerts = [];
    if (!devices.length) alerts.push(["warn", "受信端末の状態がまだ届いていません（アプリ v1.4 以降で送信）"]);
    devices.forEach((d) => {
      const name = d["端末"];
      const age = ageSec(d["受信時刻"], data.serverTime);
      if (age != null && age > 90) alerts.push(["bad", `${name}: ${Math.round(age / 60)}分以上 連絡がありません（電源・回線・アプリを確認）`]);
      const bat = num(d["電池%"]);
      if (bat != null && bat < 30 && d["充電"] === "なし") alerts.push([bat < 15 ? "bad" : "warn", `${name}: 電池 ${bat}%・充電していません`]);
      else if (d["充電"] === "なし") alerts.push(["warn", `${name}: 充電していません（電池 ${bat ?? "-"}%）— 電源につないでください`]);
      const temp = num(d["電池温度℃"]);
      if (temp != null && temp >= 42) alerts.push(["warn", `${name}: 電池温度 ${temp}℃（日陰・風通しを確保）`]);
      if (d["Bluetooth"] === "OFF") alerts.push(["bad", `${name}: Bluetooth がオフです`]);
      if (d["電池最適化"] === "未除外") alerts.push(["warn", `${name}: 電池の最適化が有効です（画面オフ中に通信が止まる恐れ。アプリの赤いボタンから解除）`]);
      if (d["省電力"] === "ON") alerts.push(["warn", `${name}: 省電力モードがオンです（スキャン・送信が間引かれる恐れ）`]);
      if (String(d["計測状態"]).startsWith("停止")) alerts.push(["bad", `${name}: 計測が停止しています`]);
      const lp = num(d["最終受信(秒前)"]);
      if (lp != null && lp > 120) alerts.push(["warn", `${name}: ${Math.round(lp / 60)}分間 チップを受信していません`]);
      const skew = num(d["時刻ズレ(秒)"]);
      if (skew != null && Math.abs(skew) > 5) alerts.push(["warn", `${name}: 端末の時計が ${skew}秒 ずれています（自動設定を確認）`]);
      const lvl = num(d["電波レベル(0-4)"]);
      if (lvl != null && lvl <= 1 && d["回線"] === "モバイル") alerts.push(["warn", `${name}: モバイル電波が弱い（レベル${lvl}）`]);
    });
    const latest = num(cfg.latestVersionCode);
    devices.forEach((d) => {
      const v = num(d["アプリ版"]);
      if (latest && v && v < latest) alerts.push(["info", `${d["端末"]}: アプリ更新待ち（端末 ${v} → 配信 ${latest}）`]);
    });
    const names = {};
    Object.keys(ich).forEach((t) => { if (ich[t].name) names[t] = ich[t].name; });
    runners.forEach((r) => { if (String(r["氏名"] || "").trim()) names[String(r["ゼッケン"])] = r["氏名"]; });
    const shorts = Object.fromEntries(Object.keys(ich).map((t) => [t, ich[t].short]));
    // 一覧にあるのに一度も受信していないタグ（計測器・予備などタグ番号なしの行は対象外）
    const seen = new Set(toObjects(data.current).map((c) => String(c["ゼッケン"])));
    const unseen = Object.keys(ich).filter((t) => !seen.has(t) && !excluded.has(t) && ich[t].name && !/^(計測器|予備)/.test(ich[t].name));
    if (unseen.length) {
      const sh = unseen.slice(0, 8).map((t) => `${ich[t].short || "-"} ${ich[t].name}(タグ${t})`).join("、");
      alerts.push(["info", `一覧に登録済みで未受信のタグ: ${unseen.length}件 — ${sh}${unseen.length > 8 ? " ほか" : ""}`]);
    }
    const order = { bad: 0, warn: 1, info: 2 };
    alerts.sort((a, b) => order[a[0]] - order[b[0]]);
    const worst = alerts.some((a) => a[0] === "bad") ? "bad" : alerts.some((a) => a[0] === "warn") ? "warn" : "ok";
    const running = visible.filter((c) => { const x = sinceSec(c["最終通過"], data.serverTime); return x != null && x <= 900; }).length;
    const totalLaps = visible.reduce((a, c) => a + c.total, 0);
    const maxTotal = Math.max(1, ...visible.map((c) => c.total));
    const recentOk = passes.filter((x) => x.status === "OK" && !isHid(x.bib)).slice(0, 8);
    const pass5 = passes.filter((x) => x.status === "OK" && !isHid(x.bib) && (ageSecFull(x.time, data.serverTime) ?? 1e9) <= 300).length;
    return { runners: Object.values(byBib), current: visible, allCurrent: current, hiddenRows, devices, log, config, passes, commands, cfg, alerts, names, shorts, ich, excluded, worst, running, totalLaps, maxTotal, recentOk, pass5 };
  }, [data, hidden]);

  if (!key) return <Login onLogin={(k) => setKey(k)} error={error} />;
  if (!view) return <p className="ops-loading">{error || "読み込み中…"}</p>;

  const q = filter.trim();
  const list0 = showHidden ? view.hiddenRows : view.current;
  const base = q
    ? list0.filter((c) => String(c["ゼッケン"]).includes(q) || String(c.short || "").includes(q) || String(c.runner["氏名"] || "").includes(q))
    : list0;
  // 最近の通過順（既定）：いま走っている選手が上に来る
  const shown = sortBy === "recent"
    ? [...base].sort((a, b) => String(b["最終通過"]).localeCompare(String(a["最終通過"])))
    : sortBy === "bib"
      ? [...base].sort((a, b) => num(a.short) - num(b.short) || num(a["ゼッケン"]) - num(b["ゼッケン"]))
      : base;

  return (
    <div className="ops">
      <header className={`ops-hud ops-hud-${view.worst}`}>
        <div className="ops-hud-row">
          <div className="ops-pill" role="status">
            <b><MIcon name={view.worst === "bad" ? "error" : view.worst === "warn" ? "warning" : "check_circle"} />{view.worst === "bad" ? " 要対応" : view.worst === "warn" ? " 注意" : " 正常"}</b>
            <span>{view.alerts.filter((a) => a[0] !== "info").length ? `アラート ${view.alerts.filter((a) => a[0] !== "info").length}件` : "異常なし"}</span>
          </div>
          <h1>計測管制コンソール</h1>
          <div className="ops-top-meta">
            <span>更新 {fetchedAt ? fetchedAt.toLocaleTimeString("ja-JP") : "-"}</span>
            <label><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> 自動更新</label>
            <select value={refreshSec} aria-label="更新間隔" onChange={(e) => { const v = Number(e.target.value); setRefreshSec(v); try { localStorage.setItem(REFRESH_STORE, String(v)); } catch {} }}>
              {REFRESH_CHOICES.map((n) => <option key={n} value={n}>{n}秒ごと</option>)}
            </select>
            <button onClick={() => load()} disabled={busy}>{busy ? "更新中…" : "更新"}</button>
            <button className="ops-ghost" onClick={close}>閉じる</button>
          </div>
        </div>
        <div className="ops-kpis">
          <div className="ops-kpi"><b>{view.running}<small>/{view.current.length}人</small></b><span>走行中（15分以内に通過）</span></div>
          <div className="ops-kpi"><b>{view.pass5}<small>件</small></b><span>直近5分の通過</span></div>
          <div className="ops-kpi"><b>{view.totalLaps}<small>周</small></b><span>全員の合計周回</span></div>
          <div className="ops-kpi"><b>{(view.totalLaps * LAP_METERS / 1000).toFixed(0)}<small>km</small></b><span>全員の合計距離</span></div>
          {view.devices.map((d) => {
            const age = ageSec(d["受信時刻"], data.serverTime);
            const bat = num(d["電池%"]);
            const bad = (age != null && age > 90) || (bat != null && bat < 15);
            return (
              <div key={d["端末"]} className={`ops-kpi ${bad ? "ops-kpi-bad" : ""}`}>
                <b><MIcon name="battery_full" />{bat ?? "-"}<small>%</small>{d["充電"] === "あり" && <MIcon name="bolt" />}</b>
                <span>{d["端末"]}・{mins(age)}</span>
              </div>
            );
          })}
        </div>
      </header>
      {toast && <p className="ops-toast" role="status">{toast}</p>}
      {error && <p className="ops-error">{error}</p>}
      {view.cfg.message && <p className="ops-banner">端末に表示中のお知らせ：{view.cfg.message}</p>}

      <nav className="ops-tabs" role="tablist" aria-label="表示切替">
        {[["status", "状況"], ["laps", "周回"], ["passes", "通過記録"], ["ops", "操作・設定"], ["runners", "選手"], ["export", "CSV"]].map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>
            {label}
            {id === "status" && view.alerts.filter((a) => a[0] !== "info").length > 0 && <i className={`ops-badge ops-badge-${view.worst}`}>{view.alerts.filter((a) => a[0] !== "info").length}</i>}
          </button>
        ))}
      </nav>

      {tab === "status" && (<>
      <section className="ops-sec">
        <h2>アラート</h2>
        {view.alerts.length ? (
          <ul className="ops-alerts">{view.alerts.map(([lv, t], i) => <li key={i} className={`ops-${lv}`}><MIcon name={LV_ICON[lv]} /> {t}</li>)}</ul>
        ) : <p className="ops-allok"><MIcon name="check_circle" /> 異常はありません</p>}
      </section>

      <section className="ops-sec">
        <h2>いま通過した選手 <small>直近の周回カウント（新しい順）</small></h2>
        {view.recentOk.length ? (
          <ol className="ops-feed">
            {view.recentOk.map((x, i) => (
              <li key={i}>
                <time>{String(x.time).slice(11, 19)}</time>
                <b className="ops-bibchip">{view.shorts[String(x.bib)] || `タグ${x.bib}`}</b>
                <span className="ops-feed-name">{view.names[String(x.bib)] || "未登録"}</span>
                <span className="ops-feed-lap">合計{(num(x.lap) || 0) + ((view.ich[String(x.bib)] || {}).pre || 0)}周</span>
              </li>
            ))}
          </ol>
        ) : <p className="ops-muted">まだありません</p>}
      </section>

      <section className="ops-sec">
        <h2>受信端末</h2>
        <div className="ops-devices">
          {view.devices.map((d) => {
            const age = ageSec(d["受信時刻"], data.serverTime);
            const bat = num(d["電池%"]);
            const hist = view.log.filter((l) => l["端末"] === d["端末"]).map((l) => num(l["電池%"]));
            return (
              <article key={d["端末"]} className="ops-card">
                <h3>{d["端末"]} <small>アプリ {d["アプリ版"]}</small></h3>
                <p className={`ops-age ${age != null && age > 90 ? "ops-bad" : ""}`}>最終連絡 {d["受信時刻"]}（{mins(age)}）</p>
                <div className="ops-tiles">
                  <div className={`ops-tile ${bat != null && bat < 30 ? "ops-tile-bad" : ""}`}>
                    <b>{bat ?? "-"}%</b>
                    <span className="ops-gauge"><span style={{ width: `${bat ?? 0}%` }} className={bat != null && bat < 30 ? "low" : ""} /></span>
                    <span>{d["充電"] === "あり" ? <><MIcon name="bolt" />充電中</> : "充電なし"}・{d["電池温度℃"]}℃</span>
                  </div>
                  <div className="ops-tile"><b><Level value={d["電波レベル(0-4)"]} /></b><span>{d["回線"]} {d["電波dBm"] ? `${d["電波dBm"]}dBm` : ""}</span></div>
                  <div className={`ops-tile ${d["Bluetooth"] === "OFF" || String(d["計測状態"]).startsWith("停止") ? "ops-tile-bad" : ""}`}><b>{d["Bluetooth"]}</b><span>{d["計測状態"]}</span></div>
                  <div className="ops-tile"><b>{d["受信/分"] || "-"}</b><span>パケット/分・最終 {d["最終受信(秒前)"] || "-"}秒前</span></div>
                </div>
                <details className="ops-more">
                  <summary>詳細を見る</summary>
                  <dl>
                    <dt>電池の推移</dt><dd><Spark values={hist} /></dd>
                    <dt>画面</dt><dd>{d["画面"] || "-"}・{d["Doze"] || "-"}・電池最適化 {d["電池最適化"] || "-"}・省電力 {d["省電力"] || "-"}</dd>
                    <dt>時刻ズレ</dt><dd>{d["時刻ズレ(秒)"] || 0}秒</dd>
                    <dt>空き容量</dt><dd>{d["空き容量MB"]}MB・未送信 {d["未送信KB"] || 0}KB</dd>
                    <dt>稼働</dt><dd>{d["稼働(分)"]}分</dd>
                  </dl>
                </details>
              </article>
            );
          })}
          {!view.devices.length && <p className="ops-muted">まだ届いていません</p>}
        </div>
      </section>
      </>)}

      {tab === "laps" && (
      <LapPanel
        view={view}
        shown={shown}
        serverTime={data.serverTime}
        filter={filter}
        setFilter={setFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        onSetLaps={(list, msg) => act("addCommands", { list }, msg)}
        hidden={hidden}
        showHidden={showHidden}
        setShowHidden={setShowHidden}
        onHide={(bibs, hide) => {
          const n = new Set(hidden);
          bibs.forEach((b) => (hide ? n.add(String(b)) : n.delete(String(b))));
          setHiddenSaved(n);
          if (!hide && n.size === 0) setShowHidden(false);
        }}
      />)}

      {tab === "ops" && (<>
      <CommandPanel devices={view.devices} commands={view.commands} names={view.names} onSend={(p) => act("addCommand", p, "コマンドを登録しました（次の送信で端末が実行）")} />
      <ConfigPanel config={view.config}
        onSave={(name, value) => act("setConfig", { name, value }, `${name} を ${value} に変更しました（次の送信で端末に反映）`)}
        onSaveAll={(list) => act("setConfigs", { list }, `${list.length}件の設定を変更しました（次の送信で端末に反映）`)} />
      </>)}

      {tab === "runners" && (
      <RunnerPanel runners={view.runners} excluded={view.excluded} onMeasure={(bib, measure) => {
          const n = new Set(view.excluded);
          measure ? n.delete(String(bib)) : n.add(String(bib));
          act("setConfig", { name: "excludeTags", value: [...n].sort((a, b) => a - b).join(",") }, `タグ${bib} を${measure ? "計測する" : "計測しない"}に設定しました`);
        }} onSave={(p) => act("setRunner", p, `ゼッケン${p.bib} を保存しました`)}
        onSaveAll={(list) => act("setRunners", { list }, `${list.length}人の選手情報をまとめて保存しました`)} />)}

      {tab === "passes" && (
      <PassPanel
        view={view}
        onDelete={(items, adjustLaps) =>
          act("deletePasses", { items, adjustLaps }, `${items.length}件を削除しました${adjustLaps ? "（周回だった記録の分は端末の周回数からも差し引きます）" : ""}`)
        }
      />)}

      {tab === "export" && <ExportPanel view={view} exportAll={() => call("export", key)} />}
    </div>
  );
}

// ---------- CSV ----------
function csvCell(v) {
  const t = v == null ? "" : String(v);
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}
function downloadCsv(name, head, rows) {
  // Excel で文字化けしないよう BOM 付き UTF-8
  const text = "\ufeff" + [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const stamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
};

function ExportPanel({ view, exportAll }) {
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const lapsCsv = () =>
    downloadCsv(`周回状況_${stamp()}.csv`, ["タグ番号", "ゼッケン", "氏名", "種目", "事前周回", "計測周回", "合計周回", "距離km", "最終通過", "ラップ", "RSSI", "最終受信"],
      [...view.allCurrent]
        .sort((a, b) => num(a["ゼッケン"]) - num(b["ゼッケン"]))
        .map((c) => [c["ゼッケン"], c.short, c.runner["氏名"] || "", c.runner["種目"] || "", c.pre, c["周回"], c.total,
          (c.total * LAP_METERS / 1000).toFixed(2), c["最終通過"], lapText(c["ラップ"]), c["RSSI"], c["最終受信"]]));
  const allCsv = async (kind) => {
    setBusy(kind); setErr("");
    try {
      const j = await exportAll();
      if (kind === "passes") {
        const ich = ichiranMap(j.list);
        const names = {};
        Object.keys(ich).forEach((t) => { if (ich[t].name) names[t] = ich[t].name; });
        j.runners.rows.forEach((r) => { if (String(r[1] || "").trim()) names[String(r[0])] = r[1]; });
        const ib = j.passes.head.indexOf("bib");
        downloadCsv(`通過記録_${stamp()}.csv`, [...j.passes.head.slice(0, ib + 1), "short_bib", "name", ...j.passes.head.slice(ib + 1)],
          j.passes.rows.map((r) => [...r.slice(0, ib + 1), (ich[String(r[ib])] || {}).short || "", names[String(r[ib])] || "", ...r.slice(ib + 1)]));
      } else {
        downloadCsv(`選手_${stamp()}.csv`, j.runners.head, j.runners.rows.filter((r) => String(r[0]).trim() !== ""));
      }
    } catch (e) {
      setErr(`書き出し失敗: ${e.message}`);
    } finally {
      setBusy("");
    }
  };
  return (
    <section className="ops-sec">
      <h2>CSV書き出し <small>Excelでそのまま開けます</small></h2>
      <div className="ops-form">
        <button onClick={lapsCsv}>周回状況</button>
        <button onClick={() => allCsv("passes")} disabled={!!busy}>{busy === "passes" ? "取得中…" : "通過記録（全件）"}</button>
        <button onClick={() => allCsv("runners")} disabled={!!busy}>{busy === "runners" ? "取得中…" : "選手・ビーコン紐付け"}</button>
        {err && <span className="ops-error">{err}</span>}
      </div>
    </section>
  );
}

// ---------- 周回状況（選択して周回数を設定） ----------
function LapPanel({ view, shown: shownAll, serverTime, filter, setFilter, sortBy, setSortBy, onSetLaps, hidden, showHidden, setShowHidden, onHide }) {
  const [sel, setSel] = useState(() => new Set());
  const [stateF, setStateF] = useState("all");
  const stOf = (c) => runState(sinceSec(c["最終通過"], serverTime))[0];
  const counts = { run: 0, check: 0, rest: 0, none: 0 };
  shownAll.forEach((c) => { counts[stOf(c)] += 1; });
  const shown = stateF === "all" ? shownAll : shownAll.filter((c) => stOf(c) === stateF);
  const [laps, setLaps] = useState("0");
  const [err, setErr] = useState("");
  const toggle = (bib) => setSel((s) => { const n = new Set(s); n.has(bib) ? n.delete(bib) : n.add(bib); return n; });
  const allShown = shown.length > 0 && shown.every((c) => sel.has(String(c["ゼッケン"])));
  const toggleAll = () => setSel((s) => {
    const n = new Set(s);
    shown.forEach((c) => (allShown ? n.delete(String(c["ゼッケン"])) : n.add(String(c["ゼッケン"]))));
    return n;
  });
  const apply = (bibs, value) => {
    if (!/^\d+$/.test(String(value))) return setErr("周回数は0以上の整数で入力してください");
    if (!bibs.length) return setErr("選手を選んでください");
    setErr("");
    const label = bibs.length > 5 ? `${bibs.length}人` : bibs.map((b) => `No.${b} ${view.names[b] || ""}`).join("、");
    if (!window.confirm(`${label} の計測周回（事前周回は別）を ${value}周 に設定しますか？\n（次の送信で端末に反映されます）`)) return;
    onSetLaps(bibs.map((b) => ({ target: "all", cmd: "setLaps", bib: Number(b), value: Number(value) })), `${bibs.length}人の周回数を ${value}周 に設定しました（次の送信で端末に反映）`);
    setSel(new Set());
  };
  return (
    <section className="ops-sec">
      <h2>{showHidden ? "非表示の選手" : "周回状況"} <small>{showHidden ? "この端末だけの表示設定です（記録・周回数は変わりません）・" : ""}{view.current.length}人・1周{LAP_METERS}m・合計＝一覧の事前周回＋計測周回</small></h2>
      <div className="ops-form">
        <input className="ops-filter" placeholder="ゼッケン・氏名で絞り込み" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="並び順">
          <option value="recent">最近の通過順</option>
          <option value="laps">周回数の多い順</option>
          <option value="bib">ゼッケン順</option>
        </select>
      </div>
      <div className="ops-chips" role="group" aria-label="状態で絞り込み">
        {[["all", null, `全員 ${shownAll.length}`], ["run", "directions_run", `走行中 ${counts.run}`], ["check", "schedule", `要確認 ${counts.check}`], ["rest", "pause_circle", `休憩？ ${counts.rest}`], ["none", null, `未通過 ${counts.none}`]].map(([id, icon, label]) => (
          <button key={id} className={`ops-chip-${id} ${stateF === id ? "on" : ""}`} onClick={() => setStateF(id)}>{icon && <MIcon name={icon} />}{label}</button>
        ))}
        {(view.hiddenRows.length > 0 || showHidden) && (
          <button className={`ops-chip-hidden ${showHidden ? "on" : ""}`} onClick={() => { setShowHidden(!showHidden); setSel(new Set()); }}>
            {showHidden ? <><MIcon name="arrow_back" />通常表示に戻る</> : <><MIcon name="visibility" />非表示 {view.hiddenRows.length}人</>}
          </button>
        )}
      </div>
      <div className="ops-form ops-bulk">
        <span>選択 {sel.size}人 → 計測周回を</span>
        <input inputMode="numeric" value={laps} onChange={(e) => { setLaps(e.target.value); setErr(""); }} style={{ width: "5em" }} aria-label="設定する周回数" />
        <span>周に</span>
        <button onClick={() => apply([...sel], laps)} disabled={!sel.size}>設定</button>
        {showHidden
          ? <button onClick={() => { onHide([...sel], false); setSel(new Set()); }} disabled={!sel.size}>選択を再表示</button>
          : <button className="ops-ghost" onClick={() => { onHide([...sel], true); setSel(new Set()); }} disabled={!sel.size}>選択を非表示</button>}
        {!showHidden && <button className="ops-ghost" onClick={() => apply(view.current.map((c) => String(c["ゼッケン"])), 0)}>全員を0周にリセット（非表示を除く）</button>}
        {err && <span className="ops-error">{err}</span>}
      </div>
      <div className="ops-scroll">
        <table className="ops-table">
          <thead><tr><th><input type="checkbox" checked={allShown} onChange={toggleAll} aria-label="表示中の選手をすべて選択" /></th><th>ゼッケン</th><th>氏名</th><th>状態</th><th>合計周回</th><th>距離</th><th>最終通過</th><th>ラップ</th><th>事前+計測</th><th className="ops-dim">タグ</th><th className="ops-dim">種目</th><th className="ops-dim">RSSI</th></tr></thead>
          <tbody>
            {shown.map((c, i) => {
              const bib = String(c["ゼッケン"]);
              const since = sinceSec(c["最終通過"], serverTime);
              const st = runState(since);
              return (
                <tr key={bib} className={sel.has(bib) ? "ops-selected" : ""}>
                  <td><input type="checkbox" checked={sel.has(bib)} onChange={() => toggle(bib)} aria-label={`No.${bib} を選択`} /></td>
                  <td><b className="ops-bibchip">{c.short || `タグ${bib}`}</b></td>
                  <td title={[c.kana, c.sex].filter(Boolean).join(" / ")}>{c.runner["氏名"] || <span className="ops-muted">{c.excluded ? "計測対象外（選手タブで設定）" : c.spare ? "予備・未登録チップ（自動除外）" : "未登録"}</span>}</td>
                  <td><span className={`ops-state ops-state-${st[0]}`}>{STATE_ICON[st[0]] && <MIcon name={STATE_ICON[st[0]]} />}{st[1]}</span></td>
                  <td className="ops-totalcell">
                    <b className="ops-big">{c.total}</b>
                    <span className="ops-bar" aria-hidden="true"><i style={{ width: `${(c.total / view.maxTotal) * 100}%` }} /></span>
                  </td>
                  <td className="ops-num">{(c.total * LAP_METERS / 1000).toFixed(1)}km</td>
                  <td>{c["最終通過"]} <small className="ops-muted">{mins(since)}</small></td>
                  <td>{lapText(c["ラップ"])}</td>
                  <td className="ops-num ops-muted">{c.pre}+{c["周回"]}</td>
                  <td className="ops-num ops-dim">{bib}</td>
                  <td className="ops-dim">{c.runner["種目"]}</td>
                  <td className="ops-num ops-dim">{c["RSSI"] === "127" ? "-" : c["RSSI"]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------- 通過記録（選択して削除） ----------
function PassPanel({ view, onDelete }) {
  const [sel, setSel] = useState(() => new Set());
  const [adjust, setAdjust] = useState(true);
  const [onlyBib, setOnlyBib] = useState("");
  const keyOf = (p) => `${p.device}|${p.offset}`;
  const rows = onlyBib.trim() ? view.passes.filter((p) => String(p.bib) === onlyBib.trim()) : view.passes;
  const allShown = rows.length > 0 && rows.every((p) => sel.has(keyOf(p)));
  const toggle = (k) => setSel((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const toggleAll = () => setSel((s) => { const n = new Set(s); rows.forEach((p) => (allShown ? n.delete(keyOf(p)) : n.add(keyOf(p)))); return n; });
  const del = () => {
    const items = view.passes.filter((p) => sel.has(keyOf(p))).map((p) => ({ device: p.device, offset: p.offset }));
    if (!items.length) return;
    const okCount = view.passes.filter((p) => sel.has(keyOf(p)) && (p.status === "OK" || p.status === "MANUAL_ADD")).length;
    if (!window.confirm(`選択した ${items.length}件の通過記録を削除しますか？` +
      (adjust && okCount ? `\nうち周回 ${okCount}件の分、選手の周回数を減らします。` : "") +
      "\n（削除した記録は「削除済み」シートに控えが残ります）")) return;
    onDelete(items, adjust);
    setSel(new Set());
  };
  return (
    <section className="ops-sec">
      <h2>最近の通過記録 <small>新しい順・最大100件</small></h2>
      <div className="ops-form ops-bulk">
        <input inputMode="numeric" placeholder="No.で絞り込み" value={onlyBib} onChange={(e) => setOnlyBib(e.target.value)} style={{ width: "8em" }} />
        <span>選択 {sel.size}件</span>
        <label><input type="checkbox" checked={adjust} onChange={(e) => setAdjust(e.target.checked)} /> 周回数からも差し引く</label>
        <button onClick={del} disabled={!sel.size}>選択した記録を削除</button>
      </div>
      <div className="ops-scroll">
        <table className="ops-table">
          <thead><tr><th><input type="checkbox" checked={allShown} onChange={toggleAll} aria-label="表示中の記録をすべて選択" /></th><th>時刻</th><th>タグ</th><th>ゼッケン</th><th>氏名</th><th>周回</th><th>判定</th><th>最大RSSI</th><th>受信数</th><th>ラップ(秒)</th><th>端末</th></tr></thead>
          <tbody>
            {rows.map((p) => {
              const k = keyOf(p);
              return (
                <tr key={k} className={`ops-st-${p.status} ${sel.has(k) ? "ops-selected" : ""}`}>
                  <td><input type="checkbox" checked={sel.has(k)} onChange={() => toggle(k)} aria-label={`${String(p.time).slice(11, 19)} No.${p.bib} を選択`} /></td>
                  <td>{String(p.time).slice(11, 19)}</td>
                  <td className="ops-num">{p.bib}</td>
                  <td className="ops-num ops-strong">{view.shorts[String(p.bib)] || ""}</td>
                  <td>{view.names[String(p.bib)] || ""}</td>
                  <td className="ops-num">{p.lap}</td>
                  <td>{STATUS[p.status] || p.status}</td>
                  <td className="ops-num">{p.peak_rssi}</td>
                  <td className="ops-num">{p.packets}</td>
                  <td className="ops-num">{p.lap_time_sec}</td>
                  <td>{p.device}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const STATUS = {
  OK: "周回",
  FIRST: "起点",
  DUP: "二重(無視)",
  STAY: "滞在(無視)",
  MANUAL_ADD: "手動+1",
  MANUAL_DEL: "手動−1",
  MANUAL_SET: "手動設定",
};

function CommandPanel({ devices, commands, names, onSend }) {
  const [cmd, setCmd] = useState("setLaps");
  const [bib, setBib] = useState("");
  const [value, setValue] = useState("");
  const [target, setTarget] = useState("all");
  const [err, setErr] = useState("");
  const def = COMMANDS.find((c) => c.value === cmd);
  return (
    <section className="ops-sec">
      <h2>遠隔コマンド</h2>
      <form
        className="ops-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (def.needBib && !/^\d+$/.test(bib)) return setErr("ゼッケン番号を数字で入力してください");
          if (def.needValue && !/^\d+$/.test(value)) return setErr("周回数を数字で入力してください");
          setErr("");
          const label = `${def.label}${def.needBib ? `（No.${bib}${def.needValue ? ` → ${value}周` : ""}）` : ""}`;
          if (!window.confirm(`${label} を実行しますか？`)) return;
          onSend({ cmd, bib: def.needBib ? Number(bib) : "", value: def.needValue ? Number(value) : "", target });
          setBib(""); setValue("");
        }}
      >
        <select value={cmd} onChange={(e) => setCmd(e.target.value)}>{COMMANDS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
        {def.needBib && <input inputMode="numeric" placeholder="ゼッケン" value={bib} onChange={(e) => { setBib(e.target.value); setErr(""); }} />}
        {def.needValue && <input inputMode="numeric" placeholder="周回数" value={value} onChange={(e) => { setValue(e.target.value); setErr(""); }} />}
        <select value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="all">全端末</option>
          {devices.map((d) => <option key={d["端末"]} value={d["端末"]}>{d["端末"]}</option>)}
        </select>
        <button type="submit">登録</button>
        {err && <span className="ops-error">{err}</span>}
      </form>
      <div className="ops-scroll">
        <table className="ops-table">
          <thead><tr><th>作成</th><th>対象</th><th>コマンド</th><th>No.</th><th>値</th><th>状態</th><th>実行</th></tr></thead>
          <tbody>
            {commands.map((c) => (
              <tr key={c.ID}>
                <td>{c["作成"]}</td><td>{c["対象端末"]}</td>
                <td>{(COMMANDS.find((x) => x.value === c["コマンド"]) || {}).label || c["コマンド"]}</td>
                <td>{c["ゼッケン"]} {names[String(c["ゼッケン"])] || ""}</td><td>{c["値"]}</td>
                <td className={c["状態"] === "pending" ? "ops-warn" : c["状態"] === "done" ? "ops-good" : "ops-bad"}>{c["状態"] === "pending" ? "待機中" : c["状態"] === "done" ? "完了" : c["状態"]}</td>
                <td>{c["実行"]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RunnerRow({ r, d, onChange, onSave, excluded, onMeasure }) {
  const dirty = d.name !== (r["氏名"] || "") || d.category !== (r["種目"] || "") || d.note !== (r["備考"] || "");
  return (
    <tr className={`${excluded ? "ops-excluded" : ""} ${dirty ? "ops-dirty" : ""}`}>
      <td className="ops-num">{r["ゼッケン"]}</td>
      <td className="ops-num ops-strong">{r._short}</td>
      <td>
        <label className="ops-measure">
          <input type="checkbox" checked={!excluded} onChange={(e) => onMeasure(r["ゼッケン"], e.target.checked)} aria-label={`タグ${r["ゼッケン"]}を計測する`} />
          <span>{excluded ? "計測しない" : "計測する"}</span>
        </label>
      </td>
      <td><input value={d.name} onChange={(e) => onChange({ name: e.target.value })} placeholder={r._seed || "氏名"} /></td>
      <td><select value={d.category} onChange={(e) => onChange({ category: e.target.value })}>{CATEGORIES.map((c) => <option key={c} value={c}>{c || "—"}</option>)}</select></td>
      <td className="ops-mono">{r["MAC"]}</td>
      <td>{r["初回検出"]}</td>
      <td><input value={d.note} onChange={(e) => onChange({ note: e.target.value })} placeholder="備考" /></td>
      <td><button disabled={!dirty} onClick={() => onSave({ bib: r["ゼッケン"], name: d.name, category: d.category, note: d.note })}>保存</button></td>
    </tr>
  );
}
function RunnerPanel({ runners, excluded, onMeasure, onSave, onSaveAll }) {
  const [bib, setBib] = useState("");
  // 編集中の内容（保存するまで画面だけ）。まとめて保存できる
  const [drafts, setDrafts] = useState({});
  const draftOf = (r) => ({ name: r["氏名"] || "", category: r["種目"] || "", note: r["備考"] || "", ...(drafts[String(r["ゼッケン"])] || {}) });
  const dirtyList = runners.filter((r) => {
    const d = draftOf(r);
    return d.name !== (r["氏名"] || "") || d.category !== (r["種目"] || "") || d.note !== (r["備考"] || "");
  });
  const [err, setErr] = useState("");
  const sorted = [...runners].sort((a, b) => num(a["ゼッケン"]) - num(b["ゼッケン"]));
  return (
    <section className="ops-sec">
      <h2>選手・ビーコンの紐付け <small>受信したチップは自動で追加（ゼッケン＝iBeacon Minor）・「計測しない」にした選手は周回状況・集計に出ません（全スタッフ共通。端末の記録自体は続きます）</small></h2>
      <div className="ops-form ops-bulk">
        <button
          disabled={!dirtyList.length}
          onClick={async () => {
            if (!window.confirm(`${dirtyList.length}人の変更をまとめて保存しますか？`)) return;
            const list = dirtyList.map((r) => { const d = draftOf(r); return { bib: r["ゼッケン"], name: d.name, category: d.category, note: d.note }; });
            if (await onSaveAll(list)) setDrafts({});
          }}
        >変更をまとめて保存（{dirtyList.length}人）</button>
        <button className="ops-ghost" disabled={!dirtyList.length} onClick={() => setDrafts({})}>変更を破棄</button>
        <span className="ops-muted">{dirtyList.length ? "黄色の行が未保存です" : "氏名・種目・備考を編集すると、ここからまとめて保存できます"}</span>
      </div>
      <div className="ops-scroll">
        <table className="ops-table">
          <thead><tr><th>タグ</th><th>ゼッケン</th><th>計測</th><th>氏名</th><th>種目</th><th>MAC</th><th>初回検出</th><th>備考</th><th></th></tr></thead>
          <tbody>{sorted.map((r) => <RunnerRow key={r["ゼッケン"]} r={r} d={draftOf(r)} onChange={(patch) => setDrafts((x) => ({ ...x, [String(r["ゼッケン"])]: { ...draftOf(r), ...patch } }))} onSave={async (p) => { if (await onSave(p)) setDrafts((x) => { const n = { ...x }; delete n[String(p.bib)]; return n; }); }} excluded={excluded.has(String(r["ゼッケン"]))} onMeasure={onMeasure} />)}</tbody>
        </table>
      </div>
      <form
        className="ops-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!/^\d+$/.test(bib)) return setErr("ゼッケン番号を数字で入力してください");
          // 登録済みの番号で送ると氏名などが空で上書きされるため、追加は未登録の番号だけ
          if (runners.some((r) => String(r["ゼッケン"]) === String(Number(bib)))) return setErr(`No.${Number(bib)} は登録済みです（上の表で編集してください）`);
          onSave({ bib: Number(bib), name: "", category: "", note: "" });
          setBib(""); setErr("");
        }}
      >
        <input inputMode="numeric" placeholder="ゼッケンを手動追加" value={bib} onChange={(e) => { setBib(e.target.value); setErr(""); }} />
        <button type="submit">追加</button>
        {err && <span className="ops-error">{err}</span>}
      </form>
    </section>
  );
}

function ConfigRow({ c, v, onChange, onSave }) {
  const readOnly = c["項目"].startsWith("latest");
  const dirty = String(v) !== String(c["値"]);
  return (
    <tr className={dirty ? "ops-dirty" : ""}>
      <td className="ops-mono">{c["項目"]}</td>
      <td>{readOnly ? c["値"] : <input value={v} onChange={(e) => onChange(e.target.value)} />}</td>
      <td className="ops-desc">{c["説明"]}</td>
      <td>{!readOnly && <button disabled={!dirty} onClick={() => { if (window.confirm(`${c["項目"]} を「${v}」に変更しますか？`)) onSave(c["項目"], v); }}>反映</button>}</td>
    </tr>
  );
}

function ConfigPanel({ config, onSave, onSaveAll }) {
  const [drafts, setDrafts] = useState({});
  const valOf = (c) => (Object.prototype.hasOwnProperty.call(drafts, c["項目"]) ? drafts[c["項目"]] : c["値"]);
  const editable = config.filter((c) => c["項目"] !== "excludeTags" && !c["項目"].startsWith("latest"));
  const dirtyList = editable.filter((c) => String(valOf(c)) !== String(c["値"]));
  const upInt = (config.find((c) => c["項目"] === "uploadIntervalSec") || {})["値"];
  return (
    <section className="ops-sec">
      <h2>遠隔設定 <small>反映すると端末の次の送信で適用（送信間隔は下のボタンで変更）</small></h2>
      <div className="ops-form">
        <b>端末への反映速度</b>
        {[[5, "5秒（高速）"], [10, "10秒"], [20, "20秒（省電力）"]].map(([n, label]) => (
          <button key={n} className={String(upInt) === String(n) ? "" : "ops-ghost"} onClick={() => onSave("uploadIntervalSec", n)}>{label}</button>
        ))}
        <span className="ops-muted">現在 {upInt || "-"}秒ごとに端末が送受信（短いほど変更が早く届くが電池を使う）</span>
      </div>
      <div className="ops-form ops-bulk">
        <button
          disabled={!dirtyList.length}
          onClick={async () => {
            const lines = dirtyList.map((c) => `${c["項目"]}: ${c["値"]} → ${valOf(c)}`).join("\n");
            if (!window.confirm(`${dirtyList.length}件の設定をまとめて反映しますか？\n\n${lines}`)) return;
            if (await onSaveAll(dirtyList.map((c) => ({ name: c["項目"], value: valOf(c) })))) setDrafts({});
          }}
        >変更をまとめて反映（{dirtyList.length}件）</button>
        <button className="ops-ghost" disabled={!dirtyList.length} onClick={() => setDrafts({})}>変更を破棄</button>
      </div>
      <div className="ops-scroll">
        <table className="ops-table">
          <thead><tr><th>項目</th><th>値</th><th>説明</th><th></th></tr></thead>
          <tbody>{config.filter((c) => c["項目"] !== "excludeTags").map((c) => <ConfigRow key={c["項目"]} c={c} v={valOf(c)} onChange={(val) => setDrafts((x) => ({ ...x, [c["項目"]]: val }))} onSave={async (n, val) => { if (await onSave(n, val)) setDrafts((x) => { const m = { ...x }; delete m[n]; return m; }); }} />)}</tbody>
        </table>
      </div>
    </section>
  );
}
