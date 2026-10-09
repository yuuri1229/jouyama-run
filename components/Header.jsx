"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Icon from "./Icon";
import SocialLinks from "./SocialLinks";
import { SITE } from "../lib/site";
import { EVENT, LABEL } from "../lib/event";

// external: true はサイト外へ出るリンク。別タブで開くので、
// 文字だけだと予告なくサイトを離れることになる。小さなアイコンを添えて
// 「ここから外に出る」ことが分かるようにしている。
const NAV_ITEMS = [
  { href: "/#news", label: "最新情報" },
  { href: "/#outline", label: "大会概要" },
  { href: "/#course", label: "コース" },
  { href: "/#rules", label: "ルール" },
  { href: SITE.contactFormUrl, label: "お問い合わせ", external: true },
];

// トップページ（"/" や "/#news"）へのリンクは先読み（prefetch）しない。
// Next.js は画面内のリンク先のデータを裏で取得するが、トップは
// ページ内の移動がほとんどで、先読みすると毎回約54KB（圧縮前）を余分に取得し、
// 最新情報ページではヒーロー写真まで読み込んでいた。
// （true を渡すと「全データを先読み」の意味になるので、それ以外は undefined＝既定のまま）
const prefetchFor = (href) => (href === "/" || href.startsWith("/#") ? false : undefined);

// ヘッダー／モバイルメニューの両方で同じ出し分けをするための小さな部品
function NavItem({ item, onClick }) {
  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
      >
        {item.label}
        <Icon name="open_in_new" className="nav-external" />
      </a>
    );
  }
  return (
    <Link href={item.href} prefetch={prefetchFor(item.href)} onClick={onClick}>
      {item.label}
    </Link>
  );
}

// モバイルメニューの1行。「01 最新情報 ›」のように番号を添える。
// 外部リンクは › ではなく「別タブで開く」アイコンにする。
function MobileNavItem({ item, index, onClick }) {
  const num = String(index + 1).padStart(2, "0");
  const label = (
    <>
      <span className="mobile-nav-label">
        <span className="mobile-nav-num">{num}</span>
        {item.label}
      </span>
      <Icon
        name={item.external ? "open_in_new" : "chevron_right"}
        className={`mobile-nav-icon${item.external ? " is-external" : ""}`}
      />
    </>
  );
  if (item.external) {
    return (
      <a
        className="mobile-nav-item"
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
      >
        {label}
      </a>
    );
  }
  return (
    <Link
      className="mobile-nav-item"
      href={item.href}
      prefetch={prefetchFor(item.href)}
      onClick={onClick}
    >
      {label}
    </Link>
  );
}

// ハンバーガーに切り替わる幅。globals.css の @media (max-width: 1019px) と揃える
const DESKTOP_NAV = "(min-width: 1020px)";

export default function Header() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef(null);

  // メニューが開いている間だけ有効にする挙動をまとめる。
  //  ・Escapeで閉じてハンバーガーにフォーカスを戻す（キーボード操作）
  //  ・背後のページがスクロールしないようにする
  //  ・開いていることをCSSへ伝える（下部のエントリーバーを隠すため）
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.setAttribute("data-menu-open", "");
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.documentElement.removeAttribute("data-menu-open");
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // メニューを開いたまま画面を広げ（横向き・ウィンドウ拡大）てPC用ナビに
  // 切り替わったら閉じる。開いたままだと背後がスクロールロックされたままになる。
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_NAV);
    const onChange = (e) => {
      if (e.matches) setOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link
          href="/"
          prefetch={false}
          className="brand"
          onClick={() => setOpen(false)}
        >
          <span className="brand-name">新潟・城山運動公園24&amp;12時間走</span>
        </Link>

        <nav className="global-nav" aria-label="グローバルナビゲーション">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
          <SocialLinks className="header-social" />
          <a
            className="nav-cta"
            href={SITE.entryFormUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            エントリー
            <Icon name="arrow_outward" />
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
          <Icon name={open ? "close" : "menu"} />
        </button>
      </div>

      <nav
        className={`mobile-nav${open ? " is-open" : ""}`}
        id="mobile-nav"
        aria-label="モバイルメニュー"
      >
        {NAV_ITEMS.map((item, i) => (
          <MobileNavItem
            key={item.href}
            item={item}
            index={i}
            onClick={() => setOpen(false)}
          />
        ))}
        <a
          className="mobile-nav-cta"
          href={SITE.entryFormUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setOpen(false)}
        >
          エントリーフォーム
          <Icon name="arrow_outward" />
        </a>
        <p className="mobile-nav-date">
          {LABEL.bibDate} ／ {EVENT.venue.name}
        </p>
        <SocialLinks className="mobile-nav-social" />
      </nav>
    </header>
  );
}
