/**
 * LINE OAuth コールバックハンドラー
 * LINE OAuth 2.0 フローのコールバック処理を行うハンドラーです。
 */
import axios from "axios";
import { Request, Response } from "express";

// LINE API の設定
// LINE API configuration
const LINE_TOKEN_API = "https://api.line.me/oauth2/v2.1/token";
const LINE_PROFILE_API = "https://api.line.me/v2/profile";

// 環境変数から LINE の設定を取得
// Get LINE configuration from environment variables
const getLineConfig = () => {
  try {
    // Firebase Functions v2では、環境変数は process.env から直接取得する
    // In Firebase Functions v2, environment variables are retrieved directly from process.env
    if (process.env.FIREBASE_CONFIG) {
      try {
        // FIREBASE_CONFIGをログに出力（デバッグ用）
        // Log FIREBASE_CONFIG for debugging
        console.log(
          "FIREBASE_CONFIG available:",
          !!process.env.FIREBASE_CONFIG,
        );
      } catch (e) {
        console.error("Error with FIREBASE_CONFIG:", e);
      }
    }

    // 環境変数から直接設定を取得
    // Get configuration directly from environment variables
    const config = {
      channel_id: process.env.LINE_CHANNEL_ID,
      channel_secret: process.env.LINE_CHANNEL_SECRET,
      callback_url: process.env.LINE_CALLBACK_URL,
    };

    // 環境変数が設定されていない場合はエラーを投げる
    // Throw an error if environment variables are not set
    if (!config.channel_id) {
      throw new Error(
        "LINE_CHANNEL_ID is not configured in environment variables",
      );
    }
    if (!config.channel_secret) {
      throw new Error(
        "LINE_CHANNEL_SECRET is not configured in environment variables",
      );
    }
    if (!config.callback_url) {
      throw new Error(
        "LINE_CALLBACK_URL is not configured in environment variables",
      );
    }

    if (!config.channel_id || !config.channel_secret || !config.callback_url) {
      throw new Error("LINE configuration is missing");
    }

    return config;
  } catch (error) {
    console.error("Failed to get LINE configuration:", error);
    throw new Error("LINE configuration is missing");
  }
};

/**
 * LINE OAuth コールバックハンドラー
 * LINE OAuth 2.0 フローのコールバック処理を行います。
 *
 * LINE OAuth callback handler
 * Handle LINE OAuth 2.0 flow callback.
 */
export const lineCallbackHandler = async (req: Request, res: Response) => {
  try {
    // リクエストボディ全体をログに出力
    // Log the entire request body
    console.log(
      "LINE Callback リクエストボディ / LINE Callback request body:",
      req.body,
    );

    // 環境変数の値をログに出力
    // Log environment variable values
    console.log("環境変数 / Environment variables:", {
      LINE_CHANNEL_ID: process.env.LINE_CHANNEL_ID,
      LINE_CALLBACK_URL: process.env.LINE_CALLBACK_URL,
      // シークレットは一部のみ表示
      // Show only part of the secret
      LINE_CHANNEL_SECRET_PARTIAL: process.env.LINE_CHANNEL_SECRET
        ? `${process.env.LINE_CHANNEL_SECRET.substring(0, 4)}...`
        : undefined,
    });
    const { code, state } = req.body as { code?: string; state?: string };

    if (!code) {
      return res.status(400).json({
        error: "認可コードがありません / Authorization code is missing",
      });
    }

    // stateパラメータのログ出力（オプショナル）
    // Log state parameter (optional)
    if (state) {
      console.log("受信したstate / Received state:", state);
    }

    // LINE の設定を取得
    // Get LINE configuration
    const lineConfig = getLineConfig();

    // デバッグ用ログ
    // Debug log
    console.log("LINE設定 / LINE configuration:", {
      channel_id: lineConfig.channel_id,
      callback_url: lineConfig.callback_url,
      // シークレットはログに出力しない
      // Do not output secret to log
      has_channel_secret: !!lineConfig.channel_secret,
    });

    // アクセストークンの取得
    // Get access token
    // リダイレクトURLをログに出力
    // Log redirect URI
    console.log("リダイレクトURL / Redirect URI:", lineConfig.callback_url);

    const tokenResponse = await axios.post(
      LINE_TOKEN_API,
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: lineConfig.callback_url as string,
        client_id: lineConfig.channel_id as string,
        client_secret: lineConfig.channel_secret as string,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    // トークンレスポンスをログに出力
    // Log token response
    console.log(
      "LINE Token APIレスポンス / LINE Token API response:",
      tokenResponse.data,
    );

    const { access_token } = tokenResponse.data;

    if (!access_token) {
      return res.status(400).json({
        error:
          "アクセストークンの取得に失敗しました / Failed to get access token",
      });
    }

    // ユーザープロフィールの取得
    // Get user profile
    const profileResponse = await axios.get(LINE_PROFILE_API, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    // プロフィールレスポンスをログに出力
    // Log profile response
    console.log(
      "LINE Profile APIレスポンス / LINE Profile API response:",
      profileResponse.data,
    );

    const { userId, displayName, pictureUrl } = profileResponse.data;

    if (!userId) {
      return res.status(400).json({
        error:
          "ユーザー情報の取得に失敗しました / Failed to get user information",
      });
    }

    // ユーザー情報の返却
    // Return user information
    // 注: カスタムトークンの生成は権限の問題で失敗するため、
    // 代わりにユーザー情報を直接返します
    // Note: Custom token generation fails due to permission issues,
    // so we return user information directly instead
    return res.json({
      user: {
        uid: userId,
        displayName,
        photoURL: pictureUrl,
        provider: "line",
        accessToken: access_token,
      },
    });
  } catch (error) {
    // より詳細なエラー情報をログに出力
    // Log more detailed error information
    console.error("LINE OAuth callback error:", error);

    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
      });

      if (axios.isAxiosError(error) && error.response) {
        console.error("Axios error response:", {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
        });
      }
    }

    return res
      .status(500)
      .json({ error: "サーバーエラーが発生しました / Server error occurred" });
  }
};
