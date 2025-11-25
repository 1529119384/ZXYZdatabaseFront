<template>
  <div class="temp">


















    <el-button @click="fileUploadDialog = true">文件上传</el-button>
    <el-button @click="triggerFolderSelect">文件夹上传</el-button>












    <!-- 文件上传 -->
    <el-dialog v-model="fileUploadDialog"
      title="文件上传"
      width="500"
      modal
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false">
      <el-upload drag
        action="http://127.0.0.1:4523/m1/7374019-7106024-default/upload"
        :auto-upload="false"
        multiple
        ref="uploadFiles"
        :on-success="fileUploadSuccess">
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">
          将文件拖到此处或<em>点击上传</em>
        </div>
        <template #tip>
          <div>
            温馨提示温馨提示温馨提示温馨提示
          </div>
        </template>
      </el-upload>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="fileUploadDialog = false">取消</el-button>
          <el-button type="primary"
            @click="fileUpload">
            上传
          </el-button>
        </div>
      </template>
    </el-dialog>







    <!-- 文件夹上传 -->
    <!-- 隐藏实际上传入口 -->
    <input ref="folderInput"
      type="file"
      webkitdirectory
      multiple
      hidden
      @change="onFolderSelected" />


    <el-dialog v-model="folderUploadDialog"
      title="文件夹上传"
      width="500"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false">
      <el-scrollbar height="100%"
        v-if="folderTree.length">
        <el-tree-v2 :data="folderTree"
          show-checkbox
          :props="{ label: 'name' }"
          @check="onCheck">
          <template #default="{ node }">
            <el-icon :class="{ 'is-leaf': node.isLeaf }">
              <Document v-if="node.isLeaf" />
              <Folder v-else-if="!node.expanded" />
              <FolderOpened v-else />
            </el-icon>
            <span>{{ node.label }}</span>
            <span v-if="node.data.isLeaf"
              style="margin-left:auto; padding-left:12px; color:#909399; font-size:12px;">
              {{ formatSize(node.data.size) }}
            </span>
          </template>
        </el-tree-v2>
      </el-scrollbar>
      <template #footer>
        <el-button @click="folderUploadDialog = false">取消</el-button>
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

import { ElMessage, ElLoading } from "element-plus";
import axios from "axios";
import { UploadFilled } from '@element-plus/icons-vue'
import { ref } from 'vue';
const fileUploadDialog = ref(false)
const uploadFiles = ref(null)
const fileUpload = () => {
  uploadFiles.value.submit()
}
const fileUploadSuccess = (response, file, fileList) => {
  console.log(response);
  ElMessage.success('上传成功')
}



// 文件夹上传
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
  const files = Array.from(e.target.files);
  buildFolderTree(files);
  folderUploadDialog.value = true;
}


function buildFolderTree(files) {
  const root = [];
  const pathNodeMap = new Map();
  let id = 0;

  files.forEach((file) => {
    const parts = file.webkitRelativePath.split("/");
    let currentLevel = root;
    let fullPath = "";

    parts.forEach((name, idx) => {
      fullPath += (fullPath ? "/" : "") + name;
      const isFile = idx === parts.length - 1;

      let node = pathNodeMap.get(fullPath);

      if (!node) {
        node = {
          id: ++id,
          name,
          children: isFile ? null : [],
          isLeaf: isFile,
          size: isFile ? file.size : 0,
        };
        currentLevel.push(node);
        pathNodeMap.set(fullPath, node);

        if (isFile) fileMap.set(node.id, file);
      }

      currentLevel = node.children;
    });
  });

  const sortTree = (nodes) => {
    nodes.sort((a, b) => {
      if (a.isLeaf !== b.isLeaf) return a.isLeaf ? 1 : -1; 
      return a.name.localeCompare(b.name);
    });

    nodes.forEach((n) => n.children && sortTree(n.children));
  };

  sortTree(root);
  folderTree.value = root;
}

function onCheck(_, ctx) {
  checkedKeys.value = ctx.checkedKeys;
}


const CHUNK_SIZE = 5 * 1024 * 1024;

async function uploadInChunks(file) {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const fileId = `${file.name}-${file.size}-${Date.now()}`;

  const uploadTasks = [];

  for (let index = 0; index < totalChunks; index++) {
    const start = index * CHUNK_SIZE;
    const end = Math.min(file.size, start + CHUNK_SIZE);
    const chunk = file.slice(start, end);

    const form = new FormData();
    form.append("fileId", fileId);
    form.append("chunkIndex", index);
    form.append("totalChunks", totalChunks);
    form.append("chunk", chunk);

    uploadTasks.push(
      axios.post("http://127.0.0.1:4523/m1/7374019-7106024-default/upload", form).catch(() => {
        throw new Error(`分片 ${index + 1}/${totalChunks} 上传失败`);
      })
    );
  }

  await Promise.all(uploadTasks);

  // 通知后端合并
  await axios.post("/upload/merge", {
    fileId,
    fileName: file.webkitRelativePath || file.name,
  });
}

async function uploadSelectedFiles() {
  const files = checkedKeys.value.map((id) => fileMap.get(id)).filter(Boolean);
  if (!files.length) return;

  uploadLoading.value = true;

  const loading = ElLoading.service({
    lock: true,
    text: "文件上传中...",
  });

  try {
    for (const file of files) {
      await uploadInChunks(file);
    }

    ElMessage.success("上传成功！");
  } catch (err) {
    console.error(err);
    ElMessage.error("上传过程中发生错误");
  } finally {
    loading.close();
    uploadLoading.value = false;
  }
}
function formatSize(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + " " + units[i];
}

</script>

<style scoped>
.temp {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 100px;
}
</style>