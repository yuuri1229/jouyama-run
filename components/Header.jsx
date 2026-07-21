"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SocialLinks from "./SocialLinks";
import { SITE } from "../lib/site";

const NAV_ITEMS = [
  { href: "/#news", label: "最新情報" },
  { href: "/#outline", label: "大会概要" },
  { href: "/#course", label: "コース" },
  { href: "/#rules", label: "ルール" },
];

const SCROLL_THRESHOLD = 60;

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";

  useEffect(() => {
    if (!isHome) return;

    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  const isTransparent = isHome && !scrolled;

  return (
    <header className={`site-header${isTransparent ? " is-transparent" : ""}`}>
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
