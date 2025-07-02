/**
 * Firebase Functions のエントリーポイント
 * Firebase Functions のエントリーポイントとなるファイルです。
 */
import { onRequest, onCall } from "firebase-functions/v2/https";
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

// メッセージハンドラーのインポート
// Import message handler
import { onMessageCreate, onMessageUpdate } from "./handlers/messageHandler";

// 型定義のインポート
// Import type definitions
import { SendMessageRequest } from "./types";
import { Timestamp, getFirestore, FieldValue } from "firebase-admin/firestore";

// ルーティングの設定
// Configure routing
app.post("/line-callback", lineCallbackHandler);

// LINE Messaging API Webhook エンドポイント
// LINE Messaging API Webhook endpoint
app.post("/webhook", lineWebhookHandler);

// メッセージ送信API
// Send message API
app.post(
  "/send-message",
  async (req: express.Request, res: express.Response) => {
    try {
      const requestData: SendMessageRequest = req.body;

      // バリデーション
      if (!requestData.content || !requestData.target) {
        return res.status(400).json({
          error: "Content and target are required",
        });
      }

      // メッセージドキュメントを作成
      const messageDoc: any = {
        content: requestData.content,
        target: requestData.target,
        status: "pending",
        createdBy: "system", // TODO: 認証実装後にreq.user.uidを使用
      };

      // scheduledAtが指定されている場合のみ追加
      if (requestData.scheduledAt) {
        messageDoc.scheduledAt = Timestamp.fromDate(new Date(requestData.scheduledAt));
      }

      const db = getFirestore();
      const docRef = await db.collection("messages").add({
        ...messageDoc,
        createdAt: FieldValue.serverTimestamp(),
      });

      console.log(
        `メッセージドキュメント作成 / Message document created: ${docRef.id}`,
      );

      return res.json({
        messageId: docRef.id,
        status: "queued",
      });
    } catch (error) {
      console.error(
        "メッセージ送信API エラー / Send message API error:",
        error,
      );
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ユーザー一覧取得API
// Get users API
app.get("/users", async (req: express.Request, res: express.Response) => {
  try {
    const db = getFirestore();
    const snapshot = await db
      .collection("users")
      .where("isActive", "==", true)
      .orderBy("followedAt", "desc")
      .get();

    const users = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      followedAt: doc.data().followedAt?.toDate?.()?.toISOString(),
      lastMessageAt: doc.data().lastMessageAt?.toDate?.()?.toISOString(),
    }));

    return res.json({ users, count: users.length });
  } catch (error) {
    console.error("ユーザー一覧取得API エラー / Get users API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// メッセージ履歴取得API
// Get message history API
app.get("/messages", async (req: express.Request, res: express.Response) => {
  try {
    const db = getFirestore();
    const limit = parseInt(req.query.limit as string) || 50;

    const snapshot = await db
      .collection("messages")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
      processedAt: doc.data().processedAt?.toDate?.()?.toISOString(),
      scheduledAt: doc.data().scheduledAt?.toDate?.()?.toISOString(),
    }));

    return res.json({ messages, count: messages.length });
  } catch (error) {
    console.error(
      "メッセージ履歴取得API エラー / Get message history API error:",
      error,
    );
    return res.status(500).json({ error: "Internal server error" });
  }
});

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
export const api = onRequest(
  {
    timeoutSeconds: 540,
    memory: "1GiB",
    cors: true,
  },
  app,
);

// Firestoreトリガー関数のエクスポート
// Export Firestore trigger functions
export { onMessageCreate, onMessageUpdate };

// スケジュール済みメッセージ処理関数（手動トリガー用）
// Scheduled message processing function (for manual trigger)
export const processScheduledMessages = onCall(
  {
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async () => {
    console.log(
      "スケジュール済みメッセージ処理開始 / Starting scheduled message processing",
    );

    try {
      const db = getFirestore();
      const now = Timestamp.now();

      // 処理対象のスケジュール済みメッセージを取得
      const snapshot = await db
        .collection("messages")
        .where("status", "==", "pending")
        .where("scheduledAt", "<=", now)
        .limit(10) // 一度に処理する件数を制限
        .get();

      if (snapshot.empty) {
        console.log(
          "処理対象のスケジュール済みメッセージなし / No scheduled messages to process",
        );
        return null;
      }

      console.log(
        `処理対象メッセージ数 / Messages to process: ${snapshot.docs.length}`,
      );

      // 各メッセージを並列処理
      const promises = snapshot.docs.map(async (doc) => {
        try {
          // ステータスをprocessingに更新して処理開始をマーク
          await doc.ref.update({
            status: "processing",
            processedAt: FieldValue.serverTimestamp(),
          });

          console.log(
            `スケジュール済みメッセージ処理開始 / Processing scheduled message: ${doc.id}`,
          );
        } catch (error) {
          console.error(
            `スケジュール済みメッセージ処理エラー / Error processing scheduled message ${doc.id}:`,
            error,
          );
        }
      });

      await Promise.all(promises);

      console.log(
        `スケジュール済みメッセージ処理完了 / Completed processing ${snapshot.docs.length} scheduled messages`,
      );
      return null;
    } catch (error) {
      console.error(
        "スケジュール済みメッセージ処理でエラー発生 / Error in scheduled message processing:",
        error,
      );
      return null;
    }
  },
);
