"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { basePath, SITE } from "../lib/site";

// Googleアナリティクス（GA4）
// ・測定IDは公開値のためコードに直接記載しています（lib/site.js の gaId）。
// ・Next.jsのApp Routerはページ遷移時にリロードが起きないため、
//   pathname の変化を検知して page_view を送信しています。
export default function Analytics() {
  const gaId = SITE.gaId;
  const pathname = usePathname();

  useEffect(() => {
    if (!gaId || typeof window.gtag !== "function") return;
    window.gtag("event", "page_view", {
      page_path: `${basePath}${pathname}`,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [gaId, pathname]);

  if (!gaId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          // 初回のページビューはこのスクリプトではなく、下の useEffect から
          // 1回だけ送る。両方から送ると初回訪問が2PVとして二重計上される。
          gtag('config', '${gaId}', { send_page_view: false });
        `}
      </Script>
    </>
  );
}
