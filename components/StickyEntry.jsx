"use client";

import { useEffect, useState } from "react";

// スマホでヒーローを過ぎたあとも「エントリー」に常にたどり着けるようにする固定バー。
// 以前は、ヒーローを過ぎるとメニュー（ハンバーガー）の中にしか導線が無かった。
//
// 出す／隠す：
//   ・ヒーローが見えている間は、ヒーロー内のボタンがあるので隠す
//   ・ENTRYセクションが見えている間も、同じボタンがあるので隠す
//   ・フッターが見えている間は、末尾の内容に被るので隠す
// 広い画面では CSS で非表示（スマホ幅だけの導線）。
export default function StickyEntry({ href, sub }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const targets = [
      [document.querySelector(".hero"), "hero"],
      [document.querySelector("#entry"), "entry"],
      [document.querySelector(".site-footer"), "footer"],
    ].filter(([el]) => el);
    const keyOf = new Map(targets);
    const visible = { hero: true, entry: false, footer: false };

    const io = new IntersectionObserver((records) => {
      for (const r of records) visible[keyOf.get(r.target)] = r.isIntersecting;
      setShow(!visible.hero && !visible.entry && !visible.footer);
    });
    targets.forEach(([el]) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className={`sticky-entry${show ? " is-visible" : ""}`}>
      <a className="btn btn-primary" href={href} target="_blank" rel="noopener noreferrer">
        <span>エントリーする</span>
        {sub ? <span className="sticky-entry-sub">{sub}</span> : null}
        <span className="material-symbols-outlined" aria-hidden="true">
          arrow_outward
        </span>
      </a>
    </div>
  );
}
