/**
 * メッセージ送信処理ハンドラー
 * Message sending handler
 *
 * Firestoreのmessagesコレクションのトリガーでメッセージを送信します。
 * Sends messages via Firestore messages collection trigger.
 */
import {
  onDocumentCreated,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";
import type { FirestoreEvent } from "firebase-functions/v2/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { MessageDocument } from "../types";
import { getTargetUsers, sendBatchMessages } from "../utils/lineMessaging";

/**
 * messagesコレクションのドキュメント作成時のトリガー
 * Trigger when a document is created in the messages collection
 */
export const onMessageCreate = onDocumentCreated(
  "messages/{messageId}",
  async (event: FirestoreEvent<any, { messageId: string }>) => {
    const messageData = event.data?.data() as MessageDocument;
    const messageId = event.params.messageId;

    console.log(
      `メッセージ処理開始 / Starting message processing: ${messageId}`,
      messageData,
    );

    try {
      // 1. スケジュール確認
      if (
        messageData.scheduledAt &&
        messageData.scheduledAt.toDate() > new Date()
      ) {
        console.log(
          `スケジュール済みメッセージ / Scheduled message: ${messageId}, scheduled for ${messageData.scheduledAt.toDate()}`,
        );
        // 未来の日時 → スケジューラーが処理するため何もしない
        return;
      }

      // 2. ステータス更新（processing）
      await event.data?.ref.update({
        status: "processing",
        processedAt: FieldValue.serverTimestamp(),
      });

      console.log(
        `メッセージ処理中に更新 / Updated message to processing: ${messageId}`,
      );

      // 3. 送信対象ユーザーを取得
      const targetUsers = await getTargetUsers(messageData.target);

      if (targetUsers.length === 0) {
        console.log(
          `送信対象ユーザーが見つかりません / No target users found: ${messageId}`,
        );

        await event.data?.ref.update({
          status: "completed",
          totalUsers: 0,
          successCount: 0,
          error: "No target users found",
        });
        return;
      }

      console.log(
        `送信対象ユーザー数 / Target users count: ${targetUsers.length}`,
      );

      // 4. バッチ送信
      const results = await sendBatchMessages(targetUsers, messageData.content);

      console.log(`メッセージ送信結果 / Message sending results:`, results);

      // 5. 結果を更新
      const updateData: any = {
        status: results.allSuccess ? "completed" : "failed",
        totalUsers: targetUsers.length,
        successCount: results.successCount,
        failedUserIds: results.failedUserIds,
      };
      
      if (results.error) {
        updateData.error = results.error;
      }
      
      await event.data?.ref.update(updateData);

      console.log(
        `メッセージ処理完了 / Message processing completed: ${messageId}, status: ${results.allSuccess ? "completed" : "failed"}`,
      );
    } catch (error) {
      console.error(
        `メッセージ処理エラー / Message processing error: ${messageId}`,
        error,
      );

      // エラー時もステータスを更新
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await event.data?.ref.update({
        status: "failed",
        error: errorMessage,
        processedAt: FieldValue.serverTimestamp(),
      });
    }
  },
);

/**
 * messagesコレクションのドキュメント更新時のトリガー
 * スケジュール済みメッセージの処理用
 * Trigger when a document is updated in the messages collection
 * For processing scheduled messages
 */
export const onMessageUpdate = onDocumentUpdated(
  "messages/{messageId}",
  async (event: FirestoreEvent<any, { messageId: string }>) => {
    const beforeData = event.data?.before.data() as MessageDocument;
    const afterData = event.data?.after.data() as MessageDocument;
    const messageId = event.params.messageId;

    // スケジュール済みメッセージが処理可能になった場合
    if (
      beforeData.status === "pending" &&
      afterData.status === "pending" &&
      afterData.scheduledAt &&
      afterData.scheduledAt.toDate() <= new Date()
    ) {
      console.log(
        `スケジュール済みメッセージの処理開始 / Starting scheduled message processing: ${messageId}`,
      );

      try {
        // ステータス更新（processing）
        await event.data?.after.ref.update({
          status: "processing",
          processedAt: FieldValue.serverTimestamp(),
        });

        // 送信対象ユーザーを取得
        const targetUsers = await getTargetUsers(afterData.target);

        if (targetUsers.length === 0) {
          await event.data?.after.ref.update({
            status: "completed",
            totalUsers: 0,
            successCount: 0,
            error: "No target users found",
          });
          return;
        }

        // バッチ送信
        const results = await sendBatchMessages(targetUsers, afterData.content);

        // 結果を更新
        const updateData: any = {
          status: results.allSuccess ? "completed" : "failed",
          totalUsers: targetUsers.length,
          successCount: results.successCount,
          failedUserIds: results.failedUserIds,
        };
        
        if (results.error) {
          updateData.error = results.error;
        }
        
        await event.data?.after.ref.update(updateData);

        console.log(
          `スケジュール済みメッセージ処理完了 / Scheduled message processing completed: ${messageId}`,
        );
      } catch (error) {
        console.error(
          `スケジュール済みメッセージ処理エラー / Scheduled message processing error: ${messageId}`,
          error,
        );

        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        await event.data?.after.ref.update({
          status: "failed",
          error: errorMessage,
        });
      }
    }
  },
);
