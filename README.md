# Engineer Skill Lab

エンジニア向けスキルを、短いミニアプリで試せる **ポータル + 学習コンテンツ** です。トップではアプリ一覧の検索・フィルタ・並び替えができ、各カードから個別アプリに入れます。

## 利用可能なミニアプリ

| ID | 名前 | 状態 |
|----|------|------|
| `cloud-arch-puzzle` | クラウドアーキテクチャパズル | 利用可能 |

DNS・LB・API・データストアなどの役割コンポーネントを配置し、線でつないで要件に合う構成を組み立てるパズルです。学習シナリオ・YouTube 連携用の JSON は `src/apps/cloud-arch-puzzle/content/` にあります。

その他のアプリ（SQL 道場、API 設計ワークショップなど）は、企画・メタデータとして `src/data.ts` に定義されており、順次実装予定です（`designing` / `planning`）。

## 技術スタック

- **React 19** + **TypeScript** + **Vite 6**
- **Tailwind CSS 4**（`@tailwindcss/vite`）
- **Motion**（アニメーション）
- **Lucide React**（アイコン）

## 前提条件

- [Node.js](https://nodejs.org/)（LTS 推奨）

## セットアップと起動

```bash
npm install
npm run dev
```

開発サーバーは `vite.config` 経由で **ポート 3000**、`host 0.0.0.0` で起動します。ブラウザでは `http://localhost:3000` を開いてください。

## npm スクリプト

| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド（出力は `dist/`） |
| `npm run preview` | ビルド結果のプレビュー |
| `npm run lint` | TypeScript の型チェック（`tsc --noEmit`） |
| `npm run clean` | `dist/` を削除（Unix 系の `rm` 前提。Windows では `dist` フォルダを手動削除でも可） |

## ディレクトリの目安

- `src/App.tsx` — ポータル（一覧・検索・遷移）
- `src/data.ts` — 掲載アプリのメタデータ
- `src/phase1/Phase1AppScreen.tsx` — 各ミニアプリの共通ラッパー（戻るボタンなど）
- `src/apps/cloud-arch-puzzle/` — クラウドアーキテクチャパズル本体
- `public/` — 静的ファイル（Cloudflare Pages 用の `_redirects` など）

## ドキュメント

- [Cloudflare Pages へのデプロイ](docs/CLOUDFLARE_PAGES_DEPLOYMENT.md)
- [ポータル企画・拡張のたたき台](docs/PORTAL_PROPOSAL.md)

## 開発メモ

- **SPA**: 本番はクライアント側で画面切り替えする構成です。サブパス直叩き時のフォールバックは `public/_redirects` で対応しています（詳細は上記デプロイ手順）。
- **HMR**: エージェント編集などでホットリロードを抑えたい場合は、環境変数 `DISABLE_HMR=true` で Vite の HMR をオフにできます（`vite.config.ts` 参照）。

## 参考（元プロジェクト）

元は Google AI Studio からエクスポートされた雛形をベースにしています。AI Studio 上の参照: https://ai.studio/apps/54e59527-9e3f-4a6f-8015-77852abd9682
