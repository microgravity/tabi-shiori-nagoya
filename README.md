# なごや・ぎふ たびのしおり

21〜23日の旅程、Google マップの移動区間リンク、ひらがな練習、JSONによる端末間の記録引き継ぎを備えた静的アプリです。

## GitHub Pages

1. 公開先の**非公開**リポジトリへ、このプロジェクトの `dist/` と `.github/workflows/pages.yml` を配置します。既存のアプリのリポジトリは変更しません。
2. リポジトリの Settings → Pages → Source を **GitHub Actions** にします。
3. `main` への push、または Actions → Publish GitHub Pages → Run workflow で公開します。
4. Actions が返した Pages URL をスマホ・iPadで開きます。

`dist/` が公開対象です。ビルド・npm install・APIキーは不要です。相対パスのため `/<repository>/` 配下にも対応します。`.openai/` は現在の試作環境の管理情報で、GitHub Pagesに移す必要はありません。

非公開リポジトリからPagesを利用するには、個人ではGitHub Pro、組織ではGitHub Team等の対応プランが必要です。通常のGitHub Pagesサイトは、元リポジトリが非公開でもインターネットに公開されます。

`<meta name="robots" content="noindex">` を設定しています。これは検索エンジンにインデックス除外を依頼する指定で、閲覧制限ではありません。robots.txtでクロールを禁止するとnoindexを読めなくなるため、禁止するrobots.txtは追加していません。

公式資料：
- https://docs.github.com/pages/quickstart
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- https://developers.google.com/search/docs/crawling-indexing/block-indexing

## 旅程と地図

- 21日：リニア・鉄道館 → 岐阜城スタンプ（金華山ロープウェー山頂駅）→ 岐阜泊
- 22日：名古屋城 → 犬山城 → 犬山泊
- 23日：レゴランド → 東京へ帰宅

21日の訪問順・品川発着・移動路線は仮設定です。列車時刻・ホテル名・ホテルへの経路は未設定です。

各日の「Google マップで みちのりを みる」から、移動区間ごとの電車・バス／徒歩の経路検索を開きます。選択中の場所から次の場所へのリンクも表示します。ロープウェー区間は到着駅の場所を表示し、徒歩の山道を代わりに案内しません。Google マップの候補は出発日時や運行状況により変わるため、必要に応じて出発日時を指定してください。

旅程データは `dist/trip.js`、場所検索語とリンク生成は `dist/maps.js` に分けています。ホテル確定時はホテルのstopに `mapQuery`（施設名と所在地）を追加し、前後の `ride` と最寄り駅を更新します。経路を追加する際は原則stop.idを保持し、到着済み記録との対応を守ります。

## スマホ・iPad間の記録移行

「おうちのひと」からJSONを書き出し、AirDropや「ファイル」アプリで渡して、受け取った端末で読み込みます。合算または置き換えを選べます。自動同期・ログイン・外部サーバーへの記録送信は実装していません。JSONの旅程一覧は参照用であり、読み込み対象は同一旅程の進捗記録です。

## 素材

写真：Base64 / Arad、CC BY-SA 3.0（表示範囲を調整）。
https://commons.wikimedia.org/wiki/File:Nagoya_Castle(Larger).jpg

文字：既存のroutemap-kana収録のstrokesvg / Klee One。ライセンスは `dist/glyphs/LICENSE.txt`。
