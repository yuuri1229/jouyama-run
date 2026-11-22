"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// =========================================================
// リアルタイム速報（選手・応援者向け／会場モニター全画面表示）
// ・データは Apps Script の公開窓口（action: "live"）から取得。合言葉は不要
// ・通常表示：種目タブ・検索つきの順位表
// ・モニター表示：全画面・大きな文字で、順位表を自動でページ送り（?tv=1 でも開ける）
// =========================================================
const ENDPOINT =
  "https://script.google.com/macros/s/AKfycbzqREVgPY7kD4nG0q0VVrzEz9cYAj55X31Oofjn9t6rUUaJ_pHzOrCepXuyNwjs4iB_/exec";
const LAP_KM = 0.96;
const POLL_SEC = 20; // 通常表示の更新間隔
const POLL_SEC_TV = 10; // モニター表示
const PAGE_SEC = 12; // モニター表示のページ送り
const TV_ROWS = 8; // モニター表示の1ページの行数
const CAT_ORDER = ["24時間", "12時間デイ", "12時間ナイト"];

const hm = (t) => (t && /^\d+:\d\d/.test(t) ? t.slice(0, t.lastIndexOf(":")).padStart(5, "0") : "");
const kmText = (laps) => (laps * LAP_KM).toFixed(2);

// "HH:mm:ss" を サーバー時刻からの経過秒に直す（日付をまたぐ夜間でも順序が狂わないように）
function agoSec(hms, serverTime) {
  const m = /^(\d+):(\d\d):(\d\d)$/.exec(hms || "");
  const n = /(\d+):(\d\d):(\d\d)$/.exec(serverTime || "");
  if (!m || !n) return -1;
  const d = (Number(n[1]) * 3600 + Number(n[2]) * 60 + Number(n[3])) - (Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]));
  return d < 0 ? d + 86400 : d;
}

function rankRows(items, serverTime) {
  // 周回数の多い順 → 同じなら最終通過が早い順（経過秒が大きい方が先）。通過なしは最後
  const rows = items.slice().sort((a, b) => b.l - a.l || agoSec(b.t, serverTime) - agoSec(a.t, serverTime) || a.b.localeCompare(b.b, "ja", { numeric: true }));
  rows.forEach((r, i) => { r.rank = i + 1; });
  return rows;
}

