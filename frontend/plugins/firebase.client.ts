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

export default defineNuxtPlugin((nuxtApp) => {
  // Nuxt のランタイム設定から Firebase の設定を取得
  // Get Firebase configuration from Nuxt runtime config
  const config = useRuntimeConfig();
  const firebaseConfig = config.public.firebase;

  // Firebase の設定が存在するか確認
  // Check if Firebase configuration exists
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error('Firebase configuration is missing or incomplete');
    return;
  }

  // Firebase の初期化
  // Initialize Firebase
  const app = initializeApp({
    apiKey: firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId
  });

  // Firebase Authentication の取得
  // Get Firebase Authentication
  const auth = getAuth(app);

  // Firebase Functions の取得
  // Get Firebase Functions
  const functions = getFunctions(app);

  // 開発環境の場合、Firebase Emulator に接続
  // Connect to Firebase Emulator in development environment
  if (process.env.NODE_ENV !== 'production') {
    try {
      connectAuthEmulator(auth, 'http://localhost:9099');
      connectFunctionsEmulator(functions, 'localhost', 5001);
      console.info('Connected to Firebase Emulator');
    } catch (error) {
      console.error('Failed to connect to Firebase Emulator:', error);
    }
  }

  // Firebase インスタンスを Nuxt アプリケーションに提供
  // Provide Firebase instances to Nuxt application
  nuxtApp.provide('firebase', {
    app,
    auth,
    functions
  });
});