import { Noto_Sans_JP, Roboto } from "next/font/google";

// =========================================================
// フォント（和文 Noto Sans JP ／ 英数字・データ表記 Roboto）
// ---------------------------------------------------------
// 以前は Google Fonts の CSS を <link> で読んでいたため、初回表示のたびに
//   fonts.googleapis.com（描画を止めるCSS）→ fonts.gstatic.com（フォント本体）
// と、別のサーバー2つへ接続してからでないと文字が組めなかった。
// next/font はビルド時にフォントを取り込み、このサイト自身から配信する。
// 外部への接続が無くなり、フォント未着の間の代替フォントの字幅も揃えてくれる。
//
// どちらも「可変フォント」で読む。太さごとに別ファイルだった頃は
// 400/500/700 の3本ぶん（和文は文字の区画ごとにさらに分割）を取得していたが、
// 可変フォントなら1本で全部の太さをまかなえる。
// =========================================================

export const notoSansJp = Noto_Sans_JP({
  // 和文は文字数が多く、Googleが文字の区画ごとに分割したファイルを
  // ページで使う分だけブラウザが取りに行く。先読みはしない。
  subsets: ["latin"],
  preload: false,
  display: "swap",
  variable: "--font-noto",
});

export const roboto = Roboto({
  // ヒーローの「24 / 12」など大きな数字に使うので先読みする（英数字のみで軽い）
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto",
});
