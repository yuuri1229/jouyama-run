import Link from "next/link";
import Icon from "../components/Icon";

// 存在しないURLのとき（404.html）に表示するページ。
// 既定の英語表示のままだと、日本語サイトの中で唯一英語になってしまうため用意している。
export const metadata = {
  title: "ページが見つかりません",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="page-main" id="main">
      <div className="container">
        <header className="sec-head">
          <p className="sec-eyebrow">404</p>
          <h1 className="sec-title">ページが見つかりません</h1>
        </header>
        <p className="res-lead">
          お探しのページは移動または削除されたか、URLが間違っている可能性があります。
        </p>
        <div className="sec-more">
          <Link className="text-arrow" href="/" prefetch={false}>
            トップへ戻る
            <Icon name="arrow_back" />
          </Link>
        </div>
      </div>
    </main>
  );
}
