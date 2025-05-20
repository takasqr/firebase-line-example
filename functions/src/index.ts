/**
 * Firebase Functions のエントリーポイント
 * Firebase Functions のエントリーポイントとなるファイルです。
 */
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";

// 環境変数の読み込み
// Load environment variables
dotenv.config({ path: ".env.local" });

// Firebase Admin SDK の初期化
// Initialize Firebase Admin SDK
admin.initializeApp({
  // デフォルトの認証情報を使用
  // Use default credentials
  credential: admin.credential.applicationDefault(),
});

// Express アプリケーションの作成
// Create Express application
const app = express();

// CORS の設定
// Configure CORS
app.use(cors({ origin: true }));

// LINE OAuth コールバックハンドラーのインポート
// Import LINE OAuth callback handler
import { lineCallbackHandler } from "./handlers/lineCallback";

// ルーティングの設定
// Configure routing
app.post("/line-callback", lineCallbackHandler);

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
        await admin.auth().getUser(uid);
      } catch (error) {
        await admin.auth().createUser({
          uid,
          displayName,
          photoURL,
        });
      }

      // カスタムトークンの生成
      // Generate custom token
      const token = await admin.auth().createCustomToken(uid);

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
