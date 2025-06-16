import axios from "axios";
import qs from "qs";
import { Request, Response } from "express";
import { getAuth } from "firebase-admin/auth";

export const lineCallbackHandler = async (req: Request, res: Response) => {
  console.log(
    "LINE Callback リクエストボディ / LINE Callback request body:",
    req.body,
  );

  const { code, state, redirectUri } = req.body;

  const clientId = process.env.LINE_CHANNEL_ID;
  const clientSecret = process.env.LINE_CHANNEL_SECRET;

  console.log("環境変数 / Environment variables:", {
    LINE_CHANNEL_ID: clientId,
    LINE_CALLBACK_URL: process.env.LINE_CALLBACK_URL,
    LINE_CHANNEL_SECRET_PARTIAL: clientSecret
      ? `${clientSecret.substring(0, 4)}...`
      : undefined,
  });

  if (!clientId || !clientSecret) {
    return res.status(500).json({
      error: "LINE authentication credentials not configured",
    });
  }

  console.log("受信したstate / Received state:", state);

  try {
    const finalRedirectUri =
      redirectUri ||
      process.env.LINE_CALLBACK_URL ||
      "https://fb-line-example.web.app";
    console.log("リダイレクトURL / Redirect URI:", finalRedirectUri);

    // ① LINE のトークンエンドポイントにアクセスしてアクセストークンとIDトークンを取得
    const tokenResponse = await axios.post(
      "https://api.line.me/oauth2/v2.1/token",
      qs.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: finalRedirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    const tokenJson = tokenResponse.data;
    console.log(
      "LINE Token APIレスポンス / LINE Token API response:",
      tokenJson,
    );

    if (tokenJson.error) {
      return res.status(400).json({ error: tokenJson });
    }

    const { access_token } = tokenJson;

    // ② アクセストークンを使ってLINEプロファイル情報を取得
    const profileResponse = await axios.get("https://api.line.me/v2/profile", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const profileData = profileResponse.data;
    console.log(
      "LINE Profile APIレスポンス / LINE Profile API response:",
      profileData,
    );

    const lineUserId = profileData.userId;
    const displayName = profileData.displayName;
    const pictureUrl = profileData.pictureUrl;

    // ③ Firebase Authで既存ユーザーを確認
    let firebaseUser;
    try {
      firebaseUser = await getAuth().getUser(lineUserId);
      console.log("既存ユーザーを検出 / Existing user detected:", lineUserId);
      console.log(
        "リンク済みプロバイダー / Linked providers:",
        firebaseUser.providerData.map((p) => p.providerId),
      );
    } catch (error) {
      // ユーザーが存在しない場合は新規作成
      console.log("新規ユーザーを作成 / Creating new user:", lineUserId);
      firebaseUser = await getAuth().createUser({
        uid: lineUserId,
        displayName,
        photoURL: pictureUrl,
      });
    }

    // ④ カスタムトークンを生成
    console.log(
      "カスタムトークンを生成 / Generating custom token for:",
      lineUserId,
    );
    const customToken = await getAuth().createCustomToken(lineUserId, {
      lineProfile: {
        userId: lineUserId,
        displayName,
        pictureUrl,
      },
    });

    return res.json({
      customToken,
      user: {
        uid: lineUserId,
        displayName,
        photoURL: pictureUrl,
        providerId: "line",
      },
    });
  } catch (error: unknown) {
    console.error(
      "LINEログインエラー / LINE login error:",
      (error as any).response?.data || (error as Error).message,
    );
    if ((error as any).response) {
      console.error("Error response status:", (error as any).response.status);
      console.error("Error response data:", (error as any).response.data);
    }
    return res.status(500).json({ error: "Internal error" });
  }
};
