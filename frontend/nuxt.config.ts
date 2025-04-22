/**
 * Nuxt 3 設定ファイル
 * Nuxt 3 configuration file
 */
// @ts-ignore
export default defineNuxtConfig({
  // 互換性日付の設定
  // Compatibility date setting
  compatibilityDate: '2025-04-22',
  // アプリケーションの設定
  // Application configuration
  app: {
    head: {
      title: 'Firebase × LINE Login Demo',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Firebase Authentication × LINE Login Demo Site' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    }
  },

  // ランタイム設定
  // Runtime configuration
  runtimeConfig: {
    // サーバーサイドでのみ利用可能な変数
    // Variables available only on server-side
    apiSecret: process.env.API_SECRET,
    
    // クライアントサイドでも利用可能な変数
    // Variables available on client-side
    public: {
      apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:5001/your-project-id/us-central1/api',
      firebase: {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
      },
      line: {
        channelId: process.env.LINE_CHANNEL_ID,
        callbackUrl: process.env.LINE_CALLBACK_URL,
      },
    },
  },

  // モジュール
  // Modules
  modules: [],

  // ビルド設定
  // Build configuration
  build: {
    transpile: []
  },

  // 開発サーバー設定
  // Development server configuration
  devServer: {
    port: 3000
  },

  // TypeScript設定
  // TypeScript configuration
  typescript: {
    strict: true,
    typeCheck: true
  },

  // 自動インポート設定
  // Auto-import configuration
  imports: {
    dirs: ['composables'],
    imports: [
      { from: 'vue', name: 'ref' },
      { from: 'vue', name: 'computed' },
      { from: 'vue', name: 'watch' },
      { from: 'vue', name: 'onMounted' },
      { from: 'vue', name: 'onUnmounted' },
      { from: '#app', name: 'useNuxtApp' },
      { from: '#app', name: 'useRuntimeConfig' },
      { from: '#app', name: 'defineNuxtPlugin' },
      { from: '#app', name: 'navigateTo' },
      { from: '#app', name: 'useRoute' }
    ]
  },

  // プラグイン設定
  // Plugins configuration
  plugins: [
    { src: '~/plugins/firebase.client.ts', mode: 'client' }
  ],

  // CSS設定
  // CSS configuration
  css: [
    '~/assets/css/main.css'
  ],

  // エイリアス設定
  // Alias configuration
  alias: {},

  // 実験的機能
  // Experimental features
  experimental: {
    payloadExtraction: false
  },

  // デバッグ設定
  // Debug configuration
  debug: process.env.NODE_ENV !== 'production'
})