<!--
  トップページ
  Top page
  
  LINEログインボタンと認証状態を表示するページです。
  This page displays LINE login button and authentication state.
-->
<template>
  <div class="container">
    <div class="auth-container">
      <h1 class="page-title">Firebase × LINE Login Demo</h1>
      <p class="page-description">
        Firebase Authentication と LINE Login を連携したデモサイトです。
        <br />
        This is a demo site that integrates Firebase Authentication and LINE Login.
      </p>

      <div class="card">
        <div v-if="isLoading">
          <div class="loading"></div>
          <span>読み込み中... / Loading...</span>
        </div>

        <div v-else-if="isAuthenticated">
          <div class="user-info">
            <img
              v-if="user?.photoURL"
              :src="user.photoURL"
              alt="User Avatar"
              class="user-avatar"
            />
            <div>
              <p class="user-name">{{ user?.displayName || 'ユーザー / User' }}</p>
              <p>ログイン済み / Logged in</p>
            </div>
          </div>

          <NuxtLink to="/dashboard" class="btn btn-primary">
            ダッシュボードへ / Go to Dashboard
          </NuxtLink>
        </div>

        <div v-else>
          <p>
            LINE アカウントでログインしてください。
            <br />
            Please log in with your LINE account.
          </p>

          <button @click="loginWithLine" class="line-button" :disabled="isLoading">
            <svg class="line-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white">
              <path d="M19.3,5.3C16.7,3.1,12.5,1.9,12,1.9c-0.5,0-4.7,1.2-7.3,3.4C1.3,8.1,0.5,11.4,0.5,14c0,2.6,0.9,5.9,4.2,8.7 c2.6,2.2,6.8,3.4,7.3,3.4c0.5,0,4.7-1.2,7.3-3.4c3.3-2.8,4.2-6.1,4.2-8.7C23.5,11.4,22.6,8.1,19.3,5.3z M17.1,19.5 c-1.4,1.2-4.6,2.6-5.1,2.6c-0.5,0-3.7-1.4-5.1-2.6C4.3,17.3,3.5,14.7,3.5,14c0-0.7,0.8-3.3,3.4-5.5c1.4-1.2,4.6-2.6,5.1-2.6 c0.5,0,3.7,1.4,5.1,2.6c2.6,2.2,3.4,4.8,3.4,5.5C20.5,14.7,19.7,17.3,17.1,19.5z"/>
              <path d="M16.8,14.5h-2.3v-4.1c0-0.4-0.3-0.7-0.7-0.7c-0.4,0-0.7,0.3-0.7,0.7v4.8c0,0.4,0.3,0.7,0.7,0.7h3c0.4,0,0.7-0.3,0.7-0.7 C17.5,14.8,17.2,14.5,16.8,14.5z"/>
              <path d="M10.9,9.7c-0.4,0-0.7,0.3-0.7,0.7v4.8c0,0.4,0.3,0.7,0.7,0.7c0.4,0,0.7-0.3,0.7-0.7v-4.8C11.6,10,11.3,9.7,10.9,9.7z"/>
              <path d="M7.7,13.4l2.3-3.1c0.2-0.3,0.2-0.8-0.1-1c-0.3-0.2-0.8-0.2-1,0.1l-2.3,3.1v-2.1c0-0.4-0.3-0.7-0.7-0.7 c-0.4,0-0.7,0.3-0.7,0.7v4.8c0,0.4,0.3,0.7,0.7,0.7c0.4,0,0.7-0.3,0.7-0.7v-0.6l0.4-0.5l1.9,2.5c0.1,0.2,0.4,0.3,0.6,0.3 c0.1,0,0.3,0,0.4-0.1c0.3-0.2,0.4-0.7,0.1-1L7.7,13.4z"/>
            </svg>
            LINE でログイン / Login with LINE
          </button>

          <div v-if="error" class="error-message">
            <p>エラーが発生しました / An error occurred:</p>
            <p>{{ error.message }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * トップページのスクリプト
 * Script for top page
 */

// 認証状態管理用 Composable の使用
// Use authentication state management composable
const { user, isAuthenticated, isLoading, error, loginWithLine } = useAuth();

// URLパラメータの取得
// Get URL parameters
const route = useRoute();

// LINE コールバックの処理
// Handle LINE callback
onMounted(() => {
  const { code, state } = route.query;
  
  if (code && state && typeof code === 'string' && typeof state === 'string') {
    const { handleLineCallback } = useAuth();
    handleLineCallback(code, state);
  }
});
</script>