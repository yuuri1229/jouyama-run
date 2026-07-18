import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer";

export const metadata = {
  title: "新潟・城山運動公園24＆12時間走｜2026.11.22-23",
  description:
    "2026年11月22日(日)〜23日(祝)開催。新潟市西蒲区・城山運動公園、1周約960mの周回コースで行われる24時間走・12時間走の公式サイト。",
  openGraph: {
    siteName: "新潟・城山運動公園24＆12時間走",
    title: "新潟・城山運動公園24＆12時間走",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body id="top">
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
