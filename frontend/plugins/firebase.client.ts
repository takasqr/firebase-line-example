/**
 * Firebase クライアントプラグイン
 * Firebase client plugin
 * 
 * Firebase JS SDK の初期化を行います。
 * Initializes Firebase JS SDK.
 */
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { useRuntimeConfig, defineNuxtPlugin } from 'nuxt/app';

// @ts-ignore
export default defineNuxtPlugin((nuxtApp) => {
  try {
    // runtimeConfig から Firebase 設定を取得
    // Get Firebase configuration from runtimeConfig
    const config = useRuntimeConfig();
    const firebaseConfig = {
      apiKey: (config.public.firebase as any).apiKey,
      authDomain: (config.public.firebase as any).authDomain,
      projectId: (config.public.firebase as any).projectId,
      storageBucket: (config.public.firebase as any).storageBucket,
      messagingSenderId: (config.public.firebase as any).messagingSenderId,
      appId: (config.public.firebase as any).appId
    };

    // Firebase の初期化
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);

    // Firebase Authentication の取得
    // Get Firebase Authentication
    const auth = getAuth(app);

    // Firebase Functions の取得
    // Get Firebase Functions
    const functions = getFunctions(app);

    // 開発環境の場合は Firebase Emulator に接続
    // Connect to Firebase Emulator in development environment
    if (process.env.NODE_ENV !== 'production') {
      connectAuthEmulator(auth, 'http://localhost:9099');
      connectFunctionsEmulator(functions, 'localhost', 5001);
    }

    // Firebase インスタンスを Nuxt アプリケーションに提供
    // Provide Firebase instances to Nuxt application
    nuxtApp.provide('firebase', {
      app,
      auth,
      functions
    });

    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    // エラーが発生した場合でも、空のオブジェクトを提供して他の機能が動作するようにする
    // Provide an empty object even if an error occurs so that other functions can work
    nuxtApp.provide('firebase', {});
  }
});