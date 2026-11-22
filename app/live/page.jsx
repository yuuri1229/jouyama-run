import LiveBoard from "../../components/LiveBoard";
import "./live.css";

// 速報ページ（選手・応援者向け／会場モニター用）
// 氏名を載せるので検索エンジンには載せない（noindex）
export const metadata = {
  title: "リアルタイム速報",
  description: "新潟・城山運動公園24＆12時間走の周回数・距離のリアルタイム速報。",
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default function LivePage() {
  return (
    <main className="page-main live-main" id="main">
      <LiveBoard />
    </main>
  );
}
