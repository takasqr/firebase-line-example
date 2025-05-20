# Firebase × LINE Login Demo

Firebase AuthenticationとLINE Loginを連携したデモアプリケーション

## 環境変数の設定

このプロジェクトを実行するには、以下の環境変数を設定する必要があります。

### フロントエンド（frontend/.env）

```
# LINE認証情報
LINE_CHANNEL_ID=your_line_channel_id
LINE_CALLBACK_URL=your_line_callback_url

# API設定
API_BASE_URL=your_api_base_url
```

### バックエンド（functions/.env.local）

```
# LINE認証情報
LINE_CHANNEL_ID=your_line_channel_id
LINE_CHANNEL_SECRET=your_line_channel_secret
LINE_CALLBACK_URL=your_line_callback_url
```

## 開発環境のセットアップ

1. 必要なパッケージをインストール

```bash
# フロントエンド
cd frontend
npm install

# バックエンド
cd functions
npm install
```

2. 環境変数ファイルを作成
   - `frontend/.env`
   - `functions/.env.local`

3. 開発サーバーを起動

```bash
# フロントエンド
cd frontend
npm run dev

# バックエンド
cd functions
npm run serve
```

## デプロイ

```bash
firebase deploy
```

## 注意事項

- 環境変数ファイル（`.env`と`.env.local`）はGitの追跡対象から除外されています。
- 本番環境では、Firebase Functionsの環境変数を設定してください。

```bash
firebase functions:config:set line.channel_id="your_line_channel_id" line.channel_secret="your_line_channel_secret" line.callback_url="your_line_callback_url"