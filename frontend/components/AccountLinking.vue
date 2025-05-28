<!--
  アカウントリンクコンポーネント
  Account Linking Component
  
  ユーザーがLINEアカウントとメールアドレスをリンクするためのインターフェースを提供します。
  Provides an interface for users to link their LINE account and email address.
-->
<template>
  <div class="account-linking">
    <h2>アカウントリンク / Account Linking</h2>
    
    <div v-if="linkError">
      <AccountLinkingError 
        :error="linkError" 
        :link-info="linkInfo" 
        :is-loading="isLoading"
        @merge="handleMergeAccounts"
        @use-new-email="resetEmailForm"
        @continue="clearLinkError"
        @relogin="handleRelogin"
        @back="clearLinkError"
      />
    </div>
    
    <div v-else>
      <!-- LINEアカウントリンク -->
      <div v-if="!isLinkedWithLine" class="link-option">
        <h3>LINEアカウントをリンク / Link LINE Account</h3>
        <p>
          LINEアカウントをこのアカウントにリンクすると、LINEでもログインできるようになります。
          <br />
          By linking your LINE account, you will be able to log in with LINE as well.
        </p>
        <button @click="linkWithLine" class="line-button" :disabled="isLoading">
          <span v-if="isLoading">処理中... / Processing...</span>
          <span v-else>LINEアカウントをリンク / Link LINE Account</span>
        </button>
      </div>
      
      <!-- メールアドレスリンク -->
      <div v-if="!isLinkedWithEmail" class="link-option">
        <h3>メールアドレスをリンク / Link Email</h3>
        <p>
          メールアドレスをこのアカウントにリンクすると、メールアドレスとパスワードでもログインできるようになります。
          <br />
          By linking your email address, you will be able to log in with email and password as well.
        </p>
        <form @submit.prevent="linkWithEmail">
          <div class="form-group">
            <label for="email">メールアドレス / Email</label>
            <input type="email" id="email" v-model="email" required />
          </div>
          <div class="form-group">
            <label for="password">パスワード / Password</label>
            <input type="password" id="password" v-model="password" required />
          </div>
          <div class="form-group">
            <label for="confirmPassword">パスワード（確認） / Confirm Password</label>
            <input type="password" id="confirmPassword" v-model="confirmPassword" required />
          </div>
          <div v-if="passwordError" class="error-message">
            {{ passwordError }}
          </div>
          <button type="submit" class="email-button" :disabled="isLoading || !isPasswordValid">
            <span v-if="isLoading">処理中... / Processing...</span>
            <span v-else>メールアドレスをリンク / Link Email</span>
          </button>
        </form>
      </div>
      
      <!-- リンク済みアカウント -->
      <div class="linked-accounts">
        <h3>リンク済みアカウント / Linked Accounts</h3>
        <div v-if="!isLinkedWithLine && !isLinkedWithEmail && !isLinkedWithGoogle" class="no-linked-accounts">
          <p>リンクされているアカウントはありません / No linked accounts</p>
        </div>
        <ul v-else>
          <li v-if="isLinkedWithLine" class="linked-account">
            <span class="provider-icon line-icon">LINE</span>
            <span class="provider-info">LINE</span>
          </li>
          <li v-if="isLinkedWithEmail" class="linked-account">
            <span class="provider-icon email-icon">✉️</span>
            <span class="provider-info">{{ user?.email || 'メールアドレス / Email' }}</span>
          </li>
          <li v-if="isLinkedWithGoogle" class="linked-account">
            <span class="provider-icon google-icon">G</span>
            <span class="provider-info">Google</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * アカウントリンクコンポーネントのスクリプト
 * Script for account linking component
 */
import { ref, computed } from 'vue';
import { useAuth } from '../composables/useAuth';
import AccountLinkingError from './AccountLinkingError.vue';

// 認証Composableの使用
// Use authentication composable
const { 
  user, 
  isLoading, 
  linkError, 
  linkInfo, 
  linkCurrentUserWithLine, 
  linkCurrentUserWithEmail,
  clearLinkError 
} = useAuth();

// フォーム入力
// Form input
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const passwordError = ref('');

// パスワードのバリデーション
// Password validation
const isPasswordValid = computed(() => {
  if (password.value.length < 6) {
    passwordError.value = 'パスワードは6文字以上必要です / Password must be at least 6 characters';
    return false;
  }
  
  if (password.value !== confirmPassword.value) {
    passwordError.value = 'パスワードが一致しません / Passwords do not match';
    return false;
  }
  
  passwordError.value = '';
  return true;
});

// リンク状態
// Link state
const isLinkedWithLine = computed(() => {
  if (!user.value) return false;
  return user.value.providerData.some(p => p.providerId === 'oidc.line');
});

const isLinkedWithEmail = computed(() => {
  if (!user.value) return false;
  return user.value.providerData.some(p => p.providerId === 'password');
});

const isLinkedWithGoogle = computed(() => {
  if (!user.value) return false;
  return user.value.providerData.some(p => p.providerId === 'google.com');
});

// LINEアカウントリンク
// LINE account linking
const linkWithLine = async () => {
  try {
    await linkCurrentUserWithLine();
  } catch (error) {
    console.error('LINE account linking error:', error);
  }
};

// メールアドレスリンク
// Email address linking
const linkWithEmail = async () => {
  if (!isPasswordValid.value) return;
  
  try {
    await linkCurrentUserWithEmail(email.value, password.value);
    resetEmailForm();
  } catch (error) {
    console.error('Email account linking error:', error);
  }
};

// フォームリセット
// Reset form
const resetEmailForm = () => {
  email.value = '';
  password.value = '';
  confirmPassword.value = '';
  passwordError.value = '';
};

// アカウントマージ処理
// Account merge processing
const handleMergeAccounts = async (mergePassword: string) => {
  try {
    // アカウントマージ処理の実装
    // Implementation of account merge processing
    console.log('アカウントマージ処理 / Account merge processing', mergePassword);
    
    // TODO: アカウントマージの実装
    // TODO: Implement account merging
    
    clearLinkError();
  } catch (error) {
    console.error('Account merge error:', error);
  }
};

// 再ログイン処理
// Re-login processing
const handleRelogin = () => {
  // ログアウトして再ログインページへ
  // Log out and go to re-login page
  const { logout } = useAuth();
  logout();
  // ログアウト後にリダイレクト
  // Redirect after logout
  window.location.href = '/login?reason=reauth';
};
</script>

<style scoped>
.account-linking {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

h2 {
  color: #333;
  margin-bottom: 20px;
  text-align: center;
}

.link-option {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

h3 {
  color: #333;
  margin-bottom: 15px;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  color: #555;
}

input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.error-message {
  color: #d32f2f;
  margin-top: 5px;
  margin-bottom: 10px;
}

button {
  padding: 12px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.3s;
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.line-button {
  background-color: #06C755;
  color: white;
  width: 100%;
}

.line-button:hover:not(:disabled) {
  background-color: #05a847;
}

.email-button {
  background-color: #2196f3;
  color: white;
  width: 100%;
}

.email-button:hover:not(:disabled) {
  background-color: #1976d2;
}

.linked-accounts {
  margin-top: 30px;
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.no-linked-accounts {
  color: #757575;
  font-style: italic;
}

ul {
  list-style: none;
  padding: 0;
}

.linked-account {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.provider-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  margin-right: 10px;
  font-weight: bold;
}

.line-icon {
  background-color: #06C755;
  color: white;
}

.email-icon {
  background-color: #ff9800;
  color: white;
}

.google-icon {
  background-color: #4285F4;
  color: white;
}

.provider-info {
  flex: 1;
}
</style>