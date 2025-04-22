/**
 * 認証状態管理用 Composable
 * Authentication state management composable
 * 
 * Firebase Authentication の認証状態を管理するための Composable です。
 * This is a composable for managing Firebase Authentication state.
 */
import { ref, computed, onMounted, onUnmounted } from 'vue';
import {
  signInWithCustomToken,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import axios from 'axios';

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
  
  // LINE設定の取得
  // Get LINE configuration
  const LINE_CHANNEL_ID = "2007305052";
  const LINE_CALLBACK_URL = "http://localhost:3000";
  const API_BASE_URL = "http://localhost:5001/dummy-project/us-central1/api";
  
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
      
      // LINE設定の取得
      // Get LINE configuration
      const LINE_CHANNEL_ID = "2007305052";
      const LINE_CALLBACK_URL = "http://localhost:3000";
      
      if (!LINE_CHANNEL_ID) {
        throw new Error('LINE Channel ID is not configured');
      }
      
      // LINE 認証 URL の生成
      // Generate LINE authentication URL
      const state = Math.random().toString(36).substring(2, 15);
      const nonce = Math.random().toString(36).substring(2, 15);
      
      // localStorage に state と nonce を保存
      // Save state and nonce to localStorage
      localStorage.setItem('line_auth_state', state);
      localStorage.setItem('line_auth_nonce', nonce);
      
      // LINE 認証 URL へリダイレクト
      // Redirect to LINE authentication URL
      const lineAuthUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
      lineAuthUrl.searchParams.append('response_type', 'code');
      lineAuthUrl.searchParams.append('client_id', LINE_CHANNEL_ID);
      lineAuthUrl.searchParams.append('redirect_uri', LINE_CALLBACK_URL);
      lineAuthUrl.searchParams.append('state', state);
      lineAuthUrl.searchParams.append('scope', 'profile openid');
      lineAuthUrl.searchParams.append('nonce', nonce);
      
      window.location.href = lineAuthUrl.toString();
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
      
      // localStorage から state を取得して検証
      // Get state from localStorage and validate
      const savedState = localStorage.getItem('line_auth_state');
      if (state !== savedState) {
        throw new Error('Invalid state parameter');
      }
      
      // LINE コールバック API を呼び出し
      // Call LINE callback API
      const API_BASE_URL = "http://localhost:5001/dummy-project/us-central1/api";
      const response = await axios.post(`${API_BASE_URL}/line-callback`, {
        code,
        state
      });
      
      const { token } = response.data;
      
      if (!token) {
        throw new Error('Failed to get authentication token');
      }
      
      // Firebase にカスタムトークンでサインイン
      // Sign in to Firebase with custom token
      if (auth) {
        await signInWithCustomToken(auth, token);
        
        // localStorage から state と nonce を削除
        // Remove state and nonce from localStorage
        localStorage.removeItem('line_auth_state');
        localStorage.removeItem('line_auth_nonce');
        
        // ダッシュボードページへリダイレクト
        // Redirect to dashboard page
        window.location.href = '/dashboard';
      } else {
        throw new Error('Firebase Auth is not initialized');
      }
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
    loginWithLine,
    handleLineCallback,
    logout
  };
};