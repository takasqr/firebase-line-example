# CLAUDE.md

日本語で出力して下さい。

このファイルは、このリポジトリでコードを扱う際にClaude Code (claude.ai/code) にガイダンスを提供します。

## プロジェクト概要

Nuxt 3フロントエンドとFirebase Functionsバックエンドを使用したフルスタックFirebase + LINE Login統合デモ。特にiOS Safariモバイル認証の問題を解決するために設計されたカスタムOAuth2認証フローを実演するアプリケーションです。

## 開発コマンド

### フロントエンド (Nuxt 3 SPA)
```bash
cd frontend
npm run dev          # 開発サーバー起動 (ポート3000)
npm run build        # 本番用ビルド (.output/public/)
npm run generate     # 静的サイト生成 (dist/)
npm run preview      # ビルド結果プレビュー
npm run lint         # ESLint実行
npm run lint:fix     # ESLintエラー修正
npm test             # Vitestテスト実行
```

### バックエンド (Firebase Functions)
```bash
cd functions
npm run build        # TypeScriptコンパイル (lib/)
npm run build:watch  # TypeScriptコンパイル（監視モード）
npm run serve        # Firebaseエミュレーター起動 (ポート5001)
npm run test         # Jestテスト実行
npm run lint         # ESLint実行
npm run lint:fix     # ESLintエラー修正
```

### フルスタック開発
```bash
firebase emulators:start    # 全エミュレーター起動 (functions:5001, hosting:5000, auth:9099)
firebase deploy            # 本番環境デプロイ
firebase deploy --only functions    # Functionsのみデプロイ
firebase deploy --only hosting      # Hostingのみデプロイ
```

## アーキテクチャ

### フロントエンド (`/frontend/`)
- **Nuxt 3** SPA with TypeScript（SSR無効化）
- **Vue 3** コンポーザブルによる認証状態管理 (`composables/useAuth.ts`)
- **カスタムLINEプロバイダー** (`auth/lineAuthProvider.ts`) - Firebase Auth用
- **ページ**: `index.vue` (ログイン), `dashboard.vue` (認証後ダッシュボード)
- **コンポーネント**: `AccountLinking.vue`, `AccountLinkingError.vue` (アカウントリンク機能)
- **プラグイン**: `firebase.client.ts` (Firebase SDK初期化)

### バックエンド (`/functions/`)
- Firebase Functions上の**Express.js**アプリケーション
- **LINE OAuthハンドラー**: `src/handlers/lineCallback.ts` - LINE OAuthコールバック処理
- **LINE Messaging API Webhook**: `src/handlers/lineWebhook.ts` - Webhookイベント処理
- Firebase Admin SDKを使用した**カスタムトークン生成**（カスタムクレーム付き）
- **アカウントリンク機能**: 既存ユーザーへのLINE認証追加サポート
- **Webhook署名検証**: LINE Messaging API用の署名検証機能
- **メッセージ自動返信**: テキストメッセージへのエコー返信とキーワード応答
- クロスオリジンリクエスト用の**CORS設定**
- **環境変数管理**: dotenvによる.env.local読み込み

### 認証フロー
1. フロントエンドがstate/nonce/bot_prompt=aggressiveでLINE OAuthにリダイレクト
2. LINEがコールバックに認証コードを返却（bot_prompt効果で友だち追加画面表示）
3. フロントエンドがURLから認証コードを取得
4. バックエンドにPOSTリクエストでコードとstateを送信
5. バックエンドがコードをアクセストークンに交換し、ユーザープロフィールを取得
6. バックエンドが既存ユーザーチェックとプロバイダー情報を取得
7. バックエンドがFirebaseカスタムトークンを作成（カスタムクレーム付き）
8. フロントエンドがカスタムトークンでFirebase Authenticationにサインイン

### LINE Messaging APIフロー
1. LINEプラットフォームからWebhookイベントを受信（/webhook）
2. 署名検証でリクエストの正当性を確認
3. イベントタイプに応じた処理を実行：
   - **messageイベント**: テキストメッセージのエコー返信・キーワード応答
   - **followイベント**: 友だち追加時のウェルカムメッセージ送信
   - **unfollowイベント**: アンフォロー記録（返信不可）

## 環境変数

### フロントエンド (`frontend/.env`)
```
# Firebase設定
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=

# LINE Login設定
LINE_CHANNEL_ID=
LINE_CALLBACK_URL=

# API設定
API_BASE_URL=
```

### バックエンド (`functions/.env.local`)
```
# LINE Login API設定
LINE_CHANNEL_ID=
LINE_CHANNEL_SECRET=
LINE_CALLBACK_URL=

# LINE Messaging API設定（別チャネル）
LINE_MESSAGING_CHANNEL_ACCESS_TOKEN=
LINE_MESSAGING_CHANNEL_SECRET=
```

## テスト

- **バックエンド**: Firebase Admin SDKとHTTPリクエストの包括的なモッキングを使用したJest
  - テストファイル: `functions/src/handlers/lineCallback.test.ts`
  - 実行コマンド: `cd functions && npm test`
- **フロントエンド**: Vue Test UtilsでVitest
  - 実行コマンド: `cd frontend && npm test`

## 重要なファイル

### 設定ファイル
- `firebase.json` - ホスティング/ファンクション設定を含むFirebaseプロジェクト設定
- `frontend/nuxt.config.ts` - FirebaseとLINE OAuth設定を含むNuxt設定（SSR無効化）
- `functions/src/index.ts` - Expressアプリエントリーポイント（Firebase Admin SDK初期化）

### 認証関連
- `functions/src/handlers/lineCallback.ts` - コアLINE OAuthロジック（アカウントリンク対応）
- `frontend/composables/useAuth.ts` - 認証状態管理（リンク機能含む）
- `frontend/auth/lineAuthProvider.ts` - カスタムLINE認証プロバイダー（bot_prompt対応）

### Messaging API関連
- `functions/src/handlers/lineWebhook.ts` - LINE Messaging API Webhook処理
- `LINE_MESSAGING_API_SETUP.md` - Messaging APIセットアップガイド

### エンドポイント
- `POST /line-callback` - LINE OAuthコールバック処理
- `POST /webhook` - LINE Messaging API Webhook
- `POST /auth/custom-token` - カスタムトークン生成API