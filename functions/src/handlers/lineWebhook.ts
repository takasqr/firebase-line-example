/**
 * LINE Messaging API Webhook ハンドラー
 * LINE Messaging API Webhook handler
 *
 * LINEからのWebhookイベントを処理します。
 * Processes webhook events from LINE.
 */
import { Request, Response } from "express";
import * as crypto from "crypto";
import axios from "axios";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { UserDocument } from "../types";

// LINE API設定
// LINE API configuration
const LINE_MESSAGING_API_URL = "https://api.line.me/v2/bot/message/reply";
const LINE_MESSAGING_CHANNEL_ACCESS_TOKEN =
  process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN || "";
const LINE_MESSAGING_CHANNEL_SECRET =
  process.env.LINE_MESSAGING_CHANNEL_SECRET || "";

/**
 * Webhook署名を検証する
 * Verify webhook signature
 */
const verifySignature = (body: string, signature: string): boolean => {
  if (!LINE_MESSAGING_CHANNEL_SECRET) {
    console.error("LINE_MESSAGING_CHANNEL_SECRET is not configured");
    return false;
  }

  const hash = crypto
    .createHmac("SHA256", LINE_MESSAGING_CHANNEL_SECRET)
    .update(body)
    .digest("base64");

  return hash === signature;
};

/**
 * テキストメッセージに返信する
 * Reply to text message
 */
const replyMessage = async (replyToken: string, messages: any[]) => {
  if (!LINE_MESSAGING_CHANNEL_ACCESS_TOKEN) {
    console.error("LINE_MESSAGING_CHANNEL_ACCESS_TOKEN is not configured");
    return;
  }

  try {
    const response = await axios.post(
      LINE_MESSAGING_API_URL,
      {
        replyToken,
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
      "メッセージ送信成功 / Message sent successfully:",
      response.data,
    );
  } catch (error) {
    console.error("メッセージ送信エラー / Message sending error:", error);
    if (axios.isAxiosError(error) && error.response) {
      console.error("エラー詳細 / Error details:", {
        status: error.response.status,
        data: error.response.data,
      });
    }
  }
};

/**
 * メッセージイベントを処理する
 * Process message event
 */
const handleMessageEvent = async (event: any) => {
  console.log("メッセージイベント / Message event:", event);

  // テキストメッセージの場合のみ処理
  // Process only text messages
  if (event.type !== "message" || event.message.type !== "text") {
    return;
  }

  const userMessage = event.message.text;
  const replyToken = event.replyToken;
  const userId = event.source.userId;

  console.log(
    `ユーザー ${userId} からのメッセージ / Message from user ${userId}:`,
    userMessage,
  );

  // 簡単なエコー返信
  // Simple echo reply
  const replyMessages = [
    {
      type: "text",
      text: `あなたのメッセージ「${userMessage}」を受け取りました！`,
    },
  ];

  // 特定のキーワードに対する返信
  // Reply to specific keywords
  if (
    userMessage.toLowerCase().includes("こんにちは") ||
    userMessage.toLowerCase().includes("hello")
  ) {
    replyMessages.push({
      type: "text",
      text: "こんにちは！お元気ですか？ / Hello! How are you?",
    });
  }

  if (
    userMessage.toLowerCase().includes("help") ||
    userMessage.toLowerCase().includes("ヘルプ")
  ) {
    replyMessages.push({
      type: "text",
      text: "使い方:\n- 「こんにちは」でご挨拶\n- 「ヘルプ」でこのメッセージを表示\n\nUsage:\n- Say 'Hello' for greeting\n- Say 'Help' to show this message",
    });
  }

  await replyMessage(replyToken, replyMessages);
};

/**
 * ユーザーをFirestoreに保存する
 * Save user to Firestore
 */
const saveUserToFirestore = async (userId: string) => {
  const db = getFirestore();

  try {
    // LINEプロフィール情報を取得
    const profileResponse = await axios.get(
      `https://api.line.me/v2/bot/profile/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${LINE_MESSAGING_CHANNEL_ACCESS_TOKEN}`,
        },
      },
    );

    const profile = profileResponse.data;

    const userDoc: UserDocument = {
      lineUserId: userId,
      displayName: profile.displayName || "Unknown User",
      profilePictureUrl: profile.pictureUrl,
      followedAt: Timestamp.now(),
      isActive: true,
    };

    // ユーザードキュメントを作成または更新
    await db.collection("users").doc(userId).set(userDoc, { merge: true });

    console.log(
      `ユーザー ${userId} をFirestoreに保存しました / Saved user ${userId} to Firestore`,
    );
  } catch (error) {
    console.error(
      `ユーザー ${userId} の保存に失敗しました / Failed to save user ${userId}:`,
      error,
    );
  }
};

