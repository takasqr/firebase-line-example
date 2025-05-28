<!--
  アカウントリンクエラーコンポーネント
  Account Linking Error Component
  
  アカウントリンク時のエラーを表示し、対応策を提供するコンポーネントです。
  This component displays errors during account linking and provides solutions.
-->
<template>
  <div class="account-linking-error">
    <h2>アカウントリンクエラー / Account Linking Error</h2>
    
    <div v-if="error?.message?.includes('email-already-in-use')" class="error-container">
      <p class="error-message">
        このメールアドレスは既に別のアカウントで使用されています。
        <br />
        This email is already in use by another account.
      </p>
      
      <div class="options">
        <h3>選択肢 / Options:</h3>
        
        <div class="option">
          <h4>1. アカウントをマージする / Merge accounts</h4>
          <p>
            既存のアカウントとLINEアカウントをマージします。
            <br />
            Merge your existing account with your LINE account.
          </p>
          <form @submit.prevent="mergeAccounts">
            <div class="form-group">
              <label for="merge-password">既存アカウントのパスワード / Existing account password</label>
              <input type="password" id="merge-password" v-model="mergePassword" required />
            </div>
            <button type="submit" class="merge-button" :disabled="isLoading">
              <span v-if="isLoading">処理中... / Processing...</span>
              <span v-else>アカウントをマージ / Merge Accounts</span>
            </button>
          </form>
        </div>
        
        <div class="option">
          <h4>2. 別のメールアドレスを使用する / Use a different email</h4>
          <p>
            別のメールアドレスでリンクを試みます。
            <br />
            Try linking with a different email address.
          </p>
          <button @click="useNewEmail" class="new-email-button" :disabled="isLoading">
            別のメールアドレスを使用 / Use Different Email
          </button>
        </div>
        
        <div class="option">
          <h4>3. リンクせずに続行 / Continue without linking</h4>
          <p>
            アカウントをリンクせずに続行します。
            <br />
            Continue without linking accounts.
          </p>
          <button @click="continueWithoutLinking" class="continue-button" :disabled="isLoading">
            リンクせずに続行 / Continue Without Linking
          </button>
        </div>
      </div>
    </div>
    
    <div v-else-if="error?.message?.includes('requires-recent-login')" class="error-container">
      <p class="error-message">
        セキュリティのため、再度ログインしてからお試しください。
        <br />
        For security reasons, please log in again and try.
      </p>
      <button @click="relogin" class="relogin-button" :disabled="isLoading">
        再ログイン / Re-login
      </button>
    </div>
    
    <div v-else-if="error" class="error-container">
      <p class="error-message">
        エラーが発生しました: {{ error.message }}
        <br />
        An error occurred: {{ error.message }}
      </p>
      <button @click="goBack" class="back-button" :disabled="isLoading">
        戻る / Go Back
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * アカウントリンクエラーコンポーネントのスクリプト
 * Script for account linking error component
 */
import { ref } from 'vue';

// プロパティの定義
// Define properties
defineProps({
  error: {
    type: Object as () => Error | null,
    default: null
  },
  linkInfo: {
    type: Object,
    default: null
  },
  isLoading: {
    type: Boolean,
    default: false
  }
});

// イベントの定義
// Define events
const emit = defineEmits([
  'merge', 
  'useNewEmail', 
  'continue', 
  'relogin', 
  'back'
]);

// マージ用パスワード
// Password for merging
const mergePassword = ref('');

/**
 * アカウントをマージする
 * Merge accounts
 */
const mergeAccounts = async () => {
  emit('merge', mergePassword.value);
  mergePassword.value = '';
};

/**
 * 別のメールアドレスを使用する
 * Use a different email address
 */
const useNewEmail = () => {
  emit('useNewEmail');
};

/**
 * リンクせずに続行する
 * Continue without linking
 */
const continueWithoutLinking = () => {
  emit('continue');
};

/**
 * 再ログインする
 * Re-login
 */
const relogin = () => {
  emit('relogin');
};

/**
 * 戻る
 * Go back
 */
const goBack = () => {
  emit('back');
};
</script>

<style scoped>
.account-linking-error {
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

.error-container {
  margin-top: 20px;
}

.error-message {
  color: #d32f2f;
  background-color: #ffebee;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.options {
  margin-top: 20px;
}

.option {
  margin-bottom: 30px;
  padding: 15px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

h3 {
  color: #333;
  margin-bottom: 15px;
}

h4 {
  color: #2196f3;
  margin-bottom: 10px;
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
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

button {
  padding: 10px 15px;
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

.merge-button {
  background-color: #4caf50;
  color: white;
}

.merge-button:hover:not(:disabled) {
  background-color: #388e3c;
}

.new-email-button {
  background-color: #2196f3;
  color: white;
}

.new-email-button:hover:not(:disabled) {
  background-color: #1976d2;
}

.continue-button {
  background-color: #ff9800;
  color: white;
}

.continue-button:hover:not(:disabled) {
  background-color: #f57c00;
}

.relogin-button {
  background-color: #9c27b0;
  color: white;
}

.relogin-button:hover:not(:disabled) {
  background-color: #7b1fa2;
}

.back-button {
  background-color: #757575;
  color: white;
}

.back-button:hover:not(:disabled) {
  background-color: #616161;
}
</style>