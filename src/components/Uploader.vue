<template>
  <div class="uploader">
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
            {{ $formatSize(f.size) }}
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
          :props="{ label: 'name' }">
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
              {{ $formatSize(node.data.size) }}

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
          :disabled="uploadLoading"
          @click="uploadSelectedFiles">
          <el-icon>
            <Upload />
          </el-icon>
          {{ uploadLoading ? "上传中..." : "上传文件夹" }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import request from '@/utils/request'
import { ElMessage, ElLoading } from 'element-plus'
import { useCurrentIdStore } from '@/store/currentId'

/* =====================================================
   Store & 通用
===================================================== */

const currentIdStore = useCurrentIdStore()

/* =====================================================
   一、普通文件上传（File Upload）
===================================================== */

const fileUploadDialog = ref(false)
const fileInput = ref(null)

const fileList = ref([])
const uploading = ref(false)
const progress = ref(0)

/* 选择 / 拖拽文件 */

const triggerSelect = () => fileInput.value?.click()
const handleDragOver = e => e.preventDefault()

function appendFiles(files) {
  fileList.value.push(...files)
}

function handleSelect(e) {
  appendFiles(Array.from(e.target.files))
  e.target.value = ''
}

function handleDrop(e) {
  appendFiles(Array.from(e.dataTransfer.files))
}

function removeFile(index) {
  fileList.value.splice(index, 1)
}

/* 上传逻辑 */

async function uploadSingleFile(file, onProgress) {
  const form = new FormData()
  form.append('file', file, file.name)
  form.append('parentId', currentIdStore.currentId)

  await request.post('/uploadFile', form, {
    onUploadProgress: onProgress
  })
}

async function doUpload() {
  if (!fileList.value.length) return

  uploading.value = true
  progress.value = 0

  const total = fileList.value.length
  let finished = 0

  try {
    for (const file of fileList.value) {
      await uploadSingleFile(file, e => {
        if (!e.total) return
        const single = (e.loaded / e.total) * (100 / total)
        progress.value = Math.min(
          Math.round(finished * (100 / total) + single),
          100
        )
      })
      finished++
    }

    ElMessage.success('全部文件上传成功')
    fileUploadDialog.value = false
    fileList.value = []
  } catch {
    ElMessage.error('文件上传失败')
  } finally {
    uploading.value = false
    progress.value = 100
  }
}

/* =====================================================
   二、文件夹上传（Folder Upload）
===================================================== */

const folderInput = ref(null)
const folderUploadDialog = ref(false)

const folderTree = ref([])
const uploadLoading = ref(false)
const fileMap = new Map()

/* 构建文件夹树 */

function buildFolderTree(files) {
  const root = []
  const pathMap = new Map()
  let nodeId = 0

  files.forEach(file => {
    const paths = file.webkitRelativePath.split('/')
    let current = root
    let fullPath = ''

    paths.forEach((name, index) => {
      fullPath += (fullPath ? '/' : '') + name
      const isLeaf = index === paths.length - 1

      let node = pathMap.get(fullPath)
      if (!node) {
        node = {
          id: ++nodeId,
          name,
          isLeaf,
          children: isLeaf ? null : [],
          size: isLeaf ? file.size : 0, // 文件大小，文件夹为0
          folderId: null
        }
        current.push(node)
        pathMap.set(fullPath, node)
        if (isLeaf) fileMap.set(node.id, file)
      }
      current = node.children
    })
  })

  sortTree(root)
  folderTree.value = root
}

function sortTree(nodes) {
  nodes.sort((a, b) =>
    a.isLeaf === b.isLeaf
      ? a.name.localeCompare(b.name)
      : a.isLeaf ? 1 : -1
  )
  nodes.forEach(n => n.children && sortTree(n.children))
}

/* 文件夹选择 */

function onFolderSelected(e) {
  buildFolderTree(Array.from(e.target.files))
  folderUploadDialog.value = true
  e.target.value = ''
}

/* 接口调用 */

async function createFolder(folderName, parentId) {
  const params = new URLSearchParams()
  params.append('folderName', folderName)
  params.append('parentId', parentId)

  const res = await request.post('/uploadFolder', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
  return res.data
}

/* 树递归上传（核心优化点） */

async function processTree(nodes, parentId) {
  for (const node of nodes) {
    let currentParentId = parentId

    if (!node.isLeaf) {
      currentParentId = await createFolder(node.name, parentId)
    }

    if (node.isLeaf) {
      const file = fileMap.get(node.id)
      if (file) {
        const form = new FormData()
        form.append('file', file, file.name)
        form.append('parentId', parentId)
        await request.post('/uploadFile', form)
      }
    }

    if (node.children) {
      await processTree(node.children, currentParentId)
    }
  }
}

async function uploadSelectedFiles() {
  uploadLoading.value = true
  const loading = ElLoading.service({ text: '文件上传中...' })

  try {
    await processTree(folderTree.value, currentIdStore.currentId)
    ElMessage.success('上传成功')
    folderUploadDialog.value = false
  } catch {
    ElMessage.error('上传失败')
  } finally {
    uploadLoading.value = false
    loading.close()
  }
}

/* =====================================================
   对外暴露
===================================================== */

defineExpose({
  openFileUpload() {
    fileUploadDialog.value = true
  },
  openFolderUpload() {
    folderInput.value?.click()
  }
})
</script>


<style scoped>
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
