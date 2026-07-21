<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-content">
        <div class="login-form-section">
          <div class="login-logo">
            <img
              src="@/assets/images/qj-logo-Dgc-aGJV.png"
              alt="Logo"
              style="width: 450px; height: auto"
            />
          </div>
          <div class="login-header"></div>
          <div class="login-form">
            <div class="input-item">
              <div class="input-wrapper">
                <n-input
                  v-model:value="username"
                  placeholder="请输入您的邮箱"
                  autocomplete="off"
                  :autofocus="true"
                  :input-props="{ style: 'text-align: left' }"
                  @blur="validateEmail"
                  @keyup.enter="handleUsernameEnter"
                  :status="emailError ? 'error' : undefined"
                >
                  <template #prefix>
                    <n-icon><person-outline /></n-icon>
                  </template>
                </n-input>
                <span v-if="emailError" class="error-message">{{
                  emailError
                }}</span>
              </div>
            </div>
            <div class="input-item">
              <div class="input-wrapper">
                <n-input
                  v-model:value="password"
                  type="password"
                  placeholder="请输入您的密码"
                  show-password-on="click"
                  autocomplete="new-password"
                  @keyup.enter="handleLogin"
                  :input-props="{ style: 'text-align: left' }"
                >
                  <template #prefix>
                    <n-icon><lock-closed-outline /></n-icon>
                  </template>
                </n-input>
              </div>
            </div>
            <div class="login-actions">
              <n-checkbox v-model:checked="rememberMe">记住我</n-checkbox>
              <n-button type="primary" class="login-button" @click="handleLogin"
                >登录</n-button
              >
            </div>
            <!-- 
            <div class="register-link">
              <n-button text @click="handleRegister">还没有账号？立即创建</n-button>
            </div>
          -->
            <div class="register-link" style="color: #b0b0b0">
              登录视为您已阅读并同意千诀科技开放平台的<n-button
                text
                @click="showPolicies"
                >用户协议、隐私政策</n-button
              >
            </div>
          </div>
        </div>
        <!-- <div class="wecom-login-section">
          <n-spin size="large" :show="isLoading">
            <div ref="wecomLoginContainer"></div>
          </n-spin>
        </div> -->
      </div>
    </div>
    <footer class="footer">
      <div class="footer-content">
        <p>© 2024 北京千诀科技有限公司 版权所有</p>
        <p>京ICP备2023038411号-1</p>
        <p class="footer-text">
          <img
            src="data:image/png;base64,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"
            alt="备案图标"
            class="footer-icon"
          />
          京公网安备11010802044154号
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import { NInput, NButton, NCheckbox, NIcon, NSpin } from "naive-ui";
import { PersonOutline, LockClosedOutline } from "@vicons/ionicons5";
import { useRouter, useRoute } from "vue-router";
import { doPost } from "@/utils/requests";
import CryptoJS from "crypto-js";
import message from "@/utils/messages";
import { useMainStore } from "@/stores/mainStore";
import * as wecom from "@wecom/jssdk";

const router = useRouter();
const route = useRoute();
const mainStore = useMainStore();

const username = ref("");
const password = ref("");
const rememberMe = ref(false);
const emailError = ref("");

const encryptPassword = (pwd) => {
  const salt = "***#17600620312#";
  const key = CryptoJS.enc.Utf8.parse(salt);
  const iv = CryptoJS.enc.Utf8.parse(salt.slice(0, 16)); // 使用salt的前16个字符作为IV
  const encrypted = CryptoJS.AES.encrypt(pwd, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return encrypted.toString();
};

const decryptPassword = (encryptedPwd) => {
  const salt = "***#17600620312#";
  const key = CryptoJS.enc.Utf8.parse(salt);
  const iv = CryptoJS.enc.Utf8.parse(salt.slice(0, 16));
  const decrypted = CryptoJS.AES.decrypt(encryptedPwd, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return decrypted.toString(CryptoJS.enc.Utf8);
};

const validateEmail = () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!username.value) {
    emailError.value = "邮箱不能为空";
  } else if (!emailRegex.test(username.value)) {
    emailError.value = "请输入有效的邮箱地址";
  } else {
    emailError.value = "";
  }
};

const handleUsernameEnter = () => {
  // 如果密码有值，则提交登录
  if (password.value) {
    handleLogin();
  } else {
    // 如果密码没有值，则让密码输入框获取焦点
    const passwordInput = document.querySelector('input[type="password"]');
    if (passwordInput) {
      passwordInput.focus();
    }
  }
};

