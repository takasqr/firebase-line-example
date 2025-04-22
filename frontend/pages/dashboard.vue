<!--
  ダッシュボードページ
  Dashboard page
  
  ログイン後に表示されるダッシュボードページです。
  This is a dashboard page displayed after login.
-->
<template>
  <div class="container">
    <div class="header">
      <h1>Firebase × LINE Login Demo</h1>
      <button @click="logout" class="btn btn-logout" :disabled="isLoading">
        <span v-if="isLoading">
          <div class="loading"></div>
          ログアウト中... / Logging out...
        </span>
        <span v-else>
          ログアウト / Logout
        </span>
      </button>
    </div>

    <div v-if="!isAuthenticated && !isLoading">
      <div class="card">
        <p>
          ログインが必要です。トップページに戻ってログインしてください。
          <br />
          Login required. Please go back to the top page and log in.
        </p>
        <NuxtLink to="/" class="btn btn-primary">
          トップページへ / Go to Top Page
        </NuxtLink>
      </div>
    </div>

    <div v-else-if="isLoading">
      <div class="card">
        <div class="loading"></div>
        <span>読み込み中... / Loading...</span>
      </div>
    </div>

    <div v-else class="dashboard-container">
      <div class="info-box">
        <h3>ユーザー情報 / User Information</h3>
        <div class="user-info">
          <img
            v-if="user?.photoURL"
            :src="user.photoURL"
            alt="User Avatar"
            class="user-avatar"
          />
          <div>
            <p class="user-name">{{ user?.displayName || 'ユーザー / User' }}</p>
            <p>UID: {{ user?.uid }}</p>
          </div>
        </div>
      </div>

      <div class="info-box">
        <h3>認証情報 / Authentication Information</h3>
        <div class="info-item">
          <span class="info-label">プロバイダ / Provider:</span>
          <span class="info-value">LINE</span>
        </div>
        <div class="info-item">
          <span class="info-label">メールアドレス / Email:</span>
          <span class="info-value">{{ user?.email || '未設定 / Not set' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">電話番号 / Phone:</span>
          <span class="info-value">{{ user?.phoneNumber || '未設定 / Not set' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">メール確認 / Email Verified:</span>
          <span class="info-value">{{ user?.emailVerified ? 'はい / Yes' : 'いいえ / No' }}</span>
        </div>
      </div>

      <div class="info-box">
        <h3>認証トークン / Authentication Token</h3>
        <div class="info-item">
          <span class="info-label">最終ログイン / Last Login:</span>
          <span class="info-value">{{ formatDate(user?.metadata?.lastSignInTime) }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">作成日時 / Created At:</span>
          <span class="info-value">{{ formatDate(user?.metadata?.creationTime) }}</span>
        </div>
      </div>

      <div class="info-box">
        <h3>デモ情報 / Demo Information</h3>
        <p>
          このデモサイトは、Firebase Authentication と LINE Login を連携する方法を示しています。
          <br />
          This demo site demonstrates how to integrate Firebase Authentication and LINE Login.
        </p>
        <p class="success-message">
          認証に成功しました！このページはログイン済みユーザーのみがアクセスできます。
          <br />
          Authentication successful! This page is accessible only to logged-in users.
        </p>
      </div>
    </div>

    <div v-if="error" class="error-message">
      <p>エラーが発生しました / An error occurred:</p>
      <p>{{ error.message }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ダッシュボードページのスクリプト
 * Script for dashboard page
 */
import { onMounted, watch } from 'vue';
import { navigateTo } from 'nuxt/app';
import { useAuth } from '../composables/useAuth';

// 認証状態管理用 Composable の使用
// Use authentication state management composable
const { user, isAuthenticated, isLoading, error, logout } = useAuth();

// 日付のフォーマット関数
// Date formatting function
const formatDate = (dateString?: string) => {
  if (!dateString) return '未設定 / Not set';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
};

// 未認証の場合はトップページにリダイレクト
// Redirect to top page if not authenticated
onMounted(() => {
  if (!isLoading.value && !isAuthenticated.value) {
    navigateTo('/');
  }
});

// 認証状態が変わったときにリダイレクト
// Redirect when authentication state changes
watch(isAuthenticated, (newValue: boolean) => {
  if (!isLoading.value && !newValue) {
    navigateTo('/');
  }
});
</script>