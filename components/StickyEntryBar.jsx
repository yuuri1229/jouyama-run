"use client";

import { useEffect, useState } from "react";
import { useEntryStatus } from "./EntryClock";
import { SITE } from "../lib/site";
import { LABEL } from "../lib/event";

// スマホ・タブレット向けの下部固定エントリーバー。
// 出す条件は「受付中」かつ「ヒーローを7割ほど過ぎた」とき。
// 画面幅（1020px未満）とメニューが開いている間の非表示はCSS側で行う
// （.sticky-entry の定義を参照）。
const PAST_HERO = 0.7; // 画面の高さに対する割合

export default function StickyEntryBar() {
  const { open, daysLeft } = useEntryStatus();
  const [past, setPast] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => setPast(window.scrollY > window.innerHeight * PAST_HERO);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [open]);

  // バーの高さぶん、フッター末尾に余白を足してもらう（globals.css の
  // body.has-sticky-entry）。固定バーがフッターの最後の行に被らないように。
  useEffect(() => {
    if (!open) return;
    document.body.classList.add("has-sticky-entry");
    return () => document.body.classList.remove("has-sticky-entry");
  }, [open]);

  if (!open || !past) return null;

  return (
    <div className="sticky-entry">
      <div className="sticky-entry-text">
        <span className="sticky-entry-state">エントリー受付中</span>
        <span className="sticky-entry-meta">
          〜{LABEL.deadlineDot} {LABEL.deadlineEn} ・ あと{daysLeft}日
        </span>
      </div>
      <a
        className="sticky-entry-btn"
        href={SITE.entryFormUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        エントリー
        <span className="material-symbols-outlined" aria-hidden="true">
          arrow_outward
        </span>
      </a>
    </div>
  );
}