const handleLogin = async () => {
  // 移除用户名两侧的空格和不可见空白字符
  username.value = username.value.trim();

  validateEmail();
  if (emailError.value) {
    return;
  }
  try {
    let loginPassword = password.value;
    if (rememberMe.value) {
      // 如果是"记住我"，我们存储加密后的密码
      const encryptedPassword = encryptPassword(password.value);
      localStorage.setItem("rememberedUsername", username.value);
      localStorage.setItem("rememberedPassword", encryptedPassword);
    } else {
      localStorage.removeItem("rememberedUsername");
      localStorage.removeItem("rememberedPassword");
    }

    // 始终使用未加密的密码进行登录
    const response = await doPost("/auth-center/system/user/login", {
      username: username.value,
      passwd: encryptPassword(password.value),
    });

    // 检查响应是否成功
    if (response.code === 0 && response.data) {
      // 存储 accessToken 到 localStorage
      localStorage.setItem("access_token", response.data.accessToken);

      // 使用 mainStore 设置用户信息
      mainStore.setUser({
        nickname: response.data.nickname,
        // 添加其他需要的用户信息
      });

      // 登录成功后跳到首页
      router.push("/");
    } else {
      // 如果响应不符合预期，抛出错误
      throw new Error(response.message || "登录失败");
    }
  } catch (error) {
    console.error("Login failed:", error);
    // message.error(error.message || '登录失败，请稍后重试')
  }
};

const isLoading = ref(true);
const wecomLoginContainer = ref(null);

const isDebugMode = ref(false);

const checkDebugMode = () => {
  const debugParam = route.query.debug;
  isDebugMode.value = debugParam === "true" || debugParam === "1";
  if (isDebugMode.value) {
    document.body.classList.add("debug-mode");
  } else {
    document.body.classList.remove("debug-mode");
  }
};

// 修改 handleRegister 函数
const handleRegister = () => {
  router.push("/register");
};

const showPolicies = () => {
  window.open("https://home.qj-robots.com/policies.pdf", "_blank");
};

onMounted(() => {
  checkDebugMode();
  // 创建企业微信登录面板
  // if (wecomLoginContainer.value) {
  //   wecom.createWWLoginPanel({
  //     el: wecomLoginContainer.value,
  //     params: {
  //       login_type: 'CorpApp',
  //       appid: 'wwb5a4214455e4bf68',
  //       agentid: '1000002',
  //       redirect_uri: 'https://jwd.vooice.tech/',
  //       state: 'loginState',
  //       redirect_type: 'callback',
  //     },
  //     onCheckWeComLogin({ isWeComLogin }) {
  //       console.log(isWeComLogin)
  //     },
  //     onLoginSuccess({ code }) {
  //       doPost(`/system/wecom/login?code=${code}`)
  //         .then((response) => {
  //           console.log('Login successful:', response.data.data.accessToken);
  //           localStorage.setItem('access_token', response.data.data.accessToken)
  //           window.location.href = '/'
  //         })
  //         .catch(error => {
  //           console.error('Login failed:', error);
  //         });
  //     },
  //     onLoginFail(err) {
  //       console.log(err)
  //     },
  //   })

  // 在创建完成后隐藏 loading
  //
  // }
  isLoading.value = false;
  // 检查是否有保存的登录信息
  const savedUsername = localStorage.getItem("rememberedUsername");
  const savedPassword = localStorage.getItem("rememberedPassword");

  if (savedUsername && savedPassword) {
    username.value = savedUsername;
    // 解密保存的密码
    password.value = decryptPassword(savedPassword);
    rememberMe.value = true;
  }

  // 清除自动填充样式
  setTimeout(() => {
    const inputs = document.querySelectorAll("input");
    inputs.forEach((input) => {
      input.style.backgroundColor = "transparent";
      input.style.boxShadow = "none";
    });
  }, 100);

  // 检查路由查询参数中是否有邮箱地址
  const emailFromRegister = route.query.email;
  if (emailFromRegister) {
    username.value = emailFromRegister;
  }
});

watch(
  () => route.query,
  () => {
    checkDebugMode();
  },
  { deep: true }
);
</script>

<style scoped>
.login-container {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  min-height: 100vh;
  height: 100vh;
  background-color: #f0f4f9;
  overflow: hidden;
  /* 修改这里 */
  box-sizing: border-box;
  /* 添加行 */
  padding: 20px 0;
  /* 添加这行，给顶部和底部一些内边距 */
  overflow-x: hidden; /* 添加这一行 */
}

