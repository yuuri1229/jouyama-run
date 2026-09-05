"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import SocialLinks from "./SocialLinks";
import { SITE } from "../lib/site";

const NAV_ITEMS = [
  { href: "/#news", label: "最新情報" },
  { href: "/#outline", label: "大会概要" },
  { href: "/#course", label: "コース" },
  { href: "/#rules", label: "ルール" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const headerRef = useRef(null);
  const toggleRef = useRef(null);

  // メニューが開いている間だけ有効にする挙動をまとめる。
  //  ・Escapeで閉じてハンバーガーにフォーカスを戻す（キーボード操作）
  //  ・メニューの外側をタップしたら閉じる
  //  ・背後のページがスクロールしないようにする
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onPointerDown = (e) => {
      if (!headerRef.current?.contains(e.target)) setOpen(false);
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <header className="site-header" ref={headerRef}>
      <div className="header-inner">
        <Link href="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-name">新潟・城山運動公園24&amp;12時間走</span>
        </Link>

        <nav className="global-nav" aria-label="グローバルナビゲーション">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
          <SocialLinks className="header-social" />
          <a
            className="nav-cta"
            href={SITE.entryFormUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            エントリー
            <span className="material-symbols-outlined" aria-hidden="true">
              arrow_outward
            </span>
          </a>
        </nav>

        <button
          ref={toggleRef}
          className="nav-toggle"
          aria-label={open ? "メニューを閉じる" : "メニューを開く"}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen(!open)}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {open ? "close" : "menu"}
          </span>
        </button>
      </div>

      <nav
        className={`mobile-nav${open ? " is-open" : ""}`}
        id="mobile-nav"
        aria-label="モバイルメニュー"
      >
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
            {item.label}
          </Link>
        ))}
        <a
          className="mobile-nav-cta"
          href={SITE.entryFormUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setOpen(false)}
        >
          エントリーフォーム
        </a>
        <SocialLinks className="mobile-nav-social" />
      </nav>
    </header>
  );
}
