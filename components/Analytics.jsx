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
    window.gtag("config", gaId, {
      page_path: `${basePath}${pathname}`,
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
          gtag('config', '${gaId}');
        `}
      </Script>
    </>
  );
}
