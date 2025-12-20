<template>
  <div class="common-layout">
    <el-container>
      <el-header class="title">欢迎来到指绣云章</el-header>
      <el-main class="form">
        <br />
        <el-form style="max-width: 600px"
          :model="sizeForm"
          label-width="auto"
          :label-position="labelPosition"
          :size="size">
          <el-form-item>
            <el-input v-model="sizeForm.username"
              placeholder="请输入用户名"
              class="input">
              <template #prefix
                class="form_tip">用户名：</template>
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-input v-model="sizeForm.password"
              placeholder="请输入密码"
              class="input"
              show-password="true">
              <template #prefix
                class="form_tip">密 码：</template>
            </el-input>
          </el-form-item>
        </el-form>
        <el-text class="tip">有问题找管理员哦</el-text>
      </el-main>
    </el-container>
  </div>
</template>


<script setup>
import { reactive, ref } from 'vue'
import request from '@/utils/request'

import { useRouter, useRoute } from 'vue-router'
const router = useRouter()
const route = useRoute()

const size = ref('large')
const labelPosition = ref('left')
const sizeForm = reactive({
  password: '',
  username: ''
})

document.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    login()
  }
})
async function login() {
  // console.log(sizeForm)
  const res = await request.post('/login', sizeForm);

  console.log("登录成功，收到结果：", res)
  if (res.data && res.data.tokenValue) {
    localStorage.setItem(res.data.tokenName, JSON.stringify({ token: res.data.tokenValue }))
    const redirect = route.query.redirect || '/index'
    router.replace(redirect)
  }
}
</script>

<style scoped>
@font-face {
  font-family: "BoutiqueBitmap";
  src: url("@/assets/fonts/BoutiqueBitmap9x9_1.9.ttf") format("woff2");
}

@font-face {
  font-family: "BoutiqueBitmap9x9_3D";
  src: url("@/assets/fonts/BoutiqueBitmap9x9_3D.ttf") format("woff2");
}

.common-layout {
  height: 100vh;
  width: 100vw;
  background: url(@/assets/images/background.jpg) no-repeat center/cover;
  display: flex;
  flex-direction: column;
}

.title {
  text-align: center;
  margin-top: 48px;
  font-size: 72px;
  font-weight: 400;
  letter-spacing: 6px;
  line-height: 80px;
  color: rgba(0, 96, 128, 1);
  font-family: "BoutiqueBitmap9x9_3D", "Source Han Sans CN", "Microsoft YaHei", sans-serif;
}

/* 让“用户名：”“密 码：”两个字号、颜色都听你的 */
.input :deep(.el-input__prefix) {
  font-size: 24px;
  color: rgba(69, 159, 201, 1);
  font-family: "BoutiqueBitmap", "Source Han Sans CN", "Microsoft YaHei", sans-serif;
  margin-right: 8px;
  /* 与输入框距离 */
  white-space: nowrap;
  /* 防止被挤换行 */
}

.form {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
}

/* 账号/密码输入框样式 */
.input {
  width: 700px;
  height: 60px;
}

/* 统一设置输入框相关组件的样式 */
.input :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.75);

  height: 100%;
  line-height: inherit;
  display: flex;
  align-items: center;
  border-radius: var(--el-border-radius-round);
  box-shadow: none t;
}

.input :deep(input) {
  font-size: 22px;
  height: 100%;
  line-height: inherit;
  padding-right: 40px;
}

.input :deep(input::placeholder) {
  opacity: 1;
  font-size: 24px;
  font-weight: 400;
  color: rgba(129, 129, 129, 1);
  font-family: "BoutiqueBitmap", "Source Han Sans CN", "Microsoft YaHei", sans-serif;
}

/* 确保密码按钮垂直居中 */
.input :deep(.el-input__suffix-inner) {
  display: flex;
  align-items: center;
}

.tip {
  width: 100%;
  height: 60px;
  font-size: 48px;
  line-height: 60px;
  color: white;
  text-align: center;
}
</style>
