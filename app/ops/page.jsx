import OpsConsole from "../../components/OpsConsole";
import "./ops.css";

// =========================================================
// 計測管制コンソール（大会スタッフ専用の裏ページ）
// ---------------------------------------------------------
// ・検索エンジンに載せない（noindex）。sitemap.xml にも入れていない
// ・ページ自体は誰でも開けるが、データの読み書きには「管制用の合言葉」が必要。
//   合言葉はコードに書かず、開いた人が入力する（ブラウザのタブを閉じると消える）
// ・データは Google Apps Script（周回計測BLE 受信）経由でスプレッドシートとやり取りする
// =========================================================
export const metadata = {
  title: "計測管制コンソール",
  robots: { index: false, follow: false, nocache: true },
  alternates: { canonical: null },
};

export default function OpsPage() {
  return (
    <main className="page-main ops-main" id="main">
      <OpsConsole />
    </main>
  );
}
