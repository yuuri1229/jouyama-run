# 新潟・城山運動公園24＆12時間走 公式サイト

Next.js（React）製の静的サイトです。GitHub Pagesで無料公開できます。

## フォルダ構成

```
├── app/
│   ├── page.jsx          # トップページ
│   ├── news/page.jsx     # 最新情報一覧ページ
│   ├── layout.jsx        # 共通レイアウト（ヘッダー・フッター）
│   └── globals.css       # サイト全体のデザイン（色・レイアウト）
├── components/           # 部品（ヒーロー、ヘッダー、リビール等）
├── data/
│   └── news.js           # ★最新情報のデータ（普段の更新はほぼここだけ）
├── lib/site.js           # ★エントリーフォーム等のURL設定
├── public/img/           # ★画像置き場
└── .github/workflows/    # 自動デプロイ設定（触らなくてOK）
```

★印が日常のメンテナンスで触るファイルです。

## 初回デプロイ手順（ブラウザだけで完結）

1. GitHubにサインイン → 右上「+」→「New repository」
   - Repository name：例 `jouyama-run`（Public）
2. リポジトリ画面の「uploading an existing file」から、
   このフォルダの**中身**（app、components、data、lib、public、
   .github、package.json、next.config.mjs、.gitignore、README.md）を
   まとめてドラッグ＆ドロップ →「Commit changes」
   - ※ .github フォルダはドラッグで入らない場合があります。その場合は
     「Add file → Create new file」でファイル名に
     `.github/workflows/deploy.yml` と入力し、中身を貼り付けてください。
3. Settings → Pages → 「Build and deployment」の Source を
   **「GitHub Actions」** に変更
4. リポジトリの「Actions」タブでビルドが緑のチェックになれば公開完了
   - URL：`https://ユーザー名.github.io/jouyama-run/`

以後、**ファイルを編集してCommitするたびに自動で再ビルド・公開**されます。
（反映まで1〜2分）

## 日常のメンテナンス方法

### 最新情報を追加する

1. GitHub上で `data/news.js` を開き、鉛筆アイコン（Edit）をクリック
2. `newsItems = [` の直後（配列の先頭）に、ファイル冒頭のコメントに
   ある形式でお知らせを1件追加
3. 「Commit changes」→ 1〜2分で反映

段落（p）、外部リンク（link）、画像（image）を自由に組み合わせられます。
トップページには新しい順に3件表示され、一覧ページには全件表示されます。

### 画像を追加・入れ替える

1. `public/img/` フォルダを開く →「Add file → Upload files」で画像を追加
2. お知らせで使う場合は `data/news.js` の image ブロックに
   `src: "/img/ファイル名"` を指定
3. ヒーローやギャラリーの写真を入れ替える場合は、同じファイル名で
   上書きアップロードするのが最も簡単です
   （別名にする場合は `components/Hero.jsx` や `app/page.jsx` の
   ファイル名も合わせて変更）

### 本文・開催情報を変更する

- 開催日、参加費、スケジュールなどの本文：`app/page.jsx` 内の該当テキストを編集
- エントリーフォーム等のURL：`lib/site.js` を編集
- 色の変更：`app/globals.css` 冒頭の `:root` にあるカラー変数を編集

### スライドショーの切り替え間隔

`components/Hero.jsx` 冒頭の `SLIDE_INTERVAL`（ミリ秒）を変更。

## パソコンで動作確認したい場合（任意）

Node.js（LTS版）をインストール後、このフォルダで：

```bash
npm install     # 初回のみ
npm run dev     # http://localhost:3000 で確認
```

※ ローカル環境がなくてもGitHub上の編集だけで運用できます。
