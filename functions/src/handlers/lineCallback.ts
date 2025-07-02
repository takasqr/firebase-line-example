/**
 * LINE OAuth コールバックハンドラー
 * LINE OAuth 2.0 フローのコールバック処理を行うハンドラーです。
 */
import axios from "axios";
import { Request, Response } from "express";
import { getAuth } from "firebase-admin/auth";

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
    const { code, state, authAction, nonce, hashedNonce } = req.body as {
      code?: string;
      state?: string;
      authAction?: string; // 'login' または 'link'
      nonce?: string; // OpenID Connect raw nonce
      hashedNonce?: string; // SHA256 hashed nonce
    };

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

    // nonceパラメータのログ出力とバリデーション
    // Log nonce parameter and validation
    if (nonce && hashedNonce) {
      console.log(
        "受信したrawNonce / Received rawNonce:",
        nonce.substring(0, 8) + "...",
      );
      console.log(
        "受信したhashedNonce / Received hashedNonce:",
        hashedNonce.substring(0, 8) + "...",
      );
    } else {
      console.warn(
        "nonceパラメータが不足しています / Nonce parameter is missing",
      );
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
      has_channel_secret: lineConfig.channel_secret,
    });

    // アクセストークンの取得
    // Get access token
    // リダイレクトURLをログに出力
    // Log redirect URI
    console.log("リダイレクトURL / Redirect URI:", lineConfig.callback_url);

    // トークンリクエストのパラメータを構築
    // Build token request parameters
    const tokenParams: Record<string, string> = {
      grant_type: "authorization_code",
      code,
      redirect_uri: lineConfig.callback_url as string,
      client_id: lineConfig.channel_id as string,
      client_secret: lineConfig.channel_secret as string,
    };

    // ハッシュ化されたnonceが存在する場合は追加（OpenID Connect用）
    // Add hashed nonce if exists (for OpenID Connect)
    if (hashedNonce) {
      tokenParams.nonce = hashedNonce;
    }

    const tokenResponse = await axios.post(
      LINE_TOKEN_API,
      new URLSearchParams(tokenParams),
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

    const { access_token, id_token } = tokenResponse.data;

    if (!access_token) {
      return res.status(400).json({
        error:
          "アクセストークンの取得に失敗しました / Failed to get access token",
      });
    }

    if (!id_token) {
      console.warn("IDトークンが取得できませんでした / ID token not received");
    } else if (nonce) {
      // IDトークンのnonce検証
      // Verify nonce in ID token
      try {
        // IDトークンのペイロードをデコード（簡易検証）
        // Decode ID token payload (simple validation)
        const payloadBase64 = id_token.split(".")[1];
        const payload = JSON.parse(
          Buffer.from(payloadBase64, "base64").toString(),
        );

        console.log("IDトークンペイロード / ID token payload:", {
          iss: payload.iss,
          aud: payload.aud,
          sub: payload.sub,
          nonce: payload.nonce ? payload.nonce.substring(0, 8) + "..." : null,
          exp: payload.exp,
        });

        // nonceの検証（IDトークン内のnonceはハッシュ化されている）
        // Verify nonce (nonce in ID token is hashed)
        if (payload.nonce !== hashedNonce) {
          console.error("nonce検証失敗 / Nonce verification failed:", {
            expectedHashed: hashedNonce
              ? hashedNonce.substring(0, 8) + "..."
              : null,
            received: payload.nonce
              ? payload.nonce.substring(0, 8) + "..."
              : null,
          });
          return res.status(400).json({
            error:
              "IDトークンのnonce検証に失敗しました / ID token nonce verification failed",
          });
        }

        console.log("nonce検証成功 / Nonce verification successful");
      } catch (decodeError) {
        console.error(
          "IDトークンのデコードに失敗 / Failed to decode ID token:",
          decodeError,
        );
        // デコードエラーは警告として扱い、処理を継続
        // Treat decode error as warning and continue processing
      }
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

    // ユーザー情報の取得と処理
    // Get and process user information
    const userInfo = {
      uid: userId,
      displayName,
      photoURL: pictureUrl,
      provider: "oidc.line", // プロバイダーIDをLineAuthProviderと一致させる
      providerId: "oidc.line", // 明示的にプロバイダーIDを設定
    };

    try {
      // ユーザーが存在するか確認し、存在しない場合は作成
      // Check if user exists, create if not
      let userRecord;
      let isExistingUser = false;
      let linkInfo = null;
      try {
        userRecord = await getAuth().getUser(userId);
        isExistingUser = true;
        console.log("既存ユーザーを検出 / Existing user detected:", userId);

        // プロバイダー情報を取得
        // Get provider information
        const providerData = userRecord.providerData || [];
        const linkedProviders = providerData.map(
          (provider) => provider.providerId,
        );

        console.log(
          "リンク済みプロバイダー / Linked providers:",
          linkedProviders,
        );

        // LINE認証情報が既にリンクされているか確認
        // Check if LINE authentication information is already linked
        const isLinkedWithLine = linkedProviders.includes("oidc.line");

        // メール認証情報が既にリンクされているか確認
        // Check if email authentication information is already linked
        const isLinkedWithEmail = linkedProviders.includes("password");

        // Google認証情報が既にリンクされているか確認
        // Check if Google authentication information is already linked
        const isLinkedWithGoogle = linkedProviders.includes("google.com");

        // リンク情報をレスポンスに含める
        // Include link information in response
        linkInfo = {
          isLinkedWithLine,
          isLinkedWithEmail,
          isLinkedWithGoogle,
          email: userRecord.email,
          linkedProviders,
        };
      } catch (userError) {
        // ユーザーが存在しない場合は新規作成
        // Create new user if not exists
        console.log("新規ユーザーを作成 / Creating new user:", userId);
        userRecord = await getAuth().createUser({
          uid: userId,
          displayName,
          photoURL: pictureUrl,
        });
      }

      // アクションがリンクの場合の処理
      // Process for link action
      if (authAction === "link") {
        console.log("アカウントリンク処理 / Account linking process");
        // リンク処理の結果を返す
        // Return link process result
        return res.json({
          idToken: id_token, // LINE OIDCのIDトークンを追加
          user: userInfo,
          providerId: "oidc.line",
          isExistingUser,
          linkInfo,
          linkResult: {
            success: true,
            message: "LINEアカウントがリンクされました / LINE account linked",
          },
        });
      }

      // カスタムトークンの生成
      // Generate custom token
      console.log(
        "カスタムトークンを生成 / Generating custom token for:",
        userId,
      );
      // カスタムクレームにプロバイダー情報を含める
      // Include provider information in custom claims
      const customClaims = {
        provider: "oidc.line",
        providerId: "oidc.line",
      };
      const customToken = await getAuth().createCustomToken(
        userId,
        customClaims,
      );

      console.log("id_token: ", id_token);

      // カスタムトークンとユーザー情報を返却
      // Return custom token and user information
      return res.json({
        customToken,
        idToken: id_token, // LINE OIDCのIDトークンを追加
        user: userInfo,
        providerId: "oidc.line", // 明示的にプロバイダーIDを返す
        isExistingUser,
        linkInfo,
      });
    } catch (authError) {
      console.error(
        "Firebase認証エラー / Firebase authentication error:",
        authError,
      );

      console.log("id_token: ", id_token);

      // 認証エラーが発生した場合でもユーザー情報は返す
      // Return user information even if authentication error occurs
      return res.json({
        error:
          "カスタムトークンの生成に失敗しました / Failed to generate custom token",
        idToken: id_token, // LINE OIDCのIDトークンを追加
        user: userInfo,
        providerId: "oidc.line", // 明示的にプロバイダーIDを返す
        isExistingUser: false,
        linkInfo: null,
      });
    }
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
