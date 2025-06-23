# LTK 特設サイト

このリポジトリは、LTK（League of Legends Tournament in Kumamoto）のイベント情報やランキングを掲載するウェブサイトのソースコードを管理しています。

## サイトURL

- **公開サイト (Firebase Hosting)**: [https://ltksite-4d7be.web.app/](https://ltksite-4d7be.web.app/)
- **旧URL (GitHub Pages - リダイレクト用)**: [https://misraxx.github.io/LTK/index.html](https://misraxx.github.io/LTK/index.html)

## 開発の始め方

### 1. ローカル開発サーバーの起動

このプロジェクトはFirebaseと深く連携しているため、ローカルでの確認にはVS CodeのLive Serverではなく、Firebaseが提供するローカルサーバーを使用します。

ターミナルで以下のコマンドを実行してください。

```bash
firebase serve --only hosting
```

サーバーが起動したら、ブラウザで `http://localhost:5000` を開いてください。
ファイルを編集・保存すると、ブラウザをリロードするだけで変更が反映されます。

### 2. 作業を保存する (Git)

このプロジェクトでは、以下のブランチルールを採用しています。

- `develop` ブランチ: **メインの開発用ブランチです。** 新機能の追加や修正は、必ずこのブランチで行ってください。
- `main` ブランチ: 旧URLからのリダイレクト専用のブランチです。**このブランチは直接編集しないでください。**

作業が一段落したら、以下のコマンドで変更を保存・バックアップしてください。

```bash
# 1. 変更をステージング
git add .

# 2. 変更内容を記録
git commit -m "ここに何を変更したか書く"

# 3. GitHubに送信
git push
```

### 3. 本番サイトに公開する (デプロイ)

開発した内容をインターネット上の本番サイトに反映させるには、デプロイ作業が必要です。
`develop`ブランチで作業していることを確認してから、以下のコマンドを実行してください。

```bash
firebase deploy --only hosting
```

これにより、`https://ltksite-4d7be.web.app/` の内容が更新されます。

## スクリムリザルトへのスコアボード追加手順

1. LoLのスコアボード画像をAI（このチャット）に送信する
2. AIが画像から各プレイヤーのスコア情報をCSV形式で抽出
3. `LTK特設サイト-firebase移行/_unused/スクリムリザルト.txt` の末尾に追記
   - 日付カラムは不要
   - 既存のCSVフォーマットに合わせる
4. 必要に応じてCSVファイルへの変換も可能

※この作業は「スクショ送付＋簡単な指示」だけでAIが対応します。 