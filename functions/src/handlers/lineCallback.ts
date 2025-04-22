/**
 * LINE OAuth コールバックハンドラー
 * LINE OAuth 2.0 フローのコールバック処理を行うハンドラーです。
 */
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

// LINE API の設定
// LINE API configuration
const LINE_TOKEN_API = 'https://api.line.me/oauth2/v2.1/token';
const LINE_PROFILE_API = 'https://api.line.me/v2/profile';

// 環境変数から LINE の設定を取得
// Get LINE configuration from environment variables
const getLineConfig = () => {
  // 本番環境では functions.config() から環境変数を取得
  // ローカル環境では process.env から環境変数を取得
  // Get environment variables from functions.config() in production
  // Get environment variables from process.env in local environment
  const config = functions.config().line || {
    channel_id: process.env.LINE_CHANNEL_ID,
    channel_secret: process.env.LINE_CHANNEL_SECRET,
    callback_url: process.env.LINE_CALLBACK_URL
  };

  if (!config.channel_id || !config.channel_secret || !config.callback_url) {
    throw new Error('LINE configuration is missing');
  }

  return config;
};

/**
 * LINE OAuth コールバックハンドラー
 * LINE OAuth 2.0 フローのコールバック処理を行います。
 * 
 * LINE OAuth callback handler
 * Handle LINE OAuth 2.0 flow callback.
 */
export const lineCallbackHandler = async (req: any, res: any) => {
  try {
    const { code, state } = req.body;

    if (!code) {
      return res.status(400).json({ error: '認可コードがありません / Authorization code is missing' });
    }

    // LINE の設定を取得
    // Get LINE configuration
    const lineConfig = getLineConfig();

    // アクセストークンの取得
    // Get access token
    const tokenResponse = await axios.post(
      LINE_TOKEN_API,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: lineConfig.callback_url,
        client_id: lineConfig.channel_id,
        client_secret: lineConfig.channel_secret
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token, id_token } = tokenResponse.data;

    if (!access_token) {
      return res.status(400).json({ error: 'アクセストークンの取得に失敗しました / Failed to get access token' });
    }

    // ユーザープロフィールの取得
    // Get user profile
    const profileResponse = await axios.get(LINE_PROFILE_API, {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    const { userId, displayName, pictureUrl } = profileResponse.data;

    if (!userId) {
      return res.status(400).json({ error: 'ユーザー情報の取得に失敗しました / Failed to get user information' });
    }

    // Firebase カスタムトークンの生成
    // Generate Firebase custom token
    const firebaseToken = await admin.auth().createCustomToken(userId, {
      provider: 'line',
      displayName,
      photoURL: pictureUrl
    });

    // 成功レスポンスの返却
    // Return success response
    return res.json({
      token: firebaseToken,
      user: {
        uid: userId,
        displayName,
        photoURL: pictureUrl
      }
    });
  } catch (error) {
    console.error('LINE OAuth callback error:', error);
    return res.status(500).json({ error: 'サーバーエラーが発生しました / Server error occurred' });
  }
};