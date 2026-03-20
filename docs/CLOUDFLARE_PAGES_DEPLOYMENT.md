# Cloudflare Pages デプロイ手順

このプロジェクトは `vite build` で `dist/` を生成する静的サイトとして動作します（Cloudflare Pages: SPA/静的配信）。

## 事前確認

1. Node.js がインストールされていること
2. リポジトリ直下でローカルビルドが通ること
   - `npm install`
   - `npm run build`
   - `dist/` が作成されること

## SPA ルーティング対策（必要な作業）

この手順書で Cloudflare Pages に「クライアントサイドで遷移する画面（SPA）」としてデプロイする場合、
直叩き（例: `/some/path`）で `index.html` に戻す必要があります。

そのために `_redirects` を `public/_redirects` に追加済みです。

## Cloudflare Pages 側の設定

1. Cloudflare ダッシュボードを開く
2. `Pages` -> `Create a project` を選択
3. Git 接続
   - 対象リポジトリを選びます
4. フレームワーク/ビルド設定
   - Framework preset: `Vite`（選べない場合は `Custom` で同等設定）
   - Build command: `npm run build`
   - Build output directory: `dist`

## デプロイ

1. `Deploy` を押す
2. デプロイ結果の URL で動作確認する

## 動作確認（推奨）

1. ルート `/` を開く
2. アプリ内の操作（検索、カード選択、など）を確認する
3. もし将来 React Router 等でサブパスを使う場合、存在しない直叩きがあっても `index.html` に戻ることを確認する

