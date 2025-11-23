<template>
  <div class="common-layout">
    <el-container>
      <el-header height="50px" class="app-header">
        <div class="header-left">
          <img src="@/assets/images/logo2.png" alt="logo" class="logo" />
        </div>
        <div class="header-right">
          <el-dropdown placement="bottom" trigger="click" :show-arrow="false">
            <el-avatar :size="40" :src="avatarUrl" class="avatar" @click="handleAvatarClick"/>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item>个人信息</el-dropdown-item>
                <el-dropdown-item>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

        </div>
      </el-header>
      <el-container>
        <el-aside width="200px">
          <el-menu default-active="index" router>
            <el-menu-item index="index">
              <el-icon>
                <HomeFilled />
              </el-icon>
              <span>个人空间</span>
            </el-menu-item>
            <el-menu-item index="myStar">
              <el-icon>
                <Star />
              </el-icon>
              <span>收藏文件</span>
            </el-menu-item>
            <el-menu-item index="myShare">
              <el-icon>
                <Link />
              </el-icon>
              <span>链接分享</span>
            </el-menu-item>
            <el-menu-item index="recycleBin">
              <el-icon>
                <Delete />
              </el-icon>
              <span>回收站</span>
            </el-menu-item>
            <el-menu-item index="setting">
              <el-icon>
                <Setting />
              </el-icon>
              <span>系统设置</span>
            </el-menu-item>
          </el-menu>
        </el-aside>
        <el-main>
          <router-view></router-view>
        </el-main>
      </el-container>
    </el-container>
  </div>



</template>

<script setup>
import { ref } from 'vue';
const avatarUrl = ref('https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png');

function handleAvatarClick() {
  console.log('头像被点击了')
}
</script>

<style scoped>
.app-header {
  display: flex;
  justify-content: space-between;
  /* 关键：左右撑开 */
  align-items: center;
  /* 垂直居中 */
  padding: 0 16px;
  /* 左右留点空隙 */
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.avatar {
  cursor: pointer;
  margin-right: 50px;
}

.logo {
  height: 48px;
  /* 根据实际 logo 高度调 */
  width: auto;
  display: block;
}
</style>