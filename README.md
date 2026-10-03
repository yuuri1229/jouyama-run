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
│   └── news.js           # ★最新情報のデータ（microCMS未設定時のみ使用）
├── lib/
│   ├── event.js          # ★開催日・参加費・定員など大会情報（毎年ここを更新）
│   ├── site.js           # ★エントリーフォーム等のURL設定
│   └── assets.js         # フォントと使用アイコンの一覧
├── public/img/           # ★画像置き場（.jpgが元写真、.webpは自動生成）
├── scripts/
│   └── build-images.mjs  # 写真のWebP変換（npm run images）
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

> **microCMS を使っている場合**（GitHub の Secrets に `MICROCMS_API_KEY` を設定済み）
> は、記事は microCMS から取得されます。
> **取得に失敗したときは、サンプル記事で置き換えて公開せず、ビルドごと失敗します。**
> （公開中のサイトはそのまま残ります。毎朝の自動ビルドが microCMS の障害に当たっても、
> 記事が消えたサイトが公開されることはありません。）
> 通信エラー・5xx は自動で3回まで再試行し、401/403/404（設定の誤り）はすぐ失敗にします。
> 失敗したときは GitHub の「Actions」タブに赤いバツが付き、エラー文に原因が出ます。
> 記事数が100件を超えても全件取得します。

### 画像を追加・入れ替える

1. `public/img/` フォルダを開く →「Add file → Upload files」で画像を追加
2. お知らせで使う場合は `data/news.js` の image ブロックに
   `src: "/img/ファイル名"` を指定
3. ヒーローやギャラリーの写真を入れ替える場合は、同じファイル名で
   上書きアップロードするのが最も簡単です
   （別名にする場合は `components/Hero.jsx` や `app/page.jsx` の
   ファイル名も合わせて変更）

> 🎯 **ヒーロー写真を差し替えたら、構図も見直してください。**
> 文字は画面の左下に載るため、被写体がそこに重ならないよう、写真ごとに
> 切り取り位置を指定しています（`components/Hero.jsx` の `SLIDES` の
> `pos`＝広い画面、`posSm`＝スマホ。CSSの `object-position` の値）。
> 例：`"50% 100%"` は「写真の下端を基準に表示」＝上の被写体を見せ、
> 下の無地の路面に文字を載せる構図になります。
> 暗幕の色は `app/globals.css` の `--ink-rgb`（サイトの深緑）です。

> ⚠️ **ヒーロー（hero-1〜4.jpg）とギャラリー（gallery-1〜4.jpg）を
> 差し替えたときは、配信用の軽量版をつくり直す必要があります。**
> パソコンにNode.jsがある場合は、差し替え後に次を実行してください。
>
> ```bash
> npm run images   # public/img/ に hero-1-960.webp などを書き出す
> ```
>
> 生成された `.webp` も一緒にコミットします。
> 実行しないと、新しい写真ではなく**古い写真が表示されたまま**になります。
> （パソコンが使えない場合は、その旨を添えて相談してください）

### 本文・開催情報を変更する

- **開催日、エントリー期間、参加費、定員：`lib/event.js` を編集**
  - 「2026年11月22日(日)」のような表示文字列は日時から自動生成されるので、
    日付を手打ちする必要はありません
  - 祝日だけは自動判定できないため、日程を動かしたときは
    同ファイルの `HOLIDAYS` も更新してください
  - エントリーの「受付中／受付終了」もこの期間から自動で切り替わります
- スケジュール表・ルールなどの文章：`app/page.jsx` 内の該当テキストを編集
- エントリーフォーム等のURL：`lib/site.js` を編集
- 色の変更：`app/globals.css` 冒頭の `:root` にあるカラー変数を編集
- 文字サイズ・字間・行高・アイコンの大きさ：同じ `:root` の尺度
  （`--fs-*` / `--ls-*` / `--lh-*` / `--icon-*`）から選ぶ。`13.5px` のような
  小数サイズや、12px未満の文字を直接書かない
- **スケジュール表**：`lib/event.js` の `SCHEDULE`（時刻と内容だけ。日付は
  `EVENT` の日時から自動で付く）
- **受付状況・締切・開催までの日数**（ヒーロー、ENTRY、スマホの固定バー、ヘッダー等）：
  `lib/event.js` の `entryStatus()` / `eventCountdown()`。ビルド時に決まり、毎朝5時(JST)の
  自動ビルドで更新される。**受付が終わると、各所の「エントリー」は自動で
  エントリーリストへの導線に切り替わる**（`lib/site.js` の `entryLink`）

### アイコンを追加する

Material Symbols のアイコンは、使う分だけを配信しています
（全部入りだと約2.3MBあるため）。新しいアイコンを使うときは、
`lib/assets.js` の `MATERIAL_ICONS` にも名前を追加してください。
追加を忘れると、そのアイコンだけ表示されません。

### サイトのレビュー結果

デザイン・パフォーマンス・アクセシビリティの点検結果と、
未対応の改善案は `docs/site-review.md` にまとめてあります。

### スライドショーの切り替え間隔

`components/Hero.jsx` 冒頭の `SLIDE_INTERVAL`（ミリ秒）を変更。
利用者は、右下の一時停止ボタンで止められます（スマホは左右スワイプでも切り替え可）。

### PR（プルリクエスト）の自動チェック

PRを作ると、GitHub Actions が「サイトがビルドできるか」を確認します
（公開はしません。公開は `main` に入ったときだけ）。

## パソコンで動作確認したい場合（任意）

Node.js（LTS版）をインストール後、このフォルダで：

```bash
npm ci          # 初回のみ（package-lock.json どおりに入れる）
npm run dev     # http://localhost:3000 で確認
npm run images  # 写真を差し替えたときだけ
```

※ ローカル環境がなくてもGitHub上の編集だけで運用できます。
