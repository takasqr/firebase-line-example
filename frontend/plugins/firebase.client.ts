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

// @ts-ignore
export default defineNuxtPlugin((nuxtApp) => {
  try {
    // 環境変数から Firebase 設定を直接取得
    // Get Firebase configuration directly from environment variables
    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY || "AIzaSyCdAURAWe3LiqP4KFmrA_Pw1vOyJGwtGYU",
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || "fb-line-example.firebaseapp.com",
      projectId: process.env.FIREBASE_PROJECT_ID || "fb-line-example",
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "fb-line-example.firebasestorage.app",
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "505150781069",
      appId: process.env.FIREBASE_APP_ID || "1:505150781069:web:612035b4c5d18e12e214c4"
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