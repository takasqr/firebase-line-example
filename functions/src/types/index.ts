/**
 * 型定義ファイル
 * Type definitions
 */
import { Timestamp } from "firebase-admin/firestore";

// LINEメッセージの型定義
export interface LineMessage {
  type: "text" | "image" | "template";
  text?: string;
  imageUrl?: string;
  template?: any;
}

// メッセージ送信対象の型定義
export interface MessageTarget {
  type: "all" | "single" | "list";
  userIds?: string[];
}

// Firestoreメッセージドキュメントの型定義
export interface MessageDocument {
  content: LineMessage;
  target: MessageTarget;
  scheduledAt?: Timestamp;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: Timestamp;
  processedAt?: Timestamp;
  error?: string;
  failedUserIds?: string[];
  createdBy: string;
  totalUsers?: number;
  successCount?: number;
}

// Firestoreユーザードキュメントの型定義
export interface UserDocument {
  lineUserId: string;
  displayName: string;
  profilePictureUrl?: string;
  followedAt: Timestamp;
  isActive: boolean;
  lastMessageAt?: Timestamp;
}

// メッセージ送信APIのリクエスト型
export interface SendMessageRequest {
  content: LineMessage;
  target: MessageTarget;
  scheduledAt?: string; // ISO datetime string
}

// メッセージ送信結果の型定義
export interface SendResult {
  success: boolean;
  userId: string;
  error?: string;
}

// バッチ送信結果の型定義
export interface BatchSendResult {
  allSuccess: boolean;
  successCount: number;
  failedUserIds: string[];
  error?: string;
}
