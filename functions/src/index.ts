/**
 * Firebase Functions のエントリーポイント
 * Firebase Functions のエントリーポイントとなるファイルです。
 */
import * as functions from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";

// 環境変数の読み込み
// Load environment variables
dotenv.config({ path: ".env.local" });

// Firebase Admin SDK の初期化
// Initialize Firebase Admin SDK
// 環境に応じて初期化方法を変更
// Change initialization method depending on environment
if (process.env.NODE_ENV === "production") {
  // 本番環境では、プロジェクトIDを明示的に指定
  // In production environment, specify project ID explicitly
  initializeApp({
    projectId: "fb-line-example",
    serviceAccountId:
      "firebase-adminsdk-fbsvc@fb-line-example.iam.gserviceaccount.com",
  });
  console.log("Firebase Admin SDK initialized in production mode");
} else {
  // 開発環境（エミュレーター）では、認証情報なしで初期化
  // In development environment (emulator), initialize without credentials
  initializeApp();
  console.log("Firebase Admin SDK initialized in development mode");
}

// Express アプリケーションの作成
// Create Express application
const app = express();

// CORS の設定
// Configure CORS
app.use(cors({ origin: true }));

// LINE OAuth コールバックハンドラーのインポート
// Import LINE OAuth callback handler
import { lineCallbackHandler } from "./handlers/lineCallback";

// LINE Messaging API Webhookハンドラーのインポート
// Import LINE Messaging API Webhook handler
import { lineWebhookHandler } from "./handlers/lineWebhook";

// ルーティングの設定
// Configure routing
app.post("/line-callback", lineCallbackHandler);

// LINE Messaging API Webhook エンドポイント
// LINE Messaging API Webhook endpoint
app.post("/webhook", lineWebhookHandler);

// カスタムトークン生成API
// Custom token generation API
app.post(
  "/auth/custom-token",
  async (req: express.Request, res: express.Response) => {
    try {
      const { uid, displayName, photoURL } = req.body;

      if (!uid) {
        return res.status(400).json({ error: "UID is required" });
      }

      // ユーザーが存在しない場合は作成
      // Create user if not exists
      try {
        await getAuth().getUser(uid);
      } catch (error) {
        await getAuth().createUser({
          uid,
          displayName,
          photoURL,
        });
      }

      // カスタムトークンの生成
      // Generate custom token
      const token = await getAuth().createCustomToken(uid);

      return res.json({ token });
    } catch (error) {
      console.error("Error generating custom token:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

// API関数のエクスポート
// Export API function
export const api = functions.https.onRequest(app);

// 他の関数をエクスポートする場合はここに追加
// Add other functions to export here
