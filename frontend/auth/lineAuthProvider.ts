/**
 * LINE認証プロバイダー
 * LINE Authentication Provider
 * 
 * FirebaseのカスタムOAuthプロバイダーとしてLINEを実装します。
 * Implements LINE as a custom OAuth provider for Firebase.
 */
import type { FirebaseApp } from 'firebase/app';
import { signInWithCustomToken } from 'firebase/auth';
import type {
  Auth,
  UserCredential,
  AuthProvider,
  User
} from 'firebase/auth';
import axios from 'axios';

/**
 * LINE認証プロバイダークラス
 * LINE Authentication Provider Class
 * 
 * FirebaseのカスタムOAuthプロバイダーとしてLINEを実装するクラスです。
 * A class that implements LINE as a custom OAuth provider for Firebase.
 */
export class LineAuthProvider implements AuthProvider {
  /**
   * プロバイダーID
   * Provider ID
   */
  readonly providerId: string = 'oidc.line';
  
  /**
   * Firebase認証インスタンス
   * Firebase Authentication instance
   */
  private auth: Auth;
  
  /**
   * Firebase アプリケーションインスタンス
   * Firebase Application instance
   */
  // @ts-ignore
  private app: FirebaseApp;
  
  /**
   * APIベースURL
   * API base URL
   */
  private apiBaseUrl: string;
  
  /**
   * LINEチャネルID
   * LINE Channel ID
   */
  private channelId: string;
  
  /**
   * LINEコールバックURL
   * LINE Callback URL
   */
  private callbackUrl: string;

  /**
   * コンストラクタ
   * Constructor
   * 
   * @param app Firebase アプリケーションインスタンス / Firebase Application instance
   * @param auth Firebase 認証インスタンス / Firebase Authentication instance
   * @param config 設定オブジェクト / Configuration object
   */
  constructor(app: FirebaseApp, auth: Auth, config: {
    apiBaseUrl: string;
    channelId: string;
    callbackUrl: string;
  }) {
    this.app = app;
    this.auth = auth;
    this.apiBaseUrl = config.apiBaseUrl;
    this.channelId = config.channelId;
    this.callbackUrl = config.callbackUrl;
    
    // 設定値のバリデーション
    // Validate configuration values
    if (!this.channelId) {
      throw new Error('LINE Channel ID is required');
    }
    if (!this.callbackUrl) {
      throw new Error('LINE Callback URL is required');
    }
    if (!this.apiBaseUrl) {
      throw new Error('API Base URL is required');
    }
  }

  /**
   * LINE認証を開始する
   * Start LINE authentication
   * 
   * LINEログインページにリダイレクトします。
   * Redirects to LINE login page.
   */
  async signIn(): Promise<void> {
    try {
      // stateとnonceを生成
      // Generate state and nonce
      const state = Math.random().toString(36).substring(2, 15);
      const nonce = Math.random().toString(36).substring(2, 15);
      
      // localStorageに保存
      // Save to localStorage
      localStorage.setItem('line_auth_state', state);
      localStorage.setItem('line_auth_nonce', nonce);
      
      // デバッグ用ログ
      // Debug log
      console.log('LINE認証開始 / Starting LINE authentication:', {
        channelId: this.channelId,
        callbackUrl: this.callbackUrl,
        state,
        nonce: nonce.substring(0, 3) + '...' // nonceの一部のみ表示 / Show only part of nonce
      });
      
      // LINE認証URLへリダイレクト
      // Redirect to LINE authentication URL
      const lineAuthUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
      lineAuthUrl.searchParams.append('response_type', 'code');
      lineAuthUrl.searchParams.append('client_id', this.channelId);
      lineAuthUrl.searchParams.append('redirect_uri', this.callbackUrl);
      lineAuthUrl.searchParams.append('state', state);
      lineAuthUrl.searchParams.append('scope', 'profile openid');
      lineAuthUrl.searchParams.append('nonce', nonce);
      
      window.location.href = lineAuthUrl.toString();
    } catch (error) {
      console.error('LINE認証エラー / LINE authentication error:', error);
      throw error;
    }
  }

  /**
   * コールバック処理
   * Handle callback
   * 
   * LINE認証後のコールバック処理を行います。
   * Handles callback after LINE authentication.
   * 
   * @param code 認可コード / Authorization code
   * @param state 状態 / State
   * @returns ユーザー認証情報 / User credential
   */
  async handleCallback(code: string, state: string): Promise<UserCredential | any> {
    try {
      // stateの検証
      // Validate state
      const savedState = localStorage.getItem('line_auth_state');
      
      // デバッグ用ログ
      // Debug log
      console.log('LINE コールバック検証 / LINE callback validation:', {
        receivedState: state,
        savedState,
        isValid: state === savedState
      });
      
      if (state !== savedState) {
        throw new Error('Invalid state parameter');
      }
      
      // 認証アクションを取得（通常ログインかリンクか）
      // Get authentication action (login or link)
      const authAction = localStorage.getItem('auth_action') || 'login';
      
      // バックエンドAPIを呼び出し
      // Call backend API
      console.log('LINE コールバックAPI呼び出し / Calling LINE callback API:', {
        url: `${this.apiBaseUrl}/line-callback`,
        params: { code, state, authAction }
      });
      
      const response = await axios.post(`${this.apiBaseUrl}/line-callback`, {
        code,
        state,
        authAction
      });
      
      const { token, user: userInfo, isExistingUser, linkInfo, linkResult } = response.data;
      
      // localStorageをクリア
      // Clear localStorage
      localStorage.removeItem('line_auth_state');
      localStorage.removeItem('line_auth_nonce');
      localStorage.removeItem('auth_action');
      
      // アクションに応じた処理
      // Process according to action
      if (authAction === 'link') {
        console.log('アカウントリンク処理 / Account linking process:', linkResult);
        
        // リンク結果を返す
        return {
          action: 'link',
          result: linkResult,
          user: userInfo,
          linkInfo
        };
      }
      
      // 通常のログイン処理
      // Normal login process
      if (!token) {
        throw new Error('Failed to get custom token');
      }
      
      if (!userInfo) {
        throw new Error('Failed to get user information');
      }
      
      // デバッグ用ログ
      // Debug log
      console.log('LINE ユーザー情報 / LINE user information:', {
        ...userInfo,
        providerId: this.providerId,
        isExistingUser,
        linkInfo
      });
      
      // カスタムトークンでサインイン
      // Sign in with custom token
      console.log('カスタムトークンでサインイン / Sign in with custom token');
      const userCredential = await signInWithCustomToken(this.auth, token);
      
      // 既存ユーザーで未リンクのプロバイダーがある場合
      // If existing user has unlinked providers
      if (isExistingUser && linkInfo) {
        // リンク情報をユーザーに表示するなどの処理
        console.log('アカウントリンク情報 / Account link information:', linkInfo);
        
        // ユーザー情報にリンク情報を追加
        (userCredential as any).linkInfo = linkInfo;
      }
      
      return userCredential;
    } catch (error) {
      console.error('LINE コールバックエラー / LINE callback error:', error);
      throw error;
    }
  }

  /**
   * ユーザー情報を取得する
   * Get user information
   * 
   * 現在のユーザー情報を取得します。
   * Gets current user information.
   * 
   * @returns ユーザー情報 / User information
   */
  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }
}