<template>
  <!-- 主容器 -->
  <div class="temp">
    <!-- 文件上传按钮：点击打开文件上传弹窗 -->
    <el-button @click="fileUploadDialog = true">文件上传</el-button>
    <!-- 文件夹上传按钮：点击打开文件夹选择对话框 -->
    <el-button @click="triggerFolderSelect">文件夹上传</el-button>

    <!-- 文件上传弹窗 -->
    <el-dialog v-model="fileUploadDialog"
      title="文件上传"
      width="500"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false">
      <!-- 拖拽/点击上传区域 -->
      <div class="upload-drag"
        @dragover.prevent="handleDragOver"
        @drop.prevent="handleDrop"
        @click="triggerSelect">
        <!-- 隐藏的文件选择输入框 -->
        <input ref="fileInput"
          type="file"
          multiple
          class="hidden-input"
          @change="handleSelect" />

        <!-- 上传区域提示内容 -->
        <div class="upload-content">
          <p>将文件拖到此处或 <em>点击上传</em></p>
          <p class="tip">温馨提示温馨提示温馨提示温馨提示</p>
        </div>
      </div>

      <!-- 文件列表展示：仅当有文件时显示 -->
      <div v-if="fileList.length"
        class="file-list">
        <!-- 遍历文件列表，显示每个文件信息 -->
        <div v-for="(f, index) in fileList"
          :key="index"
          class="file-item">
          <!-- 文件名 -->
          <span>{{ f.name }}</span>
          <!-- 文件大小 -->
          <span class="file-size">
            {{ formatSize(f.size) }}
          </span>

          <!-- 删除文件按钮 -->
          <el-icon class="remove-btn"
            @click.stop="removeFile(index)">
            <Close />
          </el-icon>
        </div>
      </div>

      <!-- 上传进度条：仅当上传中时显示 -->
      <div v-if="uploading"
        class="upload-progress">
        <el-progress :percentage="progress"
          status="success"
          :stroke-width="12" />
      </div>

      <!-- 弹窗底部按钮 -->
      <template #footer>
        <div class="dialog-footer">
          <!-- 取消按钮：上传中时禁用 -->
          <el-button :disabled="uploading"
            @click="fileUploadDialog = false">
            取消
          </el-button>

          <!-- 上传按钮：上传中显示加载状态，无文件时禁用 -->
          <el-button type="primary"
            :loading="uploading"
            :disabled="!fileList.length"
            @click="doUpload">
            {{ uploading ? "上传中..." : "上传" }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 文件夹上传（隐藏输入框）：支持webkitdirectory属性选择文件夹 -->
    <input ref="folderInput"
      type="file"
      webkitdirectory
      multiple
      hidden
      @change="onFolderSelected" />

    <!-- 文件夹上传弹窗：展示文件夹结构和上传已勾选文件 -->
    <el-dialog v-model="folderUploadDialog"
      title="文件夹上传"
      width="500"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false">
      <!-- 文件夹树状结构：使用滚动条包裹 -->
      <el-scrollbar v-if="folderTree.length"
        height="100%">
        <!-- 树状组件：支持多选，展示文件夹结构 -->
        <el-tree-v2 :data="folderTree"
          show-checkbox
          :props="{ label: 'name' }"
          @check="onCheck">
          <!-- 自定义树节点内容：根据节点类型显示不同图标 -->
          <template #default="{ node }">
            <el-icon>
              <!-- 文件图标 -->
              <Document v-if="node.isLeaf" />
              <!-- 未展开文件夹图标 -->
              <Folder v-else-if="!node.expanded" />
              <!-- 已展开文件夹图标 -->
              <FolderOpened v-else />
            </el-icon>

            <!-- 节点名称 -->
            <span>{{ node.label }}</span>

            <!-- 文件大小：仅文件节点显示 -->
            <span v-if="node.data.isLeaf"
              class="file-size">
              {{ formatSize(node.data.size) }}
            </span>
          </template>
        </el-tree-v2>
      </el-scrollbar>

      <!-- 文件夹上传弹窗底部按钮 -->
      <template #footer>
        <!-- 取消按钮 -->
        <el-button @click="folderUploadDialog = false">取消</el-button>
        <!-- 上传已勾选按钮：上传中显示加载状态，无勾选文件时禁用 -->
        <el-button type="primary"
          :loading="uploadLoading"
          :disabled="!checkedKeys.length || uploadLoading"
          @click="uploadSelectedFiles">
          <el-icon>
            <Upload />
          </el-icon>
          {{ uploadLoading ? "上传中..." : "上传已勾选" }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
// 导入Vue的ref响应式API
import { ref } from "vue";
// 导入自定义请求工具
import request from "@/utils/request";
// 导入Element Plus的消息提示和加载组件
import { ElMessage, ElLoading } from "element-plus";

// ========================
// 文件上传组件相关变量和函数
// ========================

// 文件上传弹窗显示状态
const fileUploadDialog = ref(false);
// 文件选择输入框的引用
const fileInput = ref(null);
// 已选择的文件列表
const fileList = ref([]);
// 上传状态标记
const uploading = ref(false);
// 上传进度百分比
const progress = ref(0);

/**
 * 触发文件选择对话框
 */
const triggerSelect = () => fileInput.value.click();

/**
 * 处理文件拖拽悬停事件
 */
const handleDragOver = (e) => e.preventDefault();

/**
 * 向文件列表添加文件
 */
const addFiles = (files) => fileList.value.push(...files);

/**
 * 处理文件选择事件
 */
const handleSelect = (e) => addFiles(Array.from(e.target.files));

/**
 * 处理文件拖放事件
 */
const handleDrop = (e) => addFiles(Array.from(e.dataTransfer.files));

/**
 * 从文件列表中移除指定索引的文件
 * @param {number} index - 要移除的文件索引
 */
const removeFile = (index) => {
  fileList.value.splice(index, 1);
};

/**
 * 上传单个文件
 * @param {File} file - 要上传的文件
 * @param {Function} onProgress - 进度回调函数
 */
async function uploadSingleFile(file, onProgress) {
  // 创建FormData对象，用于发送文件数据
  const form = new FormData();
  form.append("file", file);

  // 发送文件上传请求
  await request.post('/uploadFile', form, {
    // 上传进度回调函数
    onUploadProgress: onProgress,
  });
}

/**
 * 执行文件上传逻辑，支持进度条显示
 */
async function doUpload() {
  // 设置上传状态为true
  uploading.value = true;
  // 初始化进度为0
  progress.value = 0;

  // 已上传文件数量
  let uploaded = 0;
  // 总文件数量
  const total = fileList.value.length;

  // 遍历文件列表，逐个上传
  for (const file of fileList.value) {
    try {
      // 上传单个文件
      await uploadSingleFile(file, (e) => {
        // 如果没有总大小信息，直接返回
        if (!e.total) return;
        // 计算当前文件的上传进度占总进度的比例
        const fileProgress = (e.loaded / e.total) * (100 / total);
        // 更新总进度，确保不超过100%
        progress.value = Math.min(
          Math.round(uploaded * (100 / total) + fileProgress),
          100
        );
      });
      // 上传成功，已上传数量+1
      uploaded++;
    } catch (err) {
      // 上传失败，打印错误信息
      console.error(err);
      // 显示错误消息
      ElMessage.error(`上传失败：${file.name}`);
      // 重置上传状态
      uploading.value = false;
      return;
    }
  }

  // 所有文件上传成功，设置进度为100%
  progress.value = 100;
  // 显示成功消息
  ElMessage.success("全部文件上传成功!");
  // 重置上传状态
  uploading.value = false;
  // 关闭上传弹窗
  fileUploadDialog.value = false
}


// ========================
// 文件夹上传相关变量和函数
// ========================

// 文件夹选择输入框的引用
const folderInput = ref(null);
// 文件夹树状结构数据
const folderTree = ref([]);
// 已勾选的文件/文件夹ID列表
const checkedKeys = ref([]);
// 文件夹上传弹窗显示状态
const folderUploadDialog = ref(false);
// 文件夹上传加载状态
const uploadLoading = ref(false);

// 文件ID到文件对象的映射，用于快速查找文件
const fileMap = new Map();

/**
 * 触发文件夹选择对话框
 */
function triggerFolderSelect() {
  folderInput.value.click();
}

/**
 * 处理文件夹选择事件
 * @param {Event} e - 文件夹选择事件对象
 */
function onFolderSelected(e) {
  // 构建文件夹树状结构
  buildFolderTree(Array.from(e.target.files));
  // 打开文件夹上传弹窗
  folderUploadDialog.value = true;
}

/**
 * 构建文件夹树状结构
 * @param {File[]} files - 包含webkitRelativePath属性的文件数组
 */
function buildFolderTree(files) {
  // 根节点数组
  const root = [];
  // 路径到节点的映射，用于快速查找父节点
  const pathNodeMap = new Map();
  // 节点ID计数器
  let id = 0;

  // 遍历所有文件
  files.forEach((file) => {
    // 按/分割文件的相对路径，得到路径片段
    const parts = file.webkitRelativePath.split("/");
    // 当前父节点数组
    let current = root;
    // 当前完整路径
    let fullPath = "";

    // 遍历路径片段，构建树状结构
    parts.forEach((name, index) => {
      // 更新完整路径
      fullPath += (fullPath ? "/" : "") + name;
      // 判断当前是否为文件节点（最后一个片段）
      const isFile = index === parts.length - 1;

      // 查找当前路径是否已存在节点
      let node = pathNodeMap.get(fullPath);
      if (!node) {
        // 创建新节点
        node = {
          id: ++id, // 唯一ID
          name, // 节点名称
          children: isFile ? null : [], // 文件节点没有子节点
          isLeaf: isFile, // 是否为叶子节点（文件）
          size: isFile ? file.size : 0, // 文件大小，文件夹为0
          folderId: null
        };
        // 将节点添加到父节点数组
        current.push(node);
        // 保存路径到节点的映射
        pathNodeMap.set(fullPath, node);

        // 如果是文件节点，保存到文件映射中
        if (isFile) fileMap.set(node.id, file);
      }
      // 更新当前父节点数组为当前节点的子节点数组
      current = node.children;
    });
  });

  // 对树状结构进行排序
  sortTree(root);
  // 更新文件夹树状结构数据
  folderTree.value = root;
}

/**
 * 对树状结构进行排序：文件夹在前，文件在后，同名按字母顺序
 * @param {Array} nodes - 节点数组
 */
function sortTree(nodes) {
  // 对当前节点数组进行排序
  nodes.sort((a, b) => {
    // 文件夹在前，文件在后
    if (a.isLeaf !== b.isLeaf) return a.isLeaf ? 1 : -1;
    // 同名按字母顺序排序
    return a.name.localeCompare(b.name);
  });

  // 递归排序子节点
  nodes.forEach((n) => n.children && sortTree(n.children));
}

/**
 * 处理树节点勾选事件
 * @param {Array} _ - 勾选的节点数据（未使用）
 * @param {Object} ctx - 勾选上下文，包含checkedKeys等信息
 */
function onCheck(_, ctx) {
  // 更新已勾选的节点ID列表
  checkedKeys.value = ctx.checkedKeys;
}



/**
 * 发送文件夹名称给后端
 * @param {string} folderName - 文件夹名称
 */
async function sendFolderName(folderName, parentId) {
  try {
    const params = new URLSearchParams();
    params.append("folderName", folderName);

    if (parentId !== undefined && parentId !== null) {
      params.append("parentId", parentId);
    }

    const res = await request.post("/uploadFolder", params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    return res.data;
  } catch (err) {
    console.error(err);
    ElMessage.error(`创建文件夹失败：${folderName}`);
    throw err;
  }
}



/**
 * 递归遍历树节点，处理选中的文件和文件夹
 * @param {Array} nodes - 树节点数组
 */
async function processTreeNodes(nodes, parentFolderId) {
  for (const node of nodes) {
    // 是否被用户勾选？
    const checked = checkedKeys.value.includes(node.id);

    let currentFolderId = parentFolderId;

    // 如果是文件夹，并且被勾选，先往后端创建文件夹
    if (!node.isLeaf && checked) {
      const folderId = await sendFolderName(node.name, parentFolderId);
      node.folderId = folderId;       // ⭐ 保存该文件夹的 ID
      currentFolderId = folderId;     // ⭐ 作为其子节点的父 ID
    }

    // 如果是文件并且被勾选 → 上传文件（带 parentId）
    if (node.isLeaf && checked) {
      const file = fileMap.get(node.id);
      if (file) {
        const form = new FormData();
        form.append("file", file);
        form.append("parentId", parentFolderId);   // ⭐ 关键：文件属于父文件夹

        await request.post("/uploadFile", form);
      }
    }

    // 无论是否勾选，都要继续往下递归（因为子节点可能勾选）
    if (node.children && node.children.length > 0) {
      await processTreeNodes(node.children, currentFolderId);
    }
  }
}


/**
 * 上传已勾选的文件和文件夹
 */
async function uploadSelectedFiles() {
  // 如果没有勾选节点，直接返回
  if (!checkedKeys.value.length) return;

  // 设置上传加载状态
  uploadLoading.value = true;
  // 显示全局加载提示
  const loading = ElLoading.service({ lock: true, text: "文件上传中..." });

  try {
    // 递归遍历所有节点，处理选中的节点
    await processTreeNodes(folderTree.value);
    // 所有文件和文件夹上传成功，显示成功消息
    ElMessage.success("上传成功！");
  } catch (error) {
    // 上传过程中出错，显示错误消息
    console.error("上传失败:", error);
    ElMessage.error("上传过程中出错");
  } finally {
    // 关闭全局加载提示
    loading.close();
    // 重置上传加载状态
    uploadLoading.value = false;
  }


}

// ========================
// 工具函数
// ========================

/**
 * 格式化文件大小，将字节转换为可读格式（B、KB、MB、GB）
 * @param {number} bytes - 文件大小（字节）
 * @returns {string} 格式化后的文件大小
 */
function formatSize(bytes) {
  // 如果字节数为0，直接返回0 B
  if (!bytes) return "0 B";
  // 单位数组
  const units = ["B", "KB", "MB", "GB"];
  // 计算单位索引
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  // 格式化并返回结果
  return (bytes / Math.pow(1024, i)).toFixed(1) + " " + units[i];
}
</script>
<style scoped>
/* 主容器样式 */
.temp {
  display: flex;
  /* 使用flex布局 */
  gap: 1rem;
  /* 按钮之间的间距 */
  margin-top: 100px;
  /* 顶部外边距 */
}

/* 拖拽上传区域样式 */
.upload-drag {
  width: 100%;
  /* 宽度100% */
  padding: 40px;
  /* 内边距40px */
  border: 2px dashed #d9d9d9;
  /* 2px虚线边框，颜色为浅灰色 */
  border-radius: 10px;
  /* 圆角10px */
  text-align: center;
  /* 文本居中 */
  cursor: pointer;
  /* 鼠标悬停时显示指针 */
  transition: border-color 0.3s ease;
  /* 边框颜色过渡效果 */
}

/* 拖拽上传区域悬停样式 */
.upload-drag:hover {
  border-color: #409eff;
  /* 悬停时边框颜色变为蓝色 */
}

/* 隐藏的文件选择输入框 */
.hidden-input {
  display: none;
  /* 隐藏输入框 */
}

/* 上传提示文字样式 */
.tip {
  margin-top: 8px;
  /* 顶部外边距8px */
  color: #999;
  /* 文字颜色为灰色 */
}

/* 文件大小样式 */
.file-size {
  margin-left: auto;
  /* 自动左边距，将文件大小推到右侧 */
  padding-left: 12px;
  /* 左侧内边距12px */
  font-size: 12px;
  /* 字体大小12px */
  color: #909399;
  /* 文字颜色为浅灰色 */
}

/* 文件列表容器样式 */
.file-list {
  margin-top: 16px;
  /* 顶部外边距16px */
  border: 1px solid #ebeef5;
  /* 1px实线边框，颜色为浅灰色 */
  border-radius: 6px;
  /* 圆角6px */
  max-height: 200px;
  /* 最大高度200px */
  overflow-y: auto;
  /* 垂直方向溢出时显示滚动条 */
  padding: 6px 0;
  /* 上下内边距6px，左右0 */
}

/* 文件项样式 */
.file-item {
  display: flex;
  /* 使用flex布局 */
  justify-content: space-between;
  /* 两端对齐 */
  padding: 6px 12px;
  /* 上下内边距6px，左右12px */
  border-bottom: 1px solid #f0f0f0;
  /* 底部边框，颜色为浅灰色 */
  align-items: center;
  /* 垂直居中对齐 */
  font-size: 14px;
  /* 字体大小14px */
  transition: background-color 0.2s ease;
  /* 背景颜色过渡效果 */
}

/* 鼠标悬停在文件项上的样式 */
.file-item:hover {
  background-color: #fafafa;
  /* 悬停时背景颜色变为浅灰色 */
}

/* 最后一个文件项，移除底部边框 */
.file-item:last-child {
  border-bottom: none;
  /* 移除最后一个文件项的底部边框 */
}

/* 删除按钮样式 */
.remove-btn {
  cursor: pointer;
  /* 鼠标悬停时显示指针 */
  color: #f56c6c;
  /* 文字颜色为红色 */
  transition: color 0.3s ease;
  /* 颜色过渡效果 */
  margin-left: 12px;
  /* 左侧外边距12px */
}

/* 删除按钮悬停样式 */
.remove-btn:hover {
  color: #ff4141;
  /* 悬停时文字颜色变为深红色 */
}

/* 上传进度条容器样式 */
.upload-progress {
  margin-top: 20px;
  /* 顶部外边距20px */
}
</style>
