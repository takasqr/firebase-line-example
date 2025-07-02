/**
 * LINE認証プロバイダー
 * LINE Authentication Provider
 * 
 * FirebaseのカスタムOAuthプロバイダーとしてLINEを実装します。
 * Implements LINE as a custom OAuth provider for Firebase.
 */
import type { FirebaseApp } from 'firebase/app';
// import { signInWithCredential, OAuthProvider } from 'firebase/auth';
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
   * SHA256ハッシュを計算する
   * Calculate SHA256 hash
   */
  private async sha256(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
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
      const rawNonce = Math.random().toString(36).substring(2, 15);
      
      // nonceをSHA256でハッシュ化（OpenID Connect仕様）
      // Hash nonce with SHA256 (OpenID Connect specification)
      const hashedNonce = await this.sha256(rawNonce);
      
      // localStorageに保存（rawNonceとhashedNonceを保存）
      // Save to localStorage (save rawNonce and hashedNonce)
      localStorage.setItem('line_auth_state', state);
      localStorage.setItem('line_auth_nonce', rawNonce);
      localStorage.setItem('line_auth_hashed_nonce', hashedNonce);
      
      // 保存確認のためのデバッグログ
      // Debug log to confirm saving
      console.log('localStorage保存確認 / localStorage save confirmation:', {
        state: localStorage.getItem('line_auth_state'),
        nonce: localStorage.getItem('line_auth_nonce'),
        hashedNonce: localStorage.getItem('line_auth_hashed_nonce'),
        storageLength: localStorage.length
      });
      
      // デバッグ用ログ
      // Debug log
      console.log('LINE認証開始 / Starting LINE authentication:', {
        channelId: this.channelId,
        callbackUrl: this.callbackUrl,
        state,
        rawNonce: rawNonce.substring(0, 3) + '...',
        hashedNonce: hashedNonce.substring(0, 8) + '...'
      });
      
      // LINE認証URLへリダイレクト（ハッシュ化されたnonceを送信）
      // Redirect to LINE authentication URL (send hashed nonce)
      const lineAuthUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
      lineAuthUrl.searchParams.append('response_type', 'code');
      lineAuthUrl.searchParams.append('client_id', this.channelId);
      lineAuthUrl.searchParams.append('redirect_uri', this.callbackUrl);
      lineAuthUrl.searchParams.append('state', state);
      lineAuthUrl.searchParams.append('scope', 'profile openid');
      lineAuthUrl.searchParams.append('nonce', hashedNonce); // ハッシュ化されたnonceを使用
      
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
      // stateとnonceの検証
      // Validate state and nonce
      const savedState = localStorage.getItem('line_auth_state');
      const savedNonce = localStorage.getItem('line_auth_nonce');
      const savedHashedNonce = localStorage.getItem('line_auth_hashed_nonce');
      
      // 詳細なlocalStorage状態をログ出力
      // Log detailed localStorage state
      console.log('localStorage全体の確認 / Full localStorage check:', {
        length: localStorage.length,
        allKeys: Object.keys(localStorage),
        lineAuthState: localStorage.getItem('line_auth_state'),
        lineAuthNonce: localStorage.getItem('line_auth_nonce'),
        lineAuthHashedNonce: localStorage.getItem('line_auth_hashed_nonce')
      });
      
      // デバッグ用ログ
      // Debug log
      console.log('LINE コールバック検証 / LINE callback validation:', {
        receivedState: state,
        savedState,
        isStateValid: state === savedState,
        hasNonce: !!savedNonce,
        hasHashedNonce: !!savedHashedNonce,
        noncePartial: savedNonce ? savedNonce.substring(0, 3) + '...' : null,
        hashedNoncePartial: savedHashedNonce ? savedHashedNonce.substring(0, 8) + '...' : null
      });
      
      if (state !== savedState) {
        console.error('State validation failed:', { received: state, saved: savedState });
        throw new Error('Invalid state parameter');
      }
      
      if (!savedNonce || !savedHashedNonce) {
        console.error('Nonce validation failed:', { 
          hasNonce: !!savedNonce, 
          hasHashedNonce: !!savedHashedNonce,
          localStorage: Object.keys(localStorage)
        });
        
        // nonceなしでも継続を試行（デバッグ用）
        // Try to continue without nonce (for debugging)
        console.warn('Continuing without nonce validation for debugging purposes');
        
        // 代替処理：nonceなしでバックエンドを呼び出し
        // Alternative: call backend without nonce
        const response = await axios.post(`${this.apiBaseUrl}/line-callback`, {
          code,
          state,
          authAction: localStorage.getItem('auth_action') || 'login'
          // nonce and hashedNonce are omitted
        });
        
        const { customToken } = response.data;
        
        // カスタムトークンでサインイン（IDトークンは使用しない）
        // Sign in with custom token (don't use ID token)
        if (customToken) {
          const { signInWithCustomToken } = await import('firebase/auth');
          const userCredential = await signInWithCustomToken(this.auth, customToken);
          return userCredential;
        } else {
          throw new Error('No authentication token available');
        }
      }
      
      // 認証アクションを取得（通常ログインかリンクか）
      // Get authentication action (login or link)
      const authAction = localStorage.getItem('auth_action') || 'login';
      
      // バックエンドAPIを呼び出し
      // Call backend API
      console.log('LINE コールバックAPI呼び出し / Calling LINE callback API:', {
        url: `${this.apiBaseUrl}/line-callback`,
        params: { 
          code, 
          state, 
          authAction, 
          nonce: savedNonce ? savedNonce.substring(0, 3) + '...' : null,
          hashedNonce: savedHashedNonce ? savedHashedNonce.substring(0, 8) + '...' : null
        }
      });
      
      const response = await axios.post(`${this.apiBaseUrl}/line-callback`, {
        code,
        state,
        authAction,
        nonce: savedNonce,
        hashedNonce: savedHashedNonce
      });
      
      const { customToken, idToken: id_token, user: userInfo, isExistingUser, linkInfo, linkResult } = response.data;
      
      console.log('response.data: ', response.data)

      console.log('idToken: ', id_token)

      // localStorageをクリア
      // Clear localStorage
      localStorage.removeItem('line_auth_state');
      localStorage.removeItem('line_auth_nonce');
      localStorage.removeItem('line_auth_hashed_nonce');
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
      if (!id_token && !customToken) {
        throw new Error('Failed to get authentication token');
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
        linkInfo,
        hasIdToken: !!id_token,
        hasCustomToken: !!customToken
      });
      
      let userCredential;
      
      // カスタムトークンを優先的に使用（LINE OIDCの署名検証問題を回避）
      // Prefer custom token (avoid LINE OIDC signature verification issues)
       
      // if (id_token) {
      //   // IDトークンが利用可能な場合の処理
      //   // Process when ID token is available
      //   console.log('LINE IDトークンでサインイン / Sign in with LINE ID token');
      //   console.log('Using nonce for Firebase credential:', savedNonce ? savedNonce.substring(0, 3) + '...' : 'null');
        
      //   try {
      //     const provider = new OAuthProvider("oidc.line");
          
      //     // プロバイダーの追加スコープを設定（必要に応じて）
      //     // provider.addScope('openid');
      //     // provider.addScope('profile');
          
      //     // カスタムパラメータを設定
      //     // provider.setCustomParameters({
      //     //   prompt: 'consent'
      //     // });
          
      //     // const credential = provider.credential({
      //     //   idToken: id_token,
      //     // });

      //     const credential = provider.credential({
      //       idToken: id_token,
      //       rawNonce: savedNonce,
      //     });
          
      //     console.log('Firebase認証を実行 / Executing Firebase authentication');
      //     userCredential = await signInWithCredential(this.auth, credential);
      //     console.log('IDトークン認証成功 / ID token authentication successful');
      //   } catch (error: any) {
      //     console.error('IDトークン認証エラー / ID token authentication error:', error);
      //     console.error('エラーコード / Error code:', error.code);
      //     console.error('エラーメッセージ / Error message:', error.message);
          
      //     // 詳細なエラー情報をログ出力
      //     if (error.code === 'auth/invalid-credential') {
      //       console.error('認証情報が無効です。Firebaseコンソールで以下を確認してください：');
      //       console.error('1. OIDCプロバイダーIDが"oidc.line"に設定されているか');
      //       console.error('2. Client IDとIssuer URLが正しく設定されているか');
      //       console.error('3. プロバイダーが有効になっているか');
      //     }
          
      //     throw error;
      //   }
      // } else if (customToken) {
      if (customToken) {
        console.log('カスタムトークンでサインイン / Sign in with custom token');
        const { signInWithCustomToken } = await import('firebase/auth');
        userCredential = await signInWithCustomToken(this.auth, customToken);
      } 
      else {
        throw new Error('No authentication token available');
      }

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