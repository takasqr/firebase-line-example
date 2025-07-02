# LINE Messaging API セットアップガイド

このドキュメントでは、Firebase FunctionsでLINE Messaging API Webhookを設定する手順を説明します。

## 1. LINE Developersでの設定

### 1.1 Messaging APIチャネルの作成

1. [LINE Developers Console](https://developers.line.biz/)にアクセス
2. プロバイダーを選択（または新規作成）
3. 「新規チャネル作成」→「Messaging API」を選択
4. 必要な情報を入力してチャネルを作成

### 1.2 チャネル設定

作成したチャネルの設定画面で以下を確認・設定：

- **Channel ID**: 自動生成される
- **Channel secret**: 「チャネル基本設定」タブで確認
- **Channel access token**: 「Messaging API設定」タブで発行

### 1.3 Webhook設定

「Messaging API設定」タブで：

1. **Webhook URL**を設定:
   ```
   https://api-y7opgn6g6q-uc.a.run.app/webhook
   ```
   または、一般的な形式：
   ```
   https://[REGION]-[PROJECT-ID].cloudfunctions.net/api/webhook
   ```
   
   **注意**: Cloud Runでデプロイされている場合は、URLにご注意ください。

2. **Webhookの利用**を「オン」に設定

3. **Webhook検証**ボタンで接続を確認

## 2. Firebase Functions環境変数の設定

### 2.1 ローカル開発環境

`functions/.env.local`ファイルに以下を追加：

```bash
# 既存のLINE Login設定
LINE_CHANNEL_ID=your_line_login_channel_id
LINE_CHANNEL_SECRET=your_line_login_channel_secret
LINE_CALLBACK_URL=https://your-domain.com

# Messaging API設定を追加（別チャネルのため別の環境変数）
LINE_MESSAGING_CHANNEL_ACCESS_TOKEN=your_messaging_api_channel_access_token
LINE_MESSAGING_CHANNEL_SECRET=your_messaging_api_channel_secret
```

**重要**: LINE LoginとLINE Messaging APIは別々のチャネルです。環境変数名を明確に区別してください。

### 2.2 本番環境

Firebase CLIで環境変数を設定：

```bash
firebase functions:config:set \
  line_messaging.channel_access_token="your_messaging_api_channel_access_token" \
  line_messaging.channel_secret="your_messaging_api_channel_secret"
```

注意: `line.`プレフィックスはLINE Login用に使用しているため、Messaging API用には`line_messaging.`プレフィックスを使用します。

## 3. デプロイ

### 3.1 ビルドとデプロイ

```bash
cd functions
npm run build
firebase deploy --only functions
```

### 3.2 デプロイ確認

デプロイ後、以下のURLでWebhookエンドポイントが利用可能になります：

```
https://api-y7opgn6g6q-uc.a.run.app/webhook
```

または、Firebase Functions URLの場合：
```
https://[REGION]-[PROJECT-ID].cloudfunctions.net/api/webhook
```

## 4. Webhookの動作確認

### 4.1 LINE Developersコンソールから

1. Messaging API設定画面の「Webhook検証」ボタンをクリック
2. 「成功」と表示されれば正常

### 4.2 LINE公式アカウントから

1. QRコードまたはIDで公式アカウントを友だち追加
2. メッセージを送信
3. エコー返信が返ってくれば正常動作

## 5. 実装されている機能

現在の実装では以下の機能をサポート：

- **署名検証**: LINE Platformからのリクエストを検証
- **メッセージイベント**: テキストメッセージの受信と返信
- **フォローイベント**: 友だち追加時のウェルカムメッセージ
- **アンフォローイベント**: 友だち削除の記録

## 6. カスタマイズ

`functions/src/handlers/lineWebhook.ts`を編集して以下をカスタマイズ可能：

- メッセージの応答内容
- 新しいイベントタイプの処理
- 外部APIとの連携
- データベースへの保存

## 7. トラブルシューティング

### エラー: 署名検証失敗

- Channel Secretが正しく設定されているか確認
- 環境変数が正しく読み込まれているか確認

### エラー: メッセージ送信失敗

- Channel Access Tokenが正しく設定されているか確認
- トークンの有効期限を確認（期限切れの場合は再発行）

### ログの確認

```bash
firebase functions:log
```

または、Firebase Consoleの「Functions」→「ログ」から確認

## 8. セキュリティ注意事項

- Channel SecretとAccess Tokenは絶対に公開しない
- 環境変数は`.gitignore`に含まれていることを確認
- 本番環境では`firebase functions:config`を使用