"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// =========================================================
// リアルタイム速報（選手・応援者向け／会場モニター全画面表示）
// ・データは Apps Script の公開窓口（action: "live"）から取得。合言葉は不要
// ・種目ごとの表（24時間走 / 12時間デイ / 12時間ナイト）を1画面に並べる
//   列：順位・ゼッケン・氏名・現時点距離(km)・チェック時刻
// ・「モニター全画面表示」（Fキー / ?tv=1）：画面いっぱいに収まる大きさで表示
// =========================================================
const ENDPOINT =
  "https://script.google.com/macros/s/AKfycbzqREVgPY7kD4nG0q0VVrzEz9cYAj55X31Oofjn9t6rUUaJ_pHzOrCepXuyNwjs4iB_/exec";
const LAP_KM = 0.96;
const POLL_SEC = 20; // 通常表示の更新間隔
const POLL_SEC_TV = 10; // モニター表示
const MIN_ROWS = 6; // 表の最低行数（空行で埋めて表の形を保つ）
const CATS = ["24時間", "12時間デイ", "12時間ナイト"];
const CAT_TITLE = { "24時間": "24時間走", "12時間デイ": "12時間デイ", "12時間ナイト": "12時間ナイト" };

// 種目が未登録のタグは、ゼッケン番号の百の位で判定（1xx=24時間, 2xx=12時間デイ, 3xx=12時間ナイト）
function catOf(x) {
  if (CATS.includes(x.c)) return x.c;
  const h = String(x.b).trim()[0];
  return h === "1" ? "24時間" : h === "2" ? "12時間デイ" : h === "3" ? "12時間ナイト" : "";
}

// "HH:mm:ss" を サーバー時刻からの経過秒に直す（日付をまたぐ夜間でも順序が狂わないように）
function agoSec(hms, serverTime) {
  const m = /^(\d+):(\d\d):(\d\d)$/.exec(hms || "");
  const n = /(\d+):(\d\d):(\d\d)$/.exec(serverTime || "");
  if (!m || !n) return -1;
  const d = Number(n[1]) * 3600 + Number(n[2]) * 60 + Number(n[3]) - (Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]));
  return d < 0 ? d + 86400 : d;
}

function rankRows(items, serverTime) {
  // 周回数の多い順 → 同じなら最終通過が早い順（経過秒が大きい方が先）。通過なしは最後
  const rows = items.slice().sort((a, b) => b.l - a.l || agoSec(b.t, serverTime) - agoSec(a.t, serverTime) || a.b.localeCompare(b.b, "ja", { numeric: true }));
  rows.forEach((r, i) => { r.rank = i + 1; });
  return rows;
}

const norm = (s) => String(s || "").replace(/[\s　]/g, "").toLowerCase();

