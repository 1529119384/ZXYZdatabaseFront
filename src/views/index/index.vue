<template>
  <Uploader ref="uploaderRef" />
  <el-container>
    <el-header height="32px"
      class="header-wrap">

      <el-dropdown placement="bottom"
        trigger="click"
        :show-arrow="false">
        <el-button type="primary"
          class="custom"
          round><el-icon>
            <Upload />
          </el-icon>上传</el-button>
        <template #dropdown>
          <el-dropdown-menu>

            <el-dropdown-item @click="openFileUpload">上传文件</el-dropdown-item>
            <el-dropdown-item @click="openFolderUpload">上传文件夹</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>


      <el-button-group class="custom">
        <el-button type="primary"
          plain
          round>
          <el-icon>
            <Upload />
          </el-icon>新建文件夹</el-button>
        <el-button type="primary"
          plain
          round
          @click="refresh">
          <el-icon>
            <RefreshRight />
          </el-icon>刷新</el-button>
      </el-button-group>
      <el-button-group class="custom">
        <el-button type="primary"
          plain
          round>
          <el-icon>
            <Download />
          </el-icon>下载</el-button>
        <el-button type="primary"
          plain
          round>
          <el-icon>
            <Share />
          </el-icon>分享</el-button>
        <el-button type="primary"
          plain
          round>
          <el-icon>
            <Star />
          </el-icon>收藏</el-button>
        <el-button type="primary"
          plain
          round>
          <el-icon>
            <EditPen />
          </el-icon>重命名</el-button>
        <el-button type="primary"
          plain
          round>
          <el-icon>
            <DocumentCopy />
          </el-icon>复制</el-button>
        <el-button type="primary"
          plain
          round>
          <el-icon>
            <Rank />
          </el-icon>移动</el-button>
        <el-button type="primary"
          plain
          round>
          <el-icon>
            <Lock />
          </el-icon>锁定</el-button>
        <el-button type="primary"
          plain
          round>
          <el-icon>
            <DeleteFilled />
          </el-icon>删除</el-button>
      </el-button-group>
      <el-input v-model="searchText"
        class="input"
        style="width: 240px"
        placeholder="搜索文件"
        :suffix-icon="Search" />
    </el-header>

    <FileShow ref="fileShowRef"/>
    <!-- 上传组件 -->
  </el-container>
</template>

<script setup>
import { Search } from '@element-plus/icons-vue'
import { ref } from 'vue';
// 引入上传组件
import Uploader from '@/components/Uploader.vue';
import FileShow from '@/components/FileShow.vue';

const searchText = ref('')
const fileShowRef = ref(null);
const refresh = () =>{
  fileShowRef.value.refresh()
}
// const fileShowRef


// 上传组件引用
const uploaderRef = ref(null);
const openFileUpload = () => {
  uploaderRef.value.openFileUpload();
};

const openFolderUpload = () => {
  uploaderRef.value.openFolderUpload();
};
</script>

<style scoped>
.input :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.75);
  height: 100%;
  line-height: inherit;
  display: flex;
  align-items: center;
  border-radius: var(--el-border-radius-round);
  box-shadow: none t;
}

.input {
  margin-left: auto;
}

.header-wrap {
  display: flex;
  justify-content: flex-end;
  /* 所有子元素整体靠右 */
  align-items: center;
  /* 垂直居中 */
  gap: 10px;
  /* 各按钮/input 之间的间距，可省略 */
}

.custom {
  margin: 0 10px;
}
</style>
