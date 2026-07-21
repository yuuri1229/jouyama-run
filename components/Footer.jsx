import Link from "next/link";
import SocialLinks from "./SocialLinks";
import { SITE } from "../lib/site";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <p className="footer-brand">
          新潟・城山運動公園<strong>24＆12</strong>時間走
        </p>
        <p className="footer-org">
          主催：新潟・城山運動公園24＆12時間走実行委員会（実行委員長　甲斐 愛子）
        </p>
        <SocialLinks className="footer-social" />
        <nav className="footer-nav" aria-label="フッターメニュー">
          <Link href="/#news">最新情報</Link>
          <Link href="/#outline">大会概要</Link>
          <Link href="/news/">最新情報一覧</Link>
          <a href={SITE.entryFormUrl} target="_blank" rel="noopener noreferrer">
            エントリー
          </a>
        </nav>
      </div>
    </footer>
  );
}