/**
 * フォローイベントを処理する
 * Process follow event
 */
const handleFollowEvent = async (event: any) => {
  console.log("フォローイベント / Follow event:", event);

  const replyToken = event.replyToken;
  const userId = event.source.userId;

  console.log(
    `新しいユーザー ${userId} がフォローしました / New user ${userId} followed`,
  );

  // ユーザー情報をFirestoreに保存
  await saveUserToFirestore(userId);

  const welcomeMessages = [
    {
      type: "text",
      text: "友だち追加ありがとうございます！🎉\nThank you for adding me as a friend! 🎉",
    },
    {
      type: "text",
      text: "このBotはFirebase FunctionsとLINE Messaging APIの統合デモです。\nThis Bot is a demo of Firebase Functions and LINE Messaging API integration.\n\n「ヘルプ」と送信すると使い方を表示します。\nSend 'Help' to see how to use.",
    },
  ];

  await replyMessage(replyToken, welcomeMessages);
};

/**
 * アンフォローイベントを処理する
 * Process unfollow event
 */
const handleUnfollowEvent = async (event: any) => {
  console.log("アンフォローイベント / Unfollow event:", event);

  const userId = event.source.userId;
  console.log(
    `ユーザー ${userId} がアンフォローしました / User ${userId} unfollowed`,
  );

  // ユーザーを非アクティブに更新
  const db = getFirestore();
  try {
    await db.collection("users").doc(userId).update({
      isActive: false,
    });
    console.log(
      `ユーザー ${userId} を非アクティブに更新しました / Updated user ${userId} to inactive`,
    );
  } catch (error) {
    console.error(
      `ユーザー ${userId} の非アクティブ更新に失敗しました / Failed to update user ${userId} to inactive:`,
      error,
    );
  }

  // アンフォロー時はreplyTokenがないため、返信はできません
  // Cannot reply when unfollowed because there is no replyToken
};

/**
 * LINE Messaging API Webhook ハンドラー
 * LINE Messaging API Webhook handler
 */
export const lineWebhookHandler = async (req: Request, res: Response) => {
  try {
    // 署名検証
    // Verify signature
    const signature = req.headers["x-line-signature"] as string;
    const body = JSON.stringify(req.body);

    if (!signature) {
      console.error("署名がありません / No signature");
      return res.status(401).json({ error: "No signature" });
    }

    if (!verifySignature(body, signature)) {
      console.error("署名検証失敗 / Signature verification failed");
      return res.status(401).json({ error: "Invalid signature" });
    }

    console.log("Webhookリクエスト受信 / Webhook request received:", req.body);

    // イベントを処理
    // Process events
    const { events } = req.body;

    if (!events || !Array.isArray(events)) {
      console.log("イベントがありません / No events");
      return res.status(200).json({ status: "OK" });
    }

    // 各イベントを非同期で処理
    // Process each event asynchronously
    await Promise.all(
      events.map(async (event: any) => {
        try {
          switch (event.type) {
            case "message":
              await handleMessageEvent(event);
              break;
            case "follow":
              await handleFollowEvent(event);
              break;
            case "unfollow":
              await handleUnfollowEvent(event);
              break;
            default:
              console.log(
                `未対応のイベントタイプ / Unsupported event type: ${event.type}`,
              );
          }
        } catch (error) {
          console.error(`イベント処理エラー / Event processing error:`, error);
        }
      }),
    );

    // LINEプラットフォームに200 OKを返す
    // Return 200 OK to LINE platform
    return res.status(200).json({ status: "OK" });
  } catch (error) {
    console.error("Webhookハンドラーエラー / Webhook handler error:", error);

    // エラーが発生しても200を返す（LINEプラットフォームの要件）
    // Return 200 even if error occurs (LINE platform requirement)
    return res.status(200).json({ status: "Error occurred but returning 200" });
  }
};
