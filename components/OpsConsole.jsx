"use client";

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
const REFRESH_SEC = 15;
const KEY_STORE = "ops-console-key";
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
  const [iTag, iShort, iName, iKana, iSex] = ["タグ番号", "short_label", "label", "label_kana", "gender"].map(ix);
  if (iTag < 0) return out;
  ((list && list.rows) || []).forEach((r) => {
    const tag = String(r[iTag] ?? "").trim();
    if (!/^\d+$/.test(tag)) return;
    const sex = String(r[iSex] ?? "").trim();
    out[String(Number(tag))] = {
      short: String(r[iShort] ?? "").trim(), name: String(r[iName] ?? "").trim(),
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
  const [fetchedAt, setFetchedAt] = useState(null);
  const [toast, setToast] = useState("");
  const [filter, setFilter] = useState("");
  const [sortBy, setSortBy] = useState("recent");
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
        if (gen === session.current) setBusy(false);
      }
    },
    [key]
  );

  useEffect(() => { if (key) load(key); }, [key, load]);
  useEffect(() => {
    if (!key || !auto) return;
    const id = setInterval(() => load(key), REFRESH_SEC * 1000);
    return () => clearInterval(id);
  }, [key, auto, load]);

  const act = async (action, payload, msg) => {
    const gen = session.current;
    try {
      await call(action, key, payload);
      if (gen !== session.current) return;
      setToast(msg);
      setTimeout(() => setToast(""), 4000);
      load(key);
    } catch (e) {
      if (gen === session.current) setToast(`失敗: ${e.message}`);
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
      return { ...c, short: info.short || "", kana: info.kana || "", sex: info.sex || "", runner: { ...r, "氏名": nameOf(c["ゼッケン"], r) } };
    });
    current.sort((a, b) => num(b["周回"]) - num(a["周回"]) || String(a["最終通過"]).localeCompare(String(b["最終通過"])));
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
      else if (d["充電"] === "なし") alerts.push(["info", `${name}: 充電していません（電池 ${bat ?? "-"}%）`]);
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
    const unseen = Object.keys(ich).filter((t) => !seen.has(t) && ich[t].name && !/^(計測器|予備)/.test(ich[t].name));
    if (unseen.length) {
      const sh = unseen.slice(0, 8).map((t) => `${ich[t].short || "-"} ${ich[t].name}(タグ${t})`).join("、");
      alerts.push(["info", `一覧に登録済みで未受信のタグ: ${unseen.length}件 — ${sh}${unseen.length > 8 ? " ほか" : ""}`]);
    }
    return { runners: Object.values(byBib), current, devices, log, config, passes, commands, cfg, alerts, names, shorts, ich };
  }, [data]);

  if (!key) return <Login onLogin={(k) => setKey(k)} error={error} />;
  if (!view) return <p className="ops-loading">{error || "読み込み中…"}</p>;

  const q = filter.trim();
  const base = q
    ? view.current.filter((c) => String(c["ゼッケン"]).includes(q) || String(c.runner["氏名"] || "").includes(q))
    : view.current;
  // 最近の通過順（既定）：いま走っている選手が上に来る
  const shown = sortBy === "recent"
    ? [...base].sort((a, b) => String(b["最終通過"]).localeCompare(String(a["最終通過"])))
    : base;

  return (
    <div className="ops">
      <header className="ops-top">
        <h1>計測管制コンソール</h1>
        <div className="ops-top-meta">
          <span>サーバー時刻 {data.serverTime}</span>
          <span>取得 {fetchedAt ? fetchedAt.toLocaleTimeString("ja-JP") : "-"}</span>
          <label><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> {REFRESH_SEC}秒ごとに更新</label>
          <button onClick={() => load()} disabled={busy}>{busy ? "更新中…" : "今すぐ更新"}</button>
          <button className="ops-ghost" onClick={close}>閉じる</button>
        </div>
      </header>
      {toast && <p className="ops-toast" role="status">{toast}</p>}
      {error && <p className="ops-error">{error}</p>}
      {view.cfg.message && <p className="ops-banner">端末に表示中のお知らせ：{view.cfg.message}</p>}

      <section className="ops-sec">
        <h2>アラート</h2>
        {view.alerts.length ? (
          <ul className="ops-alerts">{view.alerts.map(([lv, t], i) => <li key={i} className={`ops-${lv}`}>{t}</li>)}</ul>
        ) : <p className="ops-ok">異常はありません</p>}
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
                <p className={`ops-age ${age != null && age > 90 ? "ops-bad" : ""}`}>最終連絡 {d["受信時刻"]}（{age ?? "-"}秒前）</p>
                <dl>
                  <dt>電池</dt>
                  <dd>
                    <span className="ops-gauge"><span style={{ width: `${bat ?? 0}%` }} className={bat != null && bat < 30 ? "low" : ""} /></span>
                    {bat ?? "-"}%・充電 {d["充電"]}・{d["電池温度℃"]}℃
                  </dd>
                  <dt>電池の推移</dt><dd><Spark values={hist} /></dd>
                  <dt>回線</dt><dd>{d["回線"]} <Level value={d["電波レベル(0-4)"]} /> {d["電波dBm"] ? `${d["電波dBm"]}dBm` : ""}</dd>
                  <dt>Bluetooth</dt><dd>{d["Bluetooth"]}</dd>
                  <dt>画面</dt><dd>{d["画面"] || "-"}・{d["Doze"] || "-"}・電池最適化 {d["電池最適化"] || "-"}・省電力 {d["省電力"] || "-"}</dd>
                  <dt>計測</dt><dd>{d["計測状態"]}</dd>
                  <dt>受信</dt><dd>{d["受信/分"] || "-"} パケット/分・最終 {d["最終受信(秒前)"] || "-"}秒前</dd>
                  <dt>時刻ズレ</dt><dd>{d["時刻ズレ(秒)"] || 0}秒</dd>
                  <dt>空き容量</dt><dd>{d["空き容量MB"]}MB・未送信 {d["未送信KB"] || 0}KB</dd>
                  <dt>稼働</dt><dd>{d["稼働(分)"]}分</dd>
                </dl>
              </article>
            );
          })}
          {!view.devices.length && <p className="ops-muted">まだ届いていません</p>}
        </div>
      </section>

      <LapPanel
        view={view}
        shown={shown}
        filter={filter}
        setFilter={setFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        onSetLaps={(list, msg) => act("addCommands", { list }, msg)}
      />

      <CommandPanel devices={view.devices} commands={view.commands} names={view.names} onSend={(p) => act("addCommand", p, "コマンドを登録しました（次の送信で端末が実行）")} />

      <RunnerPanel runners={view.runners} onSave={(p) => act("setRunner", p, `ゼッケン${p.bib} を保存しました`)} />

      <ConfigPanel config={view.config} onSave={(name, value) => act("setConfig", { name, value }, `${name} を ${value} に変更しました（次の送信で端末に反映）`)} />

      <PassPanel
        view={view}
        onDelete={(items, adjustLaps) =>
          act("deletePasses", { items, adjustLaps }, `${items.length}件を削除しました${adjustLaps ? "（周回だった記録の分は端末の周回数からも差し引きます）" : ""}`)
        }
      />

      <ExportPanel view={view} exportAll={() => call("export", key)} />
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
    downloadCsv(`周回状況_${stamp()}.csv`, ["タグ番号", "ゼッケン", "氏名", "種目", "周回", "距離km", "最終通過", "ラップ", "RSSI", "最終受信"],
      [...view.current]
        .sort((a, b) => num(a["ゼッケン"]) - num(b["ゼッケン"]))
        .map((c) => [c["ゼッケン"], c.short, c.runner["氏名"] || "", c.runner["種目"] || "", c["周回"],
          ((num(c["周回"]) || 0) * LAP_METERS / 1000).toFixed(2), c["最終通過"], lapText(c["ラップ"]), c["RSSI"], c["最終受信"]]));
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
function LapPanel({ view, shown, filter, setFilter, sortBy, setSortBy, onSetLaps }) {
  const [sel, setSel] = useState(() => new Set());
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
    if (!window.confirm(`${label} の周回数を ${value}周 に設定しますか？\n（次の送信で端末に反映されます）`)) return;
    onSetLaps(bibs.map((b) => ({ target: "all", cmd: "setLaps", bib: Number(b), value: Number(value) })), `${bibs.length}人の周回数を ${value}周 に設定しました（次の送信で端末に反映）`);
    setSel(new Set());
  };
  return (
    <section className="ops-sec">
      <h2>周回状況 <small>{view.current.length}人・1周{LAP_METERS}m</small></h2>
      <div className="ops-form">
        <input className="ops-filter" placeholder="ゼッケン・氏名で絞り込み" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="並び順">
          <option value="recent">最近の通過順</option>
          <option value="laps">周回数の多い順</option>
        </select>
      </div>
      <div className="ops-form ops-bulk">
        <span>選択 {sel.size}人 → 周回数を</span>
        <input inputMode="numeric" value={laps} onChange={(e) => { setLaps(e.target.value); setErr(""); }} style={{ width: "5em" }} aria-label="設定する周回数" />
        <span>周に</span>
        <button onClick={() => apply([...sel], laps)} disabled={!sel.size}>設定</button>
        <button className="ops-ghost" onClick={() => apply(view.current.map((c) => String(c["ゼッケン"])), 0)}>全員を0周にリセット</button>
        {err && <span className="ops-error">{err}</span>}
      </div>
      <div className="ops-scroll">
        <table className="ops-table">
          <thead><tr><th><input type="checkbox" checked={allShown} onChange={toggleAll} aria-label="表示中の選手をすべて選択" /></th><th>#</th><th>タグ</th><th>ゼッケン</th><th>氏名</th><th>種目</th><th>周回</th><th>距離</th><th>最終通過</th><th>ラップ</th><th>RSSI</th><th>最終受信</th></tr></thead>
          <tbody>
            {shown.map((c, i) => {
              const bib = String(c["ゼッケン"]);
              return (
                <tr key={bib} className={sel.has(bib) ? "ops-selected" : ""}>
                  <td><input type="checkbox" checked={sel.has(bib)} onChange={() => toggle(bib)} aria-label={`No.${bib} を選択`} /></td>
                  <td>{i + 1}</td>
                  <td className="ops-num">{bib}</td>
                  <td className="ops-num ops-strong">{c.short}</td>
                  <td title={[c.kana, c.sex].filter(Boolean).join(" / ")}>{c.runner["氏名"] || <span className="ops-muted">未登録</span>}</td>
                  <td>{c.runner["種目"]}</td>
                  <td className="ops-num ops-strong">{c["周回"]}</td>
                  <td className="ops-num">{((num(c["周回"]) || 0) * LAP_METERS / 1000).toFixed(2)}km</td>
                  <td>{c["最終通過"]}</td>
                  <td>{lapText(c["ラップ"])}</td>
                  <td className="ops-num">{c["RSSI"] === "127" ? "-" : c["RSSI"]}</td>
                  <td>{c["最終受信"]}</td>
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

function RunnerRow({ r, onSave }) {
  const [name, setName] = useState(r["氏名"] || "");
  const [cat, setCat] = useState(r["種目"] || "");
  const [note, setNote] = useState(r["備考"] || "");
  const dirty = name !== (r["氏名"] || "") || cat !== (r["種目"] || "") || note !== (r["備考"] || "");
  return (
    <tr>
      <td className="ops-num">{r["ゼッケン"]}</td>
      <td className="ops-num ops-strong">{r._short}</td>
      <td><input value={name} onChange={(e) => setName(e.target.value)} placeholder={r._seed || "氏名"} /></td>
      <td><select value={cat} onChange={(e) => setCat(e.target.value)}>{CATEGORIES.map((c) => <option key={c} value={c}>{c || "—"}</option>)}</select></td>
      <td className="ops-mono">{r["MAC"]}</td>
      <td>{r["初回検出"]}</td>
      <td><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="備考" /></td>
      <td><button disabled={!dirty} onClick={() => onSave({ bib: r["ゼッケン"], name, category: cat, note })}>保存</button></td>
    </tr>
  );
}

function RunnerPanel({ runners, onSave }) {
  const [bib, setBib] = useState("");
  const [err, setErr] = useState("");
  const sorted = [...runners].sort((a, b) => num(a["ゼッケン"]) - num(b["ゼッケン"]));
  return (
    <section className="ops-sec">
      <h2>選手・ビーコンの紐付け <small>受信したチップは自動で追加（ゼッケン＝iBeacon Minor）</small></h2>
      <div className="ops-scroll">
        <table className="ops-table">
          <thead><tr><th>タグ</th><th>ゼッケン</th><th>氏名</th><th>種目</th><th>MAC</th><th>初回検出</th><th>備考</th><th></th></tr></thead>
          <tbody>{sorted.map((r) => <RunnerRow key={`${r["ゼッケン"]}-${r["氏名"]}-${r["種目"]}-${r["備考"]}`} r={r} onSave={onSave} />)}</tbody>
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

function ConfigRow({ c, onSave }) {
  const [v, setV] = useState(c["値"]);
  const readOnly = c["項目"].startsWith("latest");
  return (
    <tr>
      <td className="ops-mono">{c["項目"]}</td>
      <td>{readOnly ? c["値"] : <input value={v} onChange={(e) => setV(e.target.value)} />}</td>
      <td className="ops-desc">{c["説明"]}</td>
      <td>{!readOnly && <button disabled={v === c["値"]} onClick={() => { if (window.confirm(`${c["項目"]} を「${v}」に変更しますか？`)) onSave(c["項目"], v); }}>反映</button>}</td>
    </tr>
  );
}

function ConfigPanel({ config, onSave }) {
  return (
    <section className="ops-sec">
      <h2>遠隔設定 <small>反映すると次の送信（約20秒以内）で端末に適用</small></h2>
      <div className="ops-scroll">
        <table className="ops-table">
          <thead><tr><th>項目</th><th>値</th><th>説明</th><th></th></tr></thead>
          <tbody>{config.map((c) => <ConfigRow key={`${c["項目"]}-${c["値"]}`} c={c} onSave={onSave} />)}</tbody>
        </table>
      </div>
    </section>
  );
}
