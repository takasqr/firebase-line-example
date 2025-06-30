# Firebase × LINE Login Demo

Firebase Authentication と LINE Login を連携したフルスタックデモアプリケーション

**Nuxt 3 フロントエンド + Firebase Functions バックエンド** を使用した、iOS Safari モバイル認証対応のカスタム OAuth2 認証フローのデモンストレーション

## 🌟 主な機能

- **LINE ログイン**: LINE OAuth 2.0 API を使用したカスタム認証フロー
- **Firebase Authentication**: カスタムトークンによる認証
- **アカウントリンク**: 既存ユーザーへの LINE アカウント追加機能
- **モバイル対応**: iOS Safari での安定動作
- **多言語対応**: 日本語・英語バイリンガル対応

## 🏗️ アーキテクチャ

### フロントエンド
- **Nuxt 3** SPA (TypeScript)
- カスタム LINE 認証プロバイダー
- Vue 3 Composables による状態管理

### バックエンド
- **Firebase Functions** (Express.js)
- LINE OAuth コールバック処理
- Firebase Admin SDK によるカスタムトークン生成

## 🚀 セットアップ

### 前提条件
- Node.js 18+
- Firebase CLI
- LINE Developers アカウント
- Firebase プロジェクト

### 環境変数の設定

#### フロントエンド（frontend/.env）

```env
# Firebase設定
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_firebase_app_id

# LINE Login設定
LINE_CHANNEL_ID=your_line_channel_id
LINE_CALLBACK_URL=http://localhost:3000

# API設定
API_BASE_URL=http://localhost:5001/your-project-id/us-central1/api
```

#### バックエンド（functions/.env.local）

```env
# LINE API設定
LINE_CHANNEL_ID=your_line_channel_id
LINE_CHANNEL_SECRET=your_line_channel_secret
LINE_CALLBACK_URL=http://localhost:5001/your-project-id/us-central1/api/line-callback
```

### インストール

1. **依存関係のインストール**

```bash
# フロントエンド
cd frontend
npm install

# バックエンド
cd functions
npm install
```

2. **環境変数ファイルの作成**

```bash
# フロントエンド
cp frontend/.env.local.example frontend/.env

# バックエンド
cp functions/.env.local.example functions/.env.local
```

3. **環境変数の設定**
   - `frontend/.env` に Firebase と LINE の設定を入力
   - `functions/.env.local` に LINE API の設定を入力

## 🛠️ 開発

### 開発サーバーの起動

```bash
# フロントエンド（ポート3000）
cd frontend
npm run dev

# バックエンド（Emulator使用）
cd functions
npm run serve

# 全エミュレーター起動
firebase emulators:start
```

### テスト実行

```bash
# バックエンドテスト
cd functions
npm test

# フロントエンドテスト
cd frontend
npm test
```

### Lint・コード品質チェック

```bash
# バックエンド
cd functions
npm run lint
npm run lint:fix

# フロントエンド
cd frontend
npm run lint
npm run lint:fix
```

## 🚀 デプロイ

### 本番環境へのデプロイ

```bash
# ビルド＆デプロイ
firebase deploy

# Functions のみデプロイ
firebase deploy --only functions

# Hosting のみデプロイ
firebase deploy --only hosting
```

## 📖 重要なファイル

| ファイル | 説明 |
|---------|------|
| `frontend/auth/lineAuthProvider.ts` | カスタム LINE 認証プロバイダー |
| `frontend/composables/useAuth.ts` | 認証状態管理 Composable |
| `functions/src/handlers/lineCallback.ts` | LINE OAuth コールバック処理 |
| `functions/src/index.ts` | Functions エントリーポイント |
| `firebase.json` | Firebase プロジェクト設定 |

## 🔒 セキュリティ

- **CSRF 対策**: state パラメータによる検証
- **環境変数**: 機密情報の適切な管理
- **CORS 設定**: API アクセス制限
- **Firebase Rules**: 認証済みユーザーのみアクセス可能

## 📱 対応環境

- **iOS Safari**: ✅ (主要対応環境)
- **Android Chrome**: ✅
- **PC ブラウザ**: ✅ (Chrome, Firefox, Safari, Edge)

## 🐛 トラブルシューティング

### よくある問題

1. **LINE ログインが失敗する**
   - LINE Developers での callback URL 設定を確認
   - 環境変数の設定を確認

2. **Firebase Authentication エラー**
   - Firebase プロジェクト設定を確認
   - カスタムトークンの生成処理を確認

3. **CORS エラー**
   - API の CORS 設定を確認
   - フロントエンドの API_BASE_URL を確認

## 📚 参考資料

- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [LINE Login API](https://developers.line.biz/ja/docs/line-login/)
- [Nuxt 3 Documentation](https://nuxt.com/)

## 📄 ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。