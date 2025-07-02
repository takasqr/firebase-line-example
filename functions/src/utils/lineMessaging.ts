/**
 * LINE Messaging API ユーティリティ
 * LINE Messaging API utilities
 */
import axios from "axios";
import { getFirestore } from "firebase-admin/firestore";
import {
  LineMessage,
  MessageTarget,
  UserDocument,
  SendResult,
  BatchSendResult,
} from "../types";

// LINE API設定
const LINE_PUSH_API_URL = "https://api.line.me/v2/bot/message/push";
const LINE_MESSAGING_CHANNEL_ACCESS_TOKEN =
  process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN || "";

/**
 * 単一ユーザーにPushメッセージを送信
 * Send push message to a single user
 */
export const pushMessage = async (
  userId: string,
  messages: any[],
): Promise<SendResult> => {
  if (!LINE_MESSAGING_CHANNEL_ACCESS_TOKEN) {
    console.error("LINE_MESSAGING_CHANNEL_ACCESS_TOKEN is not configured");
    return {
      success: false,
      userId,
      error: "LINE_MESSAGING_CHANNEL_ACCESS_TOKEN is not configured",
    };
  }

  try {
    const response = await axios.post(
      LINE_PUSH_API_URL,
      {
        to: userId,
        messages,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LINE_MESSAGING_CHANNEL_ACCESS_TOKEN}`,
        },
      },
    );

    console.log(
      `Pushメッセージ送信成功 / Push message sent successfully to ${userId}:`,
      response.data,
    );

    return {
      success: true,
      userId,
    };
  } catch (error) {
    console.error(
      `Pushメッセージ送信エラー / Push message sending error to ${userId}:`,
      error,
    );

    let errorMessage = "Unknown error";
    if (axios.isAxiosError(error) && error.response) {
      console.error("エラー詳細 / Error details:", {
        status: error.response.status,
        data: error.response.data,
      });
      errorMessage = `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      userId,
      error: errorMessage,
    };
  }
};

/**
 * 送信対象に基づいてユーザーリストを取得
 * Get user list based on message target
 */
export const getTargetUsers = async (
  target: MessageTarget,
): Promise<(UserDocument & { id: string })[]> => {
  const db = getFirestore();

  try {
    switch (target.type) {
      case "all": {
        // 全ての有効なユーザーを取得
        const snapshot = await db
          .collection("users")
          .where("isActive", "==", true)
          .get();

        return snapshot.docs.map((doc) => ({
          ...(doc.data() as UserDocument),
          id: doc.id,
        }));
      }

      case "single": {
        if (!target.userIds || target.userIds.length !== 1) {
          throw new Error("Single target requires exactly one userId");
        }

        const doc = await db.collection("users").doc(target.userIds[0]).get();
        if (!doc.exists) {
          throw new Error(`User ${target.userIds[0]} not found`);
        }

        const userData = doc.data() as UserDocument;
        if (!userData.isActive) {
          throw new Error(`User ${target.userIds[0]} is not active`);
        }

        return [{ ...userData, id: doc.id }] as (UserDocument & {
          id: string;
        })[];
      }

      case "list": {
        if (!target.userIds || target.userIds.length === 0) {
          throw new Error("List target requires at least one userId");
        }

        const users = [];

        // バッチでユーザー情報を取得（Firestoreの制限により10件ずつ）
        for (let i = 0; i < target.userIds.length; i += 10) {
          const batch = target.userIds.slice(i, i + 10);
          const snapshot = await db
            .collection("users")
            .where(
              "__name__",
              "in",
              batch.map((id) => db.collection("users").doc(id)),
            )
            .where("isActive", "==", true)
            .get();

          const batchUsers = snapshot.docs.map((doc) => ({
            ...(doc.data() as UserDocument),
            id: doc.id,
          }));

          users.push(...batchUsers);
        }

        return users;
      }

      default:
        throw new Error(`Unsupported target type: ${target.type}`);
    }
  } catch (error) {
    console.error("ユーザー取得エラー / Error getting target users:", error);
    throw error;
  }
};

/**
 * LINEメッセージオブジェクトをLINE API形式に変換
 * Convert LineMessage to LINE API format
 */
export const formatLineMessage = (content: LineMessage): any[] => {
  switch (content.type) {
    case "text":
      if (!content.text) {
        throw new Error("Text message requires text content");
      }
      return [{ type: "text", text: content.text }];

    case "image":
      if (!content.imageUrl) {
        throw new Error("Image message requires imageUrl");
      }
      return [
        {
          type: "image",
          originalContentUrl: content.imageUrl,
          previewImageUrl: content.imageUrl,
        },
      ];

    case "template":
      if (!content.template) {
        throw new Error("Template message requires template content");
      }
      return [{ type: "template", template: content.template }];

    default:
      throw new Error(`Unsupported message type: ${content.type}`);
  }
};

/**
 * 複数ユーザーにバッチでメッセージを送信
 * Send messages to multiple users in batch
 */
export const sendBatchMessages = async (
  users: (UserDocument & { id: string })[],
  content: LineMessage,
): Promise<BatchSendResult> => {
  console.log(
    `バッチメッセージ送信開始 / Starting batch message sending to ${users.length} users`,
  );

  try {
    const messages = formatLineMessage(content);
    const results: SendResult[] = [];

    // 並列送信（同時実行数を制限）
    const BATCH_SIZE = 5;
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map((user) =>
        pushMessage(user.lineUserId, messages),
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // API制限を考慮して少し待機
      if (i + BATCH_SIZE < users.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failedUserIds = results
      .filter((r) => !r.success)
      .map((r) => r.userId);

    console.log(
      `バッチメッセージ送信完了 / Batch message sending completed: ${successCount}/${users.length} successful`,
    );

    return {
      allSuccess: successCount === users.length,
      successCount,
      failedUserIds,
      error:
        failedUserIds.length > 0
          ? `${failedUserIds.length} users failed`
          : undefined,
    };
  } catch (error) {
    console.error(
      "バッチメッセージ送信エラー / Batch message sending error:",
      error,
    );

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      allSuccess: false,
      successCount: 0,
      failedUserIds: users.map((u) => u.lineUserId),
      error: errorMessage,
    };
  }
};
