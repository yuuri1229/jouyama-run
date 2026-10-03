import Link from "next/link";

// 404ページ。以前は Next.js の既定（英語の「This page could not be found.」）が
// ヘッダー・フッターの間に出ていた。
export const metadata = { title: "ページが見つかりません" };

export default function NotFound() {
  return (
    <main className="page-main" id="main">
      <div className="container">
        <header className="sec-head">
          <p className="sec-eyebrow">404</p>
          <h1 className="sec-title">ページが見つかりません</h1>
        </header>
        <p className="notfound-lead">
          お探しのページは、移動または削除された可能性があります。
          URLをご確認いただくか、下のリンクからお探しください。
        </p>
        <div className="notfound-actions">
          <Link className="btn btn-primary" href="/">
            トップへ戻る
          </Link>
          <Link className="btn btn-line" href="/news/">
            最新情報を見る
          </Link>
        </div>
      </div>
    </main>
  );
}
