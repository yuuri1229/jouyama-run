# 新潟・城山運動公園24＆12時間走 公式サイト

Next.js（React）製の静的サイトです。GitHub Pagesで無料公開できます。

## フォルダ構成

```
├── app/
│   ├── page.jsx          # トップページ
│   ├── news/page.jsx     # 最新情報一覧ページ
│   ├── layout.jsx        # 共通レイアウト（ヘッダー・フッター）
│   ├── fonts.js          # フォント（Noto Sans JP／Roboto。ビルド時に取り込み自サイトから配信）
│   └── globals.css       # サイト全体のデザイン（色・レイアウト）
├── components/           # 部品（ヒーロー、ヘッダー、アイコン、受付状態の時計、下部エントリーバー等）
├── data/
│   └── news.js           # ★最新情報のデータ（microCMS未設定時のみ使用）
├── lib/
│   ├── event.js          # ★開催日・参加費・定員など大会情報（毎年ここを更新）
│   ├── site.js           # ★エントリーフォーム等のURL設定
│   ├── assets.js         # 使用アイコンの一覧と写真の配信設定
│   └── sanitize.js       # microCMSの記事HTMLから危険なタグを取り除く設定
├── public/img/           # ★画像置き場（.jpgが元写真、.avif/.webpは自動生成）
├── scripts/
│   ├── build-images.mjs  # 写真のAVIF/WebP変換（npm run images）
│   ├── build-icons.mjs   # アイコンのSVG生成（ビルド時に自動実行）
│   └── postbuild-csp.mjs # セキュリティ設定(CSP)の書き込み（ビルド時に自動実行）
└── .github/
    ├── workflows/        # 自動デプロイ設定（触らなくてOK）
    └── dependabot.yml    # 依存パッケージの更新提案（月1回）
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

> ⚠️ **ヒーロー（hero-1〜4.jpg）とギャラリー（gallery-1〜4.jpg）を
> 差し替えたときは、配信用の軽量版をつくり直す必要があります。**
> パソコンにNode.jsがある場合は、差し替え後に次を実行してください。
>
> ```bash
> npm run images   # public/img/ に hero-1-960.avif / .webp などを書き出す（5〜6分かかります）
> ```
>
> 生成された `.avif` と `.webp` も一緒にコミットします。
> 実行しないと、新しい写真ではなく**古い写真が表示されたまま**になります。
> （パソコンが使えない場合は、その旨を添えて相談してください）

### 本文・開催情報を変更する

- **開催日、エントリー期間、参加費、定員：`lib/event.js` を編集**
  - 「2026年11月22日(日)」のような表示文字列は日時から自動生成されるので、
    日付を手打ちする必要はありません
  - 祝日だけは自動判定できないため、日程を動かしたときは
    同ファイルの `HOLIDAYS` も更新してください
  - エントリーの「受付中／受付終了」もこの期間から自動で切り替わります
    （ページを開いている間も1分ごとに現在時刻で判定し直します。締切を過ぎると
    「エントリー受付終了」の表記に変わり、エントリーボタン・締切カウントダウン・
    スマホ下部のエントリーバーが消えます。JavaScriptが動かない環境のために、
    GitHub Actionsが毎朝5時にもビルドし直しています）
  - ヒーロー直下の「基本情報バー」（開催日・会場・1周の距離・締切）と、
    種目カードの「日没／日の出」表示もここの値から自動で作られます
    （日没・日の出の時刻は `lib/sky.js` の `SUN`。日程を動かしたら更新）
- スケジュール表・ルールなどの文章：`app/page.jsx` 内の該当テキストを編集
- エントリーフォーム等のURL：`lib/site.js` を編集
- 色の変更：`app/globals.css` 冒頭の `:root` にあるカラー変数を編集
  （半透明の罫線や下地もこの値から計算されるので、ここだけ変えれば全体が追従します。
  メインカラーを変えたときは、スマホのアドレスバーの色 `lib/site.js` の `THEME` も合わせてください）

### アイコンを追加する

アイコンは Material Symbols（ https://fonts.google.com/icons ）の形を、
使う分だけSVGにしてページに埋め込んでいます（外部サーバーへの読み込みは発生しません）。
新しいアイコンを使うときは、

1. `lib/assets.js` の `MATERIAL_ICONS` に名前（例：`"directions_bike"`）を追加
2. ページ側では `<Icon name="directions_bike" />` と書く

の2点だけです。名前の綴りを間違えるとビルドが止まり、どの名前が見つからないかが
Actions のログに表示されます（その間も公開中のサイトはそのまま残ります）。

### サイトのレビュー結果

デザイン・パフォーマンス・アクセシビリティ・セキュリティの点検結果と、
未対応の改善案は `docs/site-review.md` にまとめてあります。

### セキュリティについて

サイトの中で行っている対策（記事HTMLの無害化、Content-Security-Policy、
依存パッケージのインストール時スクリプト停止、Actions のコミットID固定など）と、
**GitHub・microCMS の管理画面で行っていただきたい設定**は
`docs/site-review.md` の「第2回点検」にまとめてあります。

依存パッケージの更新は Dependabot が月1回プルリクエストで提案します。
緑のチェック（ビルド成功）を確認してからマージしてください。

### スライドショーの切り替え間隔

`components/Hero.jsx` 冒頭の `SLIDE_INTERVAL`（ミリ秒）を変更。

## パソコンで動作確認したい場合（任意）

Node.js（LTS版。22以上）をインストール後、このフォルダで：

```bash
npm ci          # 初回のみ（package-lock.json どおりに入れる）
npm run dev     # http://localhost:3000 で確認
npm run build   # 公開用の書き出し（out/ フォルダ）。CSPの確認はこちらで
npm run images  # 写真を差し替えたときだけ
```

※ ローカル環境がなくてもGitHub上の編集だけで運用できます。
