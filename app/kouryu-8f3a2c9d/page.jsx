import Board from "../../components/Board";
import "./board.css";

// 選手＆スタッフ交流掲示板（第3回大会専用。次回以降は別のページ・別のデータで作る）
// ・検索エンジンに載せない（noindex）。sitemap.xml・ナビ・robots.txt のどこにも書かない
// ・URL を知っている人だけが開ける（アドレスは推測されにくい文字列。認証ではない）
export const metadata = {
  title: "選手＆スタッフ交流掲示板（第3回大会）",
  robots: { index: false, follow: false, nocache: true },
  alternates: { canonical: null },
  openGraph: null,
  twitter: null,
};

export default function BoardPage() {
  return (
    <main className="page-main board-main" id="main">
      <Board siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""} />
    </main>
  );
}
