/**
 * 認証状態管理用 Composable
 * Authentication state management composable
 * 
 * Firebase Authentication の認証状態を管理するための Composable です。
 * This is a composable for managing Firebase Authentication state.
 */
import { ref, computed, onMounted, onUnmounted } from 'vue';
import {
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import { LineAuthProvider } from '../auth/lineAuthProvider';

/**
 * 認証状態管理用 Composable
 * Authentication state management composable
 *
 * @returns 認証関連の状態と関数
 * @returns Authentication related state and functions
 */
export const useAuth = () => {
  // Nuxt アプリケーションの取得
  // Get Nuxt application
  // @ts-ignore
  const nuxtApp = useNuxtApp();
  
  // Firebase Auth の取得
  // Get Firebase Auth
  // @ts-ignore
  const auth = nuxtApp.$firebase?.auth;
  // @ts-ignore
  const app = nuxtApp.$firebase?.app;
  
  // アカウントリンク状態
  // Account linking state
  const linkError = ref<Error | null>(null);
  const linkInfo = ref<any>(null);
  
  // LINE認証プロバイダーの作成
  // Create LINE authentication provider
  const createLineProvider = () => {
    if (!app || !auth) {
      throw new Error('Firebase is not initialized');
    }
    
    return new LineAuthProvider(app, auth, {
      apiBaseUrl: nuxtApp.$config?.public?.apiBaseUrl,
      channelId: nuxtApp.$config?.public?.line?.channelId,
      callbackUrl: nuxtApp.$config?.public?.line?.callbackUrl
    });
  };
  
  // 認証状態
  // Authentication state
  const user = ref<User | null>(null);
  const isLoading = ref(true);
  const error = ref<Error | null>(null);
  
  // 認証状態の計算プロパティ
  // Computed property for authentication state
  const isAuthenticated = computed(() => !!user.value);
  
  // 認証状態の監視を解除する関数
  // Function to unsubscribe from authentication state changes
  let unsubscribe: (() => void) | undefined;
  
  /**
   * LINE ログイン処理
   * LINE login process
   */
  const loginWithLine = async () => {
    try {
      isLoading.value = true;
      error.value = null;
      
      // LINE認証プロバイダーを使用してサインイン
      // Sign in using LINE authentication provider
      const lineProvider = createLineProvider();
      await lineProvider.signIn();
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Unknown error');
      isLoading.value = false;
    }
  };
  
  /**
   * LINE コールバック処理
   * LINE callback process
   * 
   * @param code 認可コード / Authorization code
   * @param state 状態 / State
   */
  const handleLineCallback = async (code: string, state: string) => {
    try {
      isLoading.value = true;
      error.value = null;
      
      // LINE認証プロバイダーを使用してコールバック処理
      // Handle callback using LINE authentication provider
      const lineProvider = createLineProvider();
      const result = await lineProvider.handleCallback(code, state);
      
      // アクションに応じた処理
      // Process according to action
      if (result.action === 'link') {
        console.log('アカウントリンク結果 / Account linking result:', result);
        
        // リンク情報を設定
        // Set link information
        linkInfo.value = result.linkInfo;
        
        // ダッシュボードページへリダイレクト
        // Redirect to dashboard page
        window.location.href = '/dashboard?linked=true';
        return;
      }
      
      // 通常のログイン処理
      // Normal login process
      if (result.linkInfo) {
        linkInfo.value = result.linkInfo;
      }
      
      // ダッシュボードページへリダイレクト
      // Redirect to dashboard page
      window.location.href = '/dashboard';
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Unknown error');
      isLoading.value = false;
    }
  };
  
  /**
   * ログアウト処理
   * Logout process
   */
  const logout = async () => {
    try {
      isLoading.value = true;
      error.value = null;
      
      if (auth) {
        await firebaseSignOut(auth);
        
        // トップページへリダイレクト
        // Redirect to top page
        window.location.href = '/';
      } else {
        throw new Error('Firebase Auth is not initialized');
      }
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Unknown error');
    } finally {
      isLoading.value = false;
    }
  };
  
  /**
   * 現在のメールログインユーザーにLINEアカウントをリンクする
   * Link LINE account to current email login user
   */
  const linkCurrentUserWithLine = async () => {
    try {
      isLoading.value = true;
      linkError.value = null;
      
      // 現在のユーザーが存在するか確認
      // Check if current user exists
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('ユーザーがログインしていません / User is not logged in');
      }
      
      // LINEログイン後のコールバック処理を変更
      // Change callback processing after LINE login
      localStorage.setItem('auth_action', 'link');
      
      // LINEログインを実行
      // Execute LINE login
      const lineProvider = createLineProvider();
      await lineProvider.signIn();
    } catch (err) {
      linkError.value = err instanceof Error ? err : new Error('Unknown error');
      isLoading.value = false;
    }
  };
  
  /**
   * 現在のLINEログインユーザーにメールアドレスをリンクする
   * Link email address to current LINE login user
   *
   * @param email メールアドレス / Email address
   * @param password パスワード / Password
   */
  const linkCurrentUserWithEmail = async (email: string, password: string) => {
    try {
      isLoading.value = true;
      linkError.value = null;
      
      // 現在のユーザーが存在するか確認
      // Check if current user exists
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('ユーザーがログインしていません / User is not logged in');
      }
      
      // Firebase Auth SDKをインポート
      // Import Firebase Auth SDK
      const { EmailAuthProvider, linkWithCredential } = await import('firebase/auth');
      
      // メールアドレス認証情報を作成
      // Create email authentication credentials
      const credential = EmailAuthProvider.credential(email, password);
      
      // 現在のユーザーにメールアドレスをリンク
      // Link email address to current user
      await linkWithCredential(currentUser, credential);
      
      // ユーザープロファイルを更新
      // Update user profile
      await currentUser.updateProfile({
        // @ts-ignore
        email: email
      });
      
      return currentUser;
    } catch (err) {
      // エラーコードに基づいて処理
      // Process based on error code
      const firebaseError = err as { code?: string };
      if (firebaseError.code === 'auth/email-already-in-use') {
        // このメールアドレスが既に使用されている場合
        // If this email address is already in use
        linkError.value = new Error('このメールアドレスは既に別のアカウントで使用されています / This email address is already in use by another account');
        
        // アカウントマージのためのデータを設定
        // Set data for account merging
        linkInfo.value = {
          error: 'email-already-in-use',
          email,
          currentUid: auth.currentUser?.uid
        };
      } else if (firebaseError.code === 'auth/requires-recent-login') {
        // 再認証が必要な場合
        // If re-authentication is required
        linkError.value = new Error('セキュリティのため、再度ログインしてからお試しください / For security reasons, please log in again and try');
      } else {
        // その他のエラー
        // Other errors
        linkError.value = err instanceof Error ? err : new Error('Unknown error');
      }
      
      isLoading.value = false;
      throw linkError.value;
    } finally {
      isLoading.value = false;
    }
  };
  
  /**
   * アカウントリンクエラーをクリアする
   * Clear account link error
   */
  const clearLinkError = () => {
    linkError.value = null;
    linkInfo.value = null;
  };
  
  // コンポーネントのマウント時に認証状態の監視を開始
  // Start monitoring authentication state when component is mounted
  onMounted(() => {
    if (auth) {
      unsubscribe = onAuthStateChanged(
        auth,
        (currentUser) => {
          user.value = currentUser;
          isLoading.value = false;
        },
        (err) => {
          error.value = err;
          isLoading.value = false;
        }
      );
    } else {
      isLoading.value = false;
      error.value = new Error('Firebase Auth is not initialized');
    }
  });
  
  // コンポーネントのアンマウント時に認証状態の監視を解除
  // Stop monitoring authentication state when component is unmounted
  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });
  
  // 認証関連の状態と関数を返却
  // Return authentication related state and functions
  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    linkError,
    linkInfo,
    loginWithLine,
    handleLineCallback,
    logout,
    linkCurrentUserWithLine,
    linkCurrentUserWithEmail,
    clearLinkError
  };
};