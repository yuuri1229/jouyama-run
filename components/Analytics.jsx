"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { basePath, SITE } from "../lib/site";

// Googleアナリティクス（GA4）
// ・測定IDは公開値のためコードに直接記載しています（lib/site.js の gaId）。
//   形式（G-英数字）以外の値は使わない（環境変数の誤設定でスクリプトが壊れないように）。
// ・Next.jsのApp Routerはページ遷移時にリロードが起きないため、
//   pathname の変化を検知して page_view を送信しています。
// ・初期化はインラインの <script> ではなくこのファイルの中で行う。
//   インラインスクリプトが無いことで、Content-Security-Policy で
//   「ページに埋め込まれた想定外のスクリプトは実行しない」と決められる
//   （scripts/postbuild-csp.mjs）。
// ・gtag.js は表示が落ち着いてから読む（lazyOnload）。それまでの計測命令は
//   dataLayer に溜まり、読み込み後にまとめて送られるので取りこぼさない。
const GA_ID = /^G-[A-Z0-9]+$/.test(SITE.gaId || "") ? SITE.gaId : null;

// gtag.js は dataLayer に積まれた「arguments オブジェクト」を命令として読む。
// 配列にすると無視されるため、公式スニペットと同じく function で arguments を積む。
function gtag() {
  window.dataLayer.push(arguments);
}

export default function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!GA_ID) return;
    if (typeof window.gtag !== "function") {
      window.dataLayer = window.dataLayer || [];
      window.gtag = gtag;
      gtag("js", new Date());
      // ページビューは下で送る。config でも送ると初回訪問が2PVに二重計上される。
      gtag("config", GA_ID, { send_page_view: false });
    }
    window.gtag("event", "page_view", {
      page_path: `${basePath}${pathname}`,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname]);

  if (!GA_ID) return null;

  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
      strategy="lazyOnload"
    />
  );
}
