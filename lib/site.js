// public/ 配下のファイル（画像など）へのパスを解決するヘルパー。
// GitHub Pagesのプロジェクトサイトでは URL の先頭に /リポジトリ名 が付くため、
// 画像は必ず asset("/img/xxx.jpg") の形で参照してください。
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
// 絶対URL（microCMSの画像など）はそのまま、相対パスには basePath を前置する。
export const asset = (path) =>
  /^https?:\/\//.test(path) ? path : `${basePath}${path}`;

export const SITE = {
  name: "新潟・城山運動公園24＆12時間走",
  entryFormUrl: "https://forms.gle/xWJRxteqAACZNA418",
  entryListUrl:
    "https://docs.google.com/spreadsheets/d/1GNAjAobXidOmveTPMBfLyQlCo1l6-MK72NuvXv9_k34/edit?usp=sharing",
  mapUrl: "https://maps.app.goo.gl/NsbPZFEaqAQbdLqW9",
};
