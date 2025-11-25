<template>
  <div class="temp">
    <el-button @click="fileUploadDialog = true">文件上传</el-button>
    <el-button @click="triggerFolderSelect">文件夹上传</el-button>

    <!-- 文件上传弹窗 -->
    <!-- 文件上传弹窗 -->
    <el-dialog v-model="fileUploadDialog" title="文件上传" width="500" :close-on-click-modal="false"
      :close-on-press-escape="false" :show-close="false">
      <!-- 拖拽/点击区域 -->
      <div class="upload-drag" @dragover.prevent @drop.prevent="handleDrop" @click="triggerSelect">
        <input ref="fileInput" type="file" multiple class="hidden-input" @change="handleSelect" />

        <div class="upload-content">
          <p>将文件拖到此处或 <em>点击上传</em></p>
          <p class="tip">温馨提示温馨提示温馨提示温馨提示</p>
        </div>
      </div>

      <!-- 文件列表展示 -->
      <div v-if="fileList.length" class="file-list">
        <div v-for="(f, index) in fileList" :key="index" class="file-item">
          <span>{{ f.name }}</span>
          <span class="file-size">
            {{ formatSize(f.size) }}
          </span>

          <!-- 删除文件 -->
          <el-icon class="remove-btn" @click.stop="removeFile(index)">
            <Close />
          </el-icon>
        </div>
      </div>

      <!-- 上传进度 -->
      <div v-if="uploading" class="upload-progress">
        <el-progress :percentage="progress" status="success" :stroke-width="12" />
      </div>

      <!-- 底部按钮 -->
      <template #footer>
        <div class="dialog-footer">
          <el-button :disabled="uploading" @click="fileUploadDialog = false">
            取消
          </el-button>

          <el-button type="primary" :loading="uploading" :disabled="!fileList.length" @click="doUpload">
            {{ uploading ? "上传中..." : "上传" }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 文件夹上传（隐藏输入框） -->
    <input ref="folderInput" type="file" webkitdirectory multiple hidden @change="onFolderSelected" />

    <!-- 文件夹上传弹窗 -->
    <el-dialog v-model="folderUploadDialog" title="文件夹上传" width="500" :close-on-click-modal="false"
      :close-on-press-escape="false" :show-close="false">
      <el-scrollbar v-if="folderTree.length" height="100%">
        <el-tree-v2 :data="folderTree" show-checkbox :props="{ label: 'name' }" @check="onCheck">
          <template #default="{ node }">
            <el-icon>
              <Document v-if="node.isLeaf" />
              <Folder v-else-if="!node.expanded" />
              <FolderOpened v-else />
            </el-icon>

            <span>{{ node.label }}</span>

            <span v-if="node.data.isLeaf" class="file-size">
              {{ formatSize(node.data.size) }}
            </span>
          </template>
        </el-tree-v2>
      </el-scrollbar>

      <template #footer>
        <el-button @click="folderUploadDialog = false">取消</el-button>
        <el-button type="primary" :loading="uploadLoading" :disabled="!checkedKeys.length || uploadLoading"
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
import { ref } from "vue";
// import axios from "axios";
import request from "@/utils/request";
import { ElMessage, ElLoading } from "element-plus";

// ========================
// 文件上传组件
// ========================
const fileUploadDialog = ref(false);
const fileInput = ref(null);
const fileList = ref([]);

const uploading = ref(false);
const progress = ref(0);

const triggerSelect = () => fileInput.value.click();

const addFiles = (files) => {
  fileList.value.push(...files);
};

const handleSelect = (e) => addFiles(Array.from(e.target.files));
const handleDrop = (e) => addFiles(Array.from(e.dataTransfer.files));

const removeFile = (index) => {
  fileList.value.splice(index, 1);
};

// 上传逻辑 + 进度条
async function doUpload() {
  uploading.value = true;
  progress.value = 0;

  let uploaded = 0;
  const total = fileList.value.length;

  for (const file of fileList.value) {
    const form = new FormData();
    form.append("file", file);

    try {
      await request.post('/upload', form, {
         headers: {},
        // 移除自定义headers，避免覆盖token
        // 对于FormData，浏览器会自动设置正确的Content-Type（包括boundary）
        onUploadProgress: (e) => {
          if (!e.total) return;
          const fileProgress = (e.loaded / e.total) * (100 / total);
          progress.value = Math.min(
            Math.round(uploaded * (100 / total) + fileProgress),
            100
          );
        },
      });

      uploaded++;
    } catch (err) {
      console.error(err);
      ElMessage.error(`上传失败：${file.name}`);
      uploading.value = false;
      return;
    }
  }

  progress.value = 100;
  ElMessage.success("全部文件上传成功!");
  uploading.value = false;
  fileUploadDialog.value = false
}


// ========================
// 文件夹上传
// ========================
const folderInput = ref(null);
const folderTree = ref([]);
const checkedKeys = ref([]);
const folderUploadDialog = ref(false);
const uploadLoading = ref(false);

const fileMap = new Map();

function triggerFolderSelect() {
  folderInput.value.click();
}

function onFolderSelected(e) {
  buildFolderTree(Array.from(e.target.files));
  folderUploadDialog.value = true;
}

// 构建树
function buildFolderTree(files) {
  const root = [];
  const pathNodeMap = new Map();
  let id = 0;

  files.forEach((file) => {
    const parts = file.webkitRelativePath.split("/");
    let current = root;
    let fullPath = "";

    parts.forEach((name, index) => {
      fullPath += (fullPath ? "/" : "") + name;
      const isFile = index === parts.length - 1;

      let node = pathNodeMap.get(fullPath);
      if (!node) {
        node = {
          id: ++id,
          name,
          children: isFile ? null : [],
          isLeaf: isFile,
          size: isFile ? file.size : 0,
        };
        current.push(node);
        pathNodeMap.set(fullPath, node);

        if (isFile) fileMap.set(node.id, file);
      }
      current = node.children;
    });
  });

  sortTree(root);
  folderTree.value = root;
}

function sortTree(nodes) {
  nodes.sort((a, b) => {
    if (a.isLeaf !== b.isLeaf) return a.isLeaf ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

  nodes.forEach((n) => n.children && sortTree(n.children));
}

function onCheck(_, ctx) {
  checkedKeys.value = ctx.checkedKeys;
}

// ========================
// 分片上传
// ========================
const CHUNK_SIZE = 5 * 1024 * 1024;

async function uploadInChunks(file) {
  const total = Math.ceil(file.size / CHUNK_SIZE);
  const fileId = `${file.name}-${file.size}-${Date.now()}`;
  const tasks = [];

  for (let i = 0; i < total; i++) {
    const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);

    const form = new FormData();
    form.append("fileId", fileId);
    form.append("chunkIndex", i);
    form.append("totalChunks", total);
    form.append("chunk", chunk);

    tasks.push(
      request.post("/api/upload", form)
    );
  }

  await Promise.all(tasks);
  await request.post("/upload/merge", {
    fileId,
    fileName: file.webkitRelativePath || file.name,
  });
}

async function uploadSelectedFiles() {
  const files = checkedKeys.value.map((id) => fileMap.get(id)).filter(Boolean);
  if (!files.length) return;

  uploadLoading.value = true;
  const loading = ElLoading.service({ lock: true, text: "文件上传中..." });

  try {
    for (const file of files) {
      await uploadInChunks(file);
    }
    ElMessage.success("上传成功！");
  } catch {
    ElMessage.error("上传过程中出错");
  } finally {
    loading.close();
    uploadLoading.value = false;
  }
}

// ========================
// 工具函数
// ========================
function formatSize(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + " " + units[i];
}
</script>
<style scoped>
.temp {
  display: flex;
  gap: 1rem;
  margin-top: 100px;
}

.upload-drag {
  width: 100%;
  padding: 40px;
  border: 2px dashed #d9d9d9;
  border-radius: 10px;
  text-align: center;
  cursor: pointer;
}

.upload-drag:hover {
  border-color: #409eff;
}

.hidden-input {
  display: none;
}

.tip {
  margin-top: 8px;
  color: #999;
}

.file-size {
  margin-left: auto;
  padding-left: 12px;
  font-size: 12px;
  color: #909399;
}

.file-list {
  margin-top: 16px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  max-height: 200px;
  overflow-y: auto;
  padding: 6px 0;
}

.file-item {
  display: flex;
  justify-content: space-between;
  padding: 6px 12px;
  border-bottom: 1px solid #f0f0f0;
  align-items: center;
  font-size: 14px;
}

.file-item:last-child {
  border-bottom: none;
}

.remove-btn {
  cursor: pointer;
  color: #f56c6c;
}

.remove-btn:hover {
  color: #ff4141;
}

.upload-progress {
  margin-top: 20px;
}
</style>