export default function LiveBoard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [tv, setTv] = useState(false);
  const [page, setPage] = useState(0);
  const [tvCatIx, setTvCatIx] = useState(0);
  const [clock, setClock] = useState("");
  const wrap = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "live" }) });
      const j = await res.json();
      if (!j.ok) throw new Error("data");
      setData(j); setErr("");
    } catch {
      setErr("通信できません。少し待って自動で再試行します");
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tv") === "1") setTv(true);
  }, []);
  useEffect(() => {
    load();
    const ms = (tv ? POLL_SEC_TV : POLL_SEC) * 1000;
    const id = setInterval(() => { if (!document.hidden) load(); }, ms + Math.floor(Math.random() * 2000));
    return () => clearInterval(id);
  }, [load, tv]);
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);

  const items = useMemo(() => (data ? data.items : []), [data]);
  const cats = useMemo(() => {
    const have = new Set(items.map((x) => x.c).filter(Boolean));
    return [...CAT_ORDER.filter((c) => have.has(c)), ...[...have].filter((c) => !CAT_ORDER.includes(c))];
  }, [items]);

  // モニター表示：種目ごとに順番に表示（種目が無ければ総合）
  const tvCats = cats.length ? cats : ["all"];
  const activeTab = tv ? tvCats[tvCatIx % tvCats.length] : tab;
  const rows = useMemo(() => {
    const base = activeTab === "all" ? items : items.filter((x) => x.c === activeTab);
    return rankRows(base.map((x) => ({ ...x })), data ? data.serverTime : "");
  }, [items, activeTab, data]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return !s || tv ? rows : rows.filter((r) => r.b.toLowerCase().includes(s) || r.n.replace(/\s/g, "").toLowerCase().includes(s.replace(/\s/g, "")) || r.k.replace(/\s/g, "").toLowerCase().includes(s.replace(/\s/g, "")));
  }, [rows, q, tv]);

  const pages = Math.max(1, Math.ceil(filtered.length / TV_ROWS));
  useEffect(() => {
    if (!tv) return;
    const id = setInterval(() => {
      setPage((p) => {
        if (p + 1 < pages) return p + 1;
        setTvCatIx((c) => c + 1);
        return 0;
      });
    }, PAGE_SEC * 1000);
    return () => clearInterval(id);
  }, [tv, pages]);
  useEffect(() => { setPage(0); }, [activeTab, tv]);

  const enterTv = async () => {
    setTv(true); setTvCatIx(0); setPage(0);
    try { if (wrap.current && wrap.current.requestFullscreen) await wrap.current.requestFullscreen(); } catch {}
  };
  const leaveTv = async () => {
    setTv(false);
    try { if (document.fullscreenElement) await document.exitFullscreen(); } catch {}
  };
  useEffect(() => {
    const onFs = () => { if (!document.fullscreenElement && tv && !new URLSearchParams(window.location.search).get("tv")) setTv(false); };
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return; // 検索欄の入力は無視
      if (e.key === "f" || e.key === "F") { tv ? leaveTv() : enterTv(); }
    };
    document.addEventListener("fullscreenchange", onFs); window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("fullscreenchange", onFs); window.removeEventListener("keydown", onKey); };
  });

  const age = data ? data.serverTime : "";
  const totalKm = items.reduce((a, x) => a + x.l, 0) * LAP_KM;
  const label = (c) => (c === "all" ? "総合" : c);
  const view = tv ? filtered.slice(page * TV_ROWS, page * TV_ROWS + TV_ROWS) : filtered;

  return (
    <div ref={wrap} className={tv ? "live live-tv" : "live"}>
      <header className="live-head">
        <div>
          <h1>{tv ? "新潟・城山運動公園24＆12時間走　速報" : "リアルタイム速報"}</h1>
          <p className="live-sub">{tv ? `${label(activeTab)}　${page + 1}/${pages}ページ` : "周回数・距離は計測チップの受信にもとづく速報です。公式記録は後日発表します。"}</p>
        </div>
        <div className="live-meta">
          <span className="live-clock">{clock}</span>
          <span className={err ? "live-bad" : "live-ok"}>{err || (age ? `更新 ${age.slice(11)}` : "読み込み中…")}</span>
          {tv ? <button type="button" onClick={leaveTv}>通常表示に戻る（F）</button> : <button type="button" onClick={enterTv}>モニター全画面表示（F）</button>}
        </div>
      </header>

      {!tv && (
        <div className="live-tools">
          <div className="live-tabs" role="tablist">
            {["all", ...cats].map((c) => (
              <button key={c} type="button" role="tab" aria-selected={tab === c} className={tab === c ? "on" : ""} onClick={() => setTab(c)}>{label(c)}</button>
            ))}
          </div>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ゼッケン・氏名で探す" aria-label="ゼッケン・氏名で探す" />
          <span className="live-total">全員の合計 {totalKm.toFixed(0)} km</span>
        </div>
      )}

      {data && !data.items.length && <p className="live-empty">まだデータがありません。</p>}
      <table className="live-table">
        <thead>
          <tr><th>順位</th><th>ゼッケン</th><th>氏名</th>{!tv && activeTab === "all" && <th>種目</th>}<th className="num">周回</th><th className="num">距離</th><th className="num">最終通過</th><th className="num">ラップ</th></tr>
        </thead>
        <tbody>
          {view.map((r) => (
            <tr key={r.b + r.n}>
              <td className="rank">{r.rank}</td>
              <td className="bib">{r.b}</td>
              <td className="name">{r.n}</td>
              {!tv && activeTab === "all" && <td className="cat">{r.c}</td>}
              <td className="num lap">{r.l}</td>
              <td className="num">{kmText(r.l)}<small>km</small></td>
              <td className="num">{hm(r.t)}</td>
              <td className="num">{r.p}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!tv && data && filtered.length === 0 && data.items.length > 0 && <p className="live-empty">該当する選手がいません。</p>}
    </div>
  );
}
