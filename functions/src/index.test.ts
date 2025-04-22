/**
 * Firebase Functions のエントリーポイントのテスト
 * Tests for Firebase Functions entry point
 */
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

// モックの設定
// Setup mocks
jest.mock('firebase-functions', () => ({
  https: {
    onRequest: jest.fn((app) => app)
  },
  config: jest.fn().mockReturnValue({
    line: {
      channel_id: 'test_channel_id',
      channel_secret: 'test_channel_secret',
      callback_url: 'test_callback_url'
    }
  })
}));

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  auth: jest.fn().mockReturnValue({
    getUser: jest.fn(),
    createUser: jest.fn(),
    createCustomToken: jest.fn().mockResolvedValue('mocked_firebase_token')
  })
}));

jest.mock('express', () => {
  const mockExpress = () => ({
    use: jest.fn().mockReturnThis(),
    post: jest.fn().mockReturnThis()
  });
  mockExpress.json = jest.fn();
  return mockExpress;
});

jest.mock('cors', () => jest.fn(() => (req: any, res: any, next: any) => next()));
jest.mock('dotenv', () => ({ config: jest.fn() }));
jest.mock('./handlers/lineCallback', () => ({
  lineCallbackHandler: jest.fn()
}));

describe('Firebase Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('カスタムトークン生成API / Custom token generation API', () => {
    it('有効なリクエストの場合、カスタムトークンを返すこと / should return custom token for valid request', async () => {
      // api関数をインポート
      // Import api function
      const { api } = require('./index');

      // リクエストとレスポンスのモックを設定
      // Setup request and response mocks
      const req = {
        body: {
          uid: 'test_user_id',
          displayName: 'Test User',
          photoURL: 'https://example.com/test.jpg'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      // ユーザーが存在するようにモックを設定
      // Setup mock to make user exist
      (admin.auth().getUser as jest.Mock).mockResolvedValueOnce({
        uid: 'test_user_id'
      });

      // テスト実行
      // Execute test
      await api.post('/auth/custom-token', req, res);

      // 検証
      // Verify
      expect(admin.auth().getUser).toHaveBeenCalledWith('test_user_id');
      expect(admin.auth().createUser).not.toHaveBeenCalled();
      expect(admin.auth().createCustomToken).toHaveBeenCalledWith('test_user_id');
      expect(res.json).toHaveBeenCalledWith({
        token: 'mocked_firebase_token'
      });
    });

    it('ユーザーが存在しない場合、新しいユーザーを作成すること / should create new user if user does not exist', async () => {
      // api関数をインポート
      // Import api function
      const { api } = require('./index');

      // リクエストとレスポンスのモックを設定
      // Setup request and response mocks
      const req = {
        body: {
          uid: 'new_user_id',
          displayName: 'New User',
          photoURL: 'https://example.com/new.jpg'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      // ユーザーが存在しないようにモックを設定
      // Setup mock to make user not exist
      (admin.auth().getUser as jest.Mock).mockRejectedValueOnce(new Error('User not found'));

      // テスト実行
      // Execute test
      await api.post('/auth/custom-token', req, res);

      // 検証
      // Verify
      expect(admin.auth().getUser).toHaveBeenCalledWith('new_user_id');
      expect(admin.auth().createUser).toHaveBeenCalledWith({
        uid: 'new_user_id',
        displayName: 'New User',
        photoURL: 'https://example.com/new.jpg'
      });
      expect(admin.auth().createCustomToken).toHaveBeenCalledWith('new_user_id');
      expect(res.json).toHaveBeenCalledWith({
        token: 'mocked_firebase_token'
      });
    });

    it('UIDがない場合、エラーを返すこと / should return error when UID is missing', async () => {
      // api関数をインポート
      // Import api function
      const { api } = require('./index');

      // リクエストとレスポンスのモックを設定
      // Setup request and response mocks
      const req = {
        body: {
          displayName: 'Test User',
          photoURL: 'https://example.com/test.jpg'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      // テスト実行
      // Execute test
      await api.post('/auth/custom-token', req, res);

      // 検証
      // Verify
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'UID is required'
      });
    });

    it('例外が発生した場合、サーバーエラーを返すこと / should return server error when exception occurs', async () => {
      // api関数をインポート
      // Import api function
      const { api } = require('./index');

      // リクエストとレスポンスのモックを設定
      // Setup request and response mocks
      const req = {
        body: {
          uid: 'test_user_id',
          displayName: 'Test User',
          photoURL: 'https://example.com/test.jpg'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      // 例外を発生させるようにモックを設定
      // Setup mock to throw exception
      (admin.auth().getUser as jest.Mock).mockRejectedValueOnce(new Error('Test error'));
      (admin.auth().createUser as jest.Mock).mockRejectedValueOnce(new Error('Test error'));

      // テスト実行
      // Execute test
      await api.post('/auth/custom-token', req, res);

      // 検証
      // Verify
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error'
      });
    });
  });
});