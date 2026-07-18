"use client";

import { useEffect, useRef } from "react";

// 画面に入ったら下からふわっと表示するラッパー。
// <Reveal>...</Reveal> で囲むだけで使えます。
// as: 出力するHTMLタグ（既定は div）／ delay: 時間差（1〜3）
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

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
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