function CatTable({ title, rows, total }) {
  const pad = Math.max(0, MIN_ROWS - rows.length);
  return (
    <section className="live-cat">
      <h2>{title}{total != null && total !== rows.length ? <small>（{rows.length}/{total}名）</small> : null}</h2>
      <table className="live-table">
        <thead>
          <tr><th>順位</th><th>ゼッケン</th><th>氏　名</th><th>現時点<br />距離(km)</th><th>チェック<br />時刻</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.b + r.n}>
              <td className="c">{r.rank}</td>
              <td className="c">{r.b}</td>
              <td className="name">{r.n}</td>
              <td className="c km">{(r.l * LAP_KM).toFixed(2)}</td>
              <td className="c">{r.t}</td>
            </tr>
          ))}
          {Array.from({ length: pad }).map((_, i) => (
            <tr key={"pad" + i} className="pad"><td /><td /><td /><td /><td /></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default function LiveBoard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [tv, setTv] = useState(false);
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

  const serverTime = data ? data.serverTime : "";
  const items = useMemo(() => (data ? data.items : []).filter((x) => !/^(予備|計測器)/.test(x.n || "") && !/^(予備|計測器)/.test(x.b || "")), [data]);
  const groups = useMemo(() => {
    const s = norm(q);
    const out = CATS.map((c) => {
      const all = rankRows(items.filter((x) => catOf(x) === c).map((x) => ({ ...x })), serverTime);
      const rows = tv || !s ? all : all.filter((r) => norm(r.b).includes(s) || norm(r.n).includes(s) || norm(r.k).includes(s));
      return { c, rows, total: all.length };
    });
    const other = items.filter((x) => !catOf(x));
    if (other.length) {
      const all = rankRows(other.map((x) => ({ ...x })), serverTime);
      out.push({ c: "その他", rows: tv || !s ? all : all.filter((r) => norm(r.b).includes(s) || norm(r.n).includes(s)), total: all.length });
    }
    return out;
  }, [items, q, tv, serverTime]);

  const enterTv = async () => {
    setTv(true);
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

  const hm = /(\d+:\d\d):\d\d$/.exec(serverTime);
  const asOf = hm ? hm[1].padStart(5, "0") : "--:--";
  const totalKm = items.reduce((a, x) => a + x.l, 0) * LAP_KM;
  const g = Object.fromEntries(groups.map((x) => [x.c, x]));
  const rest = groups.filter((x) => !CATS.includes(x.c));

  // モニター表示：1画面に収まるよう、いちばん長い列の行数から行の高さを決める
  const leftRows = Math.max(MIN_ROWS, (g["24時間"] || { rows: [] }).rows.length);
  const rightRows = Math.max(MIN_ROWS, (g["12時間デイ"] || { rows: [] }).rows.length) + Math.max(MIN_ROWS, (g["12時間ナイト"] || { rows: [] }).rows.length) + 2;
  const restRows = rest.reduce((a, x) => a + Math.max(MIN_ROWS, x.rows.length) + 2, 0);
  const need = Math.max(leftRows + 1, rightRows + restRows + 2);
  const rh = Math.min(8, 80 / need);

  return (
    <div ref={wrap} className={tv ? "live live-tv" : "live"} style={tv ? { "--rh": `${rh.toFixed(2)}vh` } : undefined}>
      <header className="live-head">
        <h1><span className="live-asof">{asOf}</span> 時点{tv ? <small>　新潟・城山運動公園24＆12時間走　速報</small> : null}</h1>
        <div className="live-meta">
          <span className={err ? "live-bad" : "live-ok"}>{err || (serverTime ? `更新 ${serverTime.slice(11)}` : "読み込み中…")}</span>
          {!tv && <span className="live-total">全員の合計 {totalKm.toFixed(0)} km</span>}
          {tv ? <button type="button" onClick={leaveTv}>通常表示に戻る（F）</button> : <button type="button" onClick={enterTv}>モニター全画面表示（F）</button>}
        </div>
      </header>
      {!tv && (
        <div className="live-tools">
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ゼッケン・氏名で探す" aria-label="ゼッケン・氏名で探す" />
          <span className="live-note">周回数・距離は計測チップの受信にもとづく速報です。公式記録は後日発表します。</span>
        </div>
      )}
      {data && !items.length && <p className="live-empty">まだデータがありません。</p>}
      <div className="live-grid">
        <div className="live-col">{g["24時間"] && <CatTable title={CAT_TITLE["24時間"]} rows={g["24時間"].rows} total={g["24時間"].total} />}</div>
        <div className="live-col">
          {g["12時間デイ"] && <CatTable title={CAT_TITLE["12時間デイ"]} rows={g["12時間デイ"].rows} total={g["12時間デイ"].total} />}
          {g["12時間ナイト"] && <CatTable title={CAT_TITLE["12時間ナイト"]} rows={g["12時間ナイト"].rows} total={g["12時間ナイト"].total} />}
          {rest.map((x) => <CatTable key={x.c} title={x.c} rows={x.rows} total={x.total} />)}
        </div>
      </div>
    </div>
  );
}
