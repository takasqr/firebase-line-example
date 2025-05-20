/**
 * LINE OAuth コールバックハンドラーのテスト
 * Tests for LINE OAuth callback handler
 */
import * as admin from "firebase-admin";
import axios from "axios";
import { lineCallbackHandler } from "./lineCallback";

// モックの設定
// Setup mocks
jest.mock("firebase-functions", () => ({
  config: jest.fn().mockReturnValue({
    line: {
      channel_id: "test_channel_id",
      channel_secret: "test_channel_secret",
      callback_url: "test_callback_url",
    },
  }),
}));

jest.mock("firebase-admin", () => ({
  auth: jest.fn().mockReturnValue({
    createCustomToken: jest.fn().mockResolvedValue("mocked_firebase_token"),
  }),
}));

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("lineCallbackHandler", () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    // リクエストとレスポンスのモックを設定
    // Setup request and response mocks
    req = {
      body: {
        code: "test_authorization_code",
        state: "test_state",
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // axiosのモックレスポンスを設定
    // Setup axios mock responses
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        access_token: "test_access_token",
        id_token: "test_id_token",
      },
    });

    mockedAxios.get.mockResolvedValueOnce({
      data: {
        userId: "test_user_id",
        displayName: "Test User",
        pictureUrl: "https://example.com/test.jpg",
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("正常なリクエストの場合、Firebaseトークンとユーザー情報を返すこと / should return Firebase token and user info for valid request", async () => {
    // テスト実行
    // Execute test
    await lineCallbackHandler(req, res);

    // 検証
    // Verify
    expect(mockedAxios.post).toHaveBeenCalledWith(
      "https://api.line.me/oauth2/v2.1/token",
      expect.any(URLSearchParams),
      expect.objectContaining({
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }),
    );

    expect(mockedAxios.get).toHaveBeenCalledWith(
      "https://api.line.me/v2/profile",
      expect.objectContaining({
        headers: {
          Authorization: "Bearer test_access_token",
        },
      }),
    );

    expect(admin.auth().createCustomToken).toHaveBeenCalledWith(
      "test_user_id",
      expect.objectContaining({
        provider: "line",
        displayName: "Test User",
        photoURL: "https://example.com/test.jpg",
      }),
    );

    expect(res.json).toHaveBeenCalledWith({
      token: "mocked_firebase_token",
      user: {
        uid: "test_user_id",
        displayName: "Test User",
        photoURL: "https://example.com/test.jpg",
      },
    });
  });

  it("認可コードがない場合、エラーを返すこと / should return error when authorization code is missing", async () => {
    // リクエストから認可コードを削除
    // Remove authorization code from request
    req.body.code = undefined;

    // テスト実行
    // Execute test
    await lineCallbackHandler(req, res);

    // 検証
    // Verify
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "認可コードがありません / Authorization code is missing",
    });
  });

  it("アクセストークンの取得に失敗した場合、エラーを返すこと / should return error when failed to get access token", async () => {
    // アクセストークンの取得に失敗するようにモックを設定
    // Setup mock to fail getting access token
    mockedAxios.post.mockResolvedValueOnce({
      data: {},
    });

    // テスト実行
    // Execute test
    await lineCallbackHandler(req, res);

    // 検証
    // Verify
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error:
        "アクセストークンの取得に失敗しました / Failed to get access token",
    });
  });

  it("ユーザー情報の取得に失敗した場合、エラーを返すこと / should return error when failed to get user information", async () => {
    // ユーザー情報の取得に失敗するようにモックを設定
    // Setup mock to fail getting user information
    mockedAxios.get.mockResolvedValueOnce({
      data: {},
    });

    // テスト実行
    // Execute test
    await lineCallbackHandler(req, res);

    // 検証
    // Verify
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error:
        "ユーザー情報の取得に失敗しました / Failed to get user information",
    });
  });

  it("例外が発生した場合、サーバーエラーを返すこと / should return server error when exception occurs", async () => {
    // 例外を発生させるようにモックを設定
    // Setup mock to throw exception
    mockedAxios.post.mockRejectedValueOnce(new Error("Test error"));

    // テスト実行
    // Execute test
    await lineCallbackHandler(req, res);

    // 検証
    // Verify
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "サーバーエラーが発生しました / Server error occurred",
    });
  });
});
