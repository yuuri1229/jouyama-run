/** @type {import('next').NextConfig} */

// GitHub Pagesの「プロジェクトサイト」（https://ユーザー名.github.io/リポジトリ名/）で
// 公開する場合、ビルド時に NEXT_PUBLIC_BASE_PATH=/リポジトリ名 が設定されます。
// （GitHub Actionsのワークフローが自動で設定するので、手動変更は不要です）
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  output: "export",        // 静的HTMLとして書き出す（GitHub Pages用）
  basePath,
  trailingSlash: true,     // /news/ 形式のURLにして静的ホスティングと相性を良くする
  images: { unoptimized: true },
};

export default nextConfig;
