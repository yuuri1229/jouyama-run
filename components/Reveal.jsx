"use client";

import { useEffect, useRef } from "react";

// 画面に入ったら下からふわっと表示するラッパー。
// <Reveal>...</Reveal> で囲むだけで使えます。
// as: 出力するHTMLタグ（既定は div）／ delay: 時間差（1〜3）

// 監視役（IntersectionObserver）はページ全体で1つだけ作って使い回す。
// 以前は <Reveal> ごとに作っていたため、トップページだけで20個が
// 同時に動いていた。
let observer = null;
function getObserver() {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
  }
  return observer;
}

export default function Reveal({
  as: Tag = "div",
  delay,
  className = "",
  children,
  ...rest
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      el.classList.add("is-visible");
      return;
    }

    const io = getObserver();
    io.observe(el);
    return () => io.unobserve(el);
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal${className ? ` ${className}` : ""}`}
      data-delay={delay}
      {...rest}
    >
      {children}
    </Tag>
  );
}