.login-box {
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #ffffff;
  border-radius: 8px;
  padding: 40px;
  width: 90%;
  max-width: 1200px;
  height: auto;
  max-height: calc(100vh - 120px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin: auto;
  overflow-y: auto;
  box-sizing: border-box;
  overflow-x: hidden;
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.login-header h2 {
  font-size: 28px;
  color: #333;
}

.login-form {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 458px;
  margin: 0 auto;
}

.input-item {
  width: 100%;
  max-width: 458px;
  margin-bottom: 20px;
}

.input-wrapper {
  position: relative;
  width: 100%;
}

.error-message {
  position: absolute;
  top: -12px; /* 调整这个值，使错误信息更靠上 */
  right: 10px;
  color: #ff4d4f;
  font-size: 18px;
  background-color: white;
  padding: 0 6px;
  border-radius: 2px;
  z-index: 1;
  box-shadow: 0 0 0 1px white;
  font-weight: 500;
  line-height: 1; /* 添加这行以确保文本垂直居中 */
}

.login-actions {
  width: 100%;
  max-width: 458px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
}

.login-button {
  width: 140px;
  height: 50px;
  font-size: 18px;
}

.footer {
  width: 100%;
  padding: 10px 0;
  background-color: #f0f4f9;
  text-align: center;
}

.footer-content {
  font-size: 14px;
  color: #606266;
}

.footer-content p {
  margin: 5px 0;
}

/* 添加响应式设计 */
@media (max-height: 800px) {
  .login-box {
    padding: 20px;
    max-height: calc(100vh - 80px);
    /* 调整最大高度 */
  }

  .login-header h2 {
    font-size: 24px;
  }

  .input-item {
    margin-bottom: 15px;
  }

  .login-button {
    height: 40px;
    font-size: 16px;
  }
}

/* 覆盖 NaiveUI 默认样式 */
:deep(input:-webkit-autofill),
:deep(input:-webkit-autofill:hover),
:deep(input:-webkit-autofill:focus),
:deep(input:-webkit-autofill:active) {
  -webkit-box-shadow: 0 0 0 30px white inset !important;
  -webkit-text-fill-color: #333 !important;
}

:deep(.n-input) {
  max-width: 100%;
  background-color: transparent !important;
}

:deep(.n-input__input) {
  height: 56px;
  /* 稍微增加高度 */
  font-size: 18px;
  /* 增加字体大小 */
  background-color: transparent !important;
}

:deep(.n-input__input-el) {
  height: 56px;
  /* 确保输入元素高度与外层一致 */
  line-height: 56px;
  /* 设置行高等于高度，使文本垂直居中 */
  font-size: 18px;
  /* 确保字体大小一致 */
  background-color: transparent !important;
  padding-top: 0;
  /* 移除顶部内边距 */
  padding-bottom: 0;
  /* 移除底部内边距 */
}

:deep(.n-input__prefix) {
  margin-right: 12px;
  /* 稍微增加图标和文本之间的距离 */
}

:deep(.n-input__prefix-icon) {
  font-size: 20px;
  /* 增加图标大小 */
}

/* 调整复选框和按钮样式以保持一致性 */
:deep(.n-checkbox) {
  font-size: 16px;
}

.login-button {
  width: 140px;
  height: 56px;
  /* 调整按钮高度与输入框一致 */
  font-size: 18px;
}

/* 添加响应式设计 */
@media (max-height: 800px) {
  :deep(.n-input__input),
  :deep(.n-input__input-el) {
    height: 48px;
    /* 在较小屏幕上稍微减小高度 */
    line-height: 48px;
    font-size: 16px;
    /* 在较小屏幕上稍微减小字体大小 */
  }

  :deep(.n-input__prefix-icon) {
    font-size: 18px;
    /* 在较小屏幕上稍微减小图标大小 */
  }

  .login-button {
    height: 48px;
    font-size: 16px;
  }
}

.login-content {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  max-width: 100%;
}

.login-form-section {
  flex: 0 0 auto;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-right: 20px;
}

.login-logo,
.login-header,
.login-form {
  width: 100%;
  text-align: center;
}

.login-form {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.input-item,
.login-actions {
  width: 100%;
}

.wecom-login-section {
  flex: 0 0 40%;
  max-width: 100%; /* 添加这一行 */
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding-left: 10px;
  /* 添加左侧内边距 */
  border-left: 1px solid #e0e0e0;
  height: 100%;
}

/* 修改 n-spin 相关样式 */
.wecom-login-section :deep(.n-spin-container) {
  width: 100%;
  height: 100%;
  margin: 0;
  /* 移除可能的外边距 */
  padding: 0;
  /* 移除可能的内边距 */
}

.wecom-login-section :deep(.n-spin-content) {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0;
  /* 移除可能的外边距 */
  padding: 0;
  /* 移除可能的内边距 */
}

/* 确保 wecomLoginContainer 内的元素居中 */
.wecom-login-section #wecomLoginContainer {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0;
  /* 移除可能的外边距 */
  padding: 0;
  /* 移除可能的内边距 */
}

/* 移除 wecom-login-section 内部元素的垂直间距 */
.wecom-login-section > * {
  margin: 0;
  /* 移除垂直间距 */
}

@media (max-width: 1024px) {
  .login-content {
    flex-direction: column;
    align-items: center;
    height: auto;
    /* 在小屏幕上允许高度自适应 */
  }

  .login-form-section,
  .wecom-login-section {
    flex: 0 0 100%;
    max-width: 100%;
    padding-right: 0;
    padding-left: 0;
  }

  .login-form-section {
    margin-bottom: 40px;
    border-bottom: 1px solid #e0e0e0;
    /* 在小屏幕上添加底部边框 */
    padding-bottom: 40px;
    /* 添加底部内边距 */
  }

  .wecom-login-section {
    border-left: none;
    padding-top: 40px;
    height: auto;
  }

  .login-box {
    padding: 20px; /* 减少内边距 */
  }
}

/* 修改调试模式样式 */
:global(.debug-mode) div {
  position: relative !important;
}

:global(.debug-mode) div::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border: 0.2px solid rgba(128, 128, 128, 0.5);
  pointer-events: none;
  z-index: 9999;
}

:global(.debug-mode) div::before {
  content: attr(class);
  position: absolute;
  top: 0;
  left: 0;
  background: rgba(255, 255, 255, 0.8);
  padding: 2px 4px;
  font-size: 10px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  box-sizing: border-box;
  z-index: 10000;
  pointer-events: none;
}

/* 调整输入框样式 */
:deep(.n-input__placeholder) {
  text-align: left;
  padding-left: 40px;
  /* 整此值以匹配图标和文本之间的距离 */
}

:deep(.n-input__input:not(:placeholder-shown)) {
  text-align: left;
  padding-left: 40px;
  /* 确保输入的文本与 placeholder 对齐 */
}

:deep(.n-input__input:focus::placeholder) {
  color: transparent;
}

.footer-text {
  display: flex;
  align-items: center;
  justify-content: center;
}

.footer-icon {
  width: 1.2rem;
  height: 1.2rem;
  margin-right: 0.26rem;
}

.login-logo {
  width: 100%;
  text-align: center;
  margin-top: 40px; /* 增加上边距 */
  margin-bottom: 20px; /* 可选：如果需要，也可以增加下边距 */
}

.register-link {
  width: 100%;
  max-width: 458px;
  text-align: center;
  margin-top: 20px;
}

.register-link :deep(.n-button) {
  font-size: 14px;
  color: #1890ff;
}

.register-link :deep(.n-button:hover) {
  color: #40a9ff;
}

/* 响应式设计部分 */
@media (max-width: 1024px) {
  .register-link {
    margin-top: 15px;
  }
}

.error-message {
  color: #ff4d4f;
  font-size: 14px;
  margin-top: 5px;
  display: block;
}

:deep(.n-input.n-input--error) {
  border-color: #ff4d4f;
}

:deep(.n-input.n-input--error:hover),
:deep(.n-input.n-input--error:focus) {
  border-color: #ff7875;
  box-shadow: 0 0 0 2px rgba(255, 77, 79, 0.2);
}

/* 添加这个新的样式来调整输入框在错误状态下的内边距 */
:deep(.n-input.n-input--error .n-input__input-el) {
  padding-right: 30px; /* 为错误图标留出空间 */
}

/* 添加这个新的样式来调整错误图标的位置 */
:deep(.n-input.n-input--error .n-input__suffix) {
  right: 10px; /* 调整错误图标的位置 */
}

/* 确保所有可能导致溢出的元素都不会超过其容器宽度 */
.login-logo img,
.input-item,
.login-actions,
.register-link {
  max-width: 100%;
}
</style>