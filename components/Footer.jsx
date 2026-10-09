import Link from "next/link";
import SocialLinks from "./SocialLinks";
import { SITE } from "../lib/site";
import { EVENT } from "../lib/event";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-top">
          <div className="footer-id">
            <p className="footer-brand">
              新潟・城山運動公園<strong>24＆12</strong>時間走
            </p>
            <p className="footer-org">
              主催：{EVENT.organizer.name}（実行委員長　{EVENT.organizer.chair}）
            </p>
          </div>
          <SocialLinks className="footer-social" />
        </div>
        {/* トップページ内へのリンクは先読みしない（components/Header.jsx の prefetchFor 参照） */}
        <nav className="footer-nav" aria-label="フッターメニュー">
          <Link href="/#news" prefetch={false}>最新情報</Link>
          <Link href="/#outline" prefetch={false}>大会概要</Link>
          <Link href="/#course" prefetch={false}>コース</Link>
          <Link href="/#rules" prefetch={false}>大会ルール</Link>
          <Link href="/news/">最新情報一覧</Link>
          <a href={SITE.entryFormUrl} target="_blank" rel="noopener noreferrer">
            エントリー
          </a>
          <a
            href={SITE.contactFormUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            お問い合わせ
          </a>
        </nav>
      </div>
    </footer>
  );
}
