<template>
  <div class="uploader">
    <el-dialog v-model="fileUploadDialog"
      title="文件上传"
      width="500"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
      @closed="resetFileUploadState">
      <div class="upload-drag"
        @dragover.prevent="handleDragOver"
        @drop.prevent="handleDrop"
        @click="triggerSelect">
        <input ref="fileInput"
          type="file"
          multiple
          class="hidden-input"
          @change="handleSelect" />

        <div class="upload-content">
          <p>将文件拖到此处或 <em>点击上传</em></p>
          <p class="tip">支持多文件上传，重复文件会自动忽略</p>
        </div>
      </div>

      <div v-if="fileList.length"
        class="file-list">
        <div v-for="(f, index) in fileList"
          :key="getFileKey(f)"
          class="file-item">
          <span class="file-name">{{ f.name }}</span>
          <span class="file-size">
            {{ $formatSize(f.size) }}
          </span>
          <el-icon class="remove-btn"
            @click.stop="removeFile(index)">
            <Close />
          </el-icon>
        </div>
      </div>

      <div v-if="fileList.length"
        class="upload-summary">
        <span>已选择 {{ fileList.length }} 个文件</span>
        <span>总大小：{{ $formatSize(totalFileSize) }}</span>
      </div>

      <div v-if="uploading"
        class="upload-progress">
        <el-progress :percentage="progress"
          status="success"
          :stroke-width="12" />
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button :disabled="uploading"
            @click="handleCancelFileUpload">
            取消
          </el-button>
          <el-button type="primary"
            :loading="uploading"
            :disabled="uploading || !fileList.length"
            @click="doUpload">
            {{ uploading ? '上传中...' : '上传' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

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
      :show-close="false"
      @closed="resetFolderUploadState">
      <div v-if="folderTree.length"
        class="upload-summary">
        <span>共 {{ folderStats.folderCount }} 个文件夹</span>
        <span>{{ folderStats.fileCount }} 个文件</span>
        <span>总大小：{{ $formatSize(folderStats.totalSize) }}</span>
      </div>

      <el-scrollbar v-if="folderTree.length"
        height="260px">
        <el-tree-v2 :data="folderTree"
          :default-expanded-keys="expandedFolderKeys"
          :props="{ label: 'name' }">
          <template #default="{ node }">
            <el-icon>
              <Document v-if="node.isLeaf" />
              <Folder v-else-if="!node.expanded" />
              <FolderOpened v-else />
            </el-icon>
            <span>{{ node.label }}</span>
            <span v-if="node.data.isLeaf"
              class="file-size">
              {{ $formatSize(node.data.size) }}
            </span>
          </template>
        </el-tree-v2>
      </el-scrollbar>

      <div v-if="uploadLoading"
        class="upload-progress">
        <div class="progress-text">
          <span>正在上传 {{ currentFolderUploadName || '文件夹内容' }}</span>
          <span>{{ uploadedFolderFileCount }}/{{ folderStats.fileCount }}</span>
        </div>
        <el-progress :percentage="folderUploadProgress"
          status="success"
          :stroke-width="12" />
      </div>

      <template #footer>
        <el-button :disabled="uploadLoading"
          @click="handleCancelFolderUpload">取消</el-button>
        <el-button type="primary"
          :loading="uploadLoading"
          :disabled="uploadLoading || !folderTree.length"
          @click="uploadSelectedFiles">
          <el-icon>
            <Upload />
          </el-icon>
          {{ uploadLoading ? '上传中...' : '上传文件夹' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import request from '@/utils/request'
import { ElLoading, ElMessage } from 'element-plus'
import { useCurrentIdStore } from '@/store/currentId'

const currentIdStore = useCurrentIdStore()

const fileUploadDialog = ref(false)
const fileInput = ref(null)
const fileList = ref([])
const uploading = ref(false)
const progress = ref(0)

const folderInput = ref(null)
const folderUploadDialog = ref(false)
const folderTree = ref([])
const uploadLoading = ref(false)
const expandedFolderKeys = ref([])
const uploadedFolderFileCount = ref(0)
const currentFolderUploadName = ref('')
let fileMap = new Map()

const totalFileSize = computed(() =>
  fileList.value.reduce((total, file) => total + (file.size || 0), 0)
)
const folderStats = computed(() => {
  const stats = {
    fileCount: 0,
    folderCount: 0,
    totalSize: 0
  }

  const walk = nodes => {
    nodes.forEach(node => {
      if (node.isLeaf) {
        stats.fileCount += 1
        stats.totalSize += node.size || 0
        return
      }

      stats.folderCount += 1
      if (node.children?.length) {
        walk(node.children)
      }
    })
  }

  walk(folderTree.value)
  return stats
})
const folderUploadProgress = computed(() => {
  if (!folderStats.value.fileCount) return 0
  return Math.min(
    Math.round((uploadedFolderFileCount.value / folderStats.value.fileCount) * 100),
    100
  )
})

const triggerSelect = () => fileInput.value?.click()
const handleDragOver = e => e.preventDefault()

function getFileKey(file) {
  return `${file.name}_${file.size}_${file.lastModified}`
}

function clearFileInput() {
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

function clearFolderInput() {
  if (folderInput.value) {
    folderInput.value.value = ''
  }
}

function resetFileUploadState() {
  fileList.value = []
  uploading.value = false
  progress.value = 0
  clearFileInput()
}

function resetFolderUploadState() {
  folderTree.value = []
  uploadLoading.value = false
  expandedFolderKeys.value = []
  uploadedFolderFileCount.value = 0
  currentFolderUploadName.value = ''
  fileMap = new Map()
  clearFolderInput()
}

function appendFiles(files) {
  const existingKeys = new Set(fileList.value.map(getFileKey))
  const uniqueFiles = files.filter(file => {
    const fileKey = getFileKey(file)
    if (existingKeys.has(fileKey)) {
      return false
    }
    existingKeys.add(fileKey)
    return true
  })

  if (!uniqueFiles.length) {
    ElMessage.warning('所选文件已在上传列表中')
    return
  }

  fileList.value.push(...uniqueFiles)
}

function handleSelect(e) {
  appendFiles(Array.from(e.target.files || []))
  clearFileInput()
}

function handleDrop(e) {
  appendFiles(Array.from(e.dataTransfer.files || []))
}

function removeFile(index) {
  fileList.value.splice(index, 1)
}

function handleCancelFileUpload() {
  if (uploading.value) return
  fileUploadDialog.value = false
}

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

  const filesToUpload = [...fileList.value]
  const total = filesToUpload.length
  let finished = 0

  try {
    for (const file of filesToUpload) {
      await uploadSingleFile(file, e => {
        if (!e.total) return
        const single = (e.loaded / e.total) * (100 / total)
        progress.value = Math.min(
          Math.round(finished * (100 / total) + single),
          99
        )
      })
      finished++
    }

    progress.value = 100
    ElMessage.success('全部文件上传成功')
    fileUploadDialog.value = false
  } catch {
    ElMessage.error('文件上传失败，请重试')
  } finally {
    uploading.value = false
  }
}

function buildFolderTree(files) {
  fileMap = new Map()
  const root = []
  const pathMap = new Map()
  const expandedKeys = []
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
          size: isLeaf ? file.size : 0
        }
        current.push(node)
        pathMap.set(fullPath, node)
        if (isLeaf) {
          fileMap.set(node.id, file)
        } else {
          expandedKeys.push(node.id)
        }
      }
      current = node.children
    })
  })

  sortTree(root)
  folderTree.value = root
  expandedFolderKeys.value = expandedKeys
}

function sortTree(nodes) {
  nodes.sort((a, b) =>
    a.isLeaf === b.isLeaf
      ? a.name.localeCompare(b.name)
      : a.isLeaf ? 1 : -1
  )
  nodes.forEach(node => node.children && sortTree(node.children))
}

function onFolderSelected(e) {
  const files = Array.from(e.target.files || [])
  if (!files.length) {
    clearFolderInput()
    return
  }

  buildFolderTree(files)
  folderUploadDialog.value = true
  clearFolderInput()
}

function handleCancelFolderUpload() {
  if (uploadLoading.value) return
  folderUploadDialog.value = false
}

async function createFolder(folderName, parentId) {
  const params = new URLSearchParams()
  params.append('folderName', folderName)
  params.append('parentId', parentId)

  const res = await request.post('/uploadFolder', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
  return res.data
}

async function processTree(nodes, parentId) {
  for (const node of nodes) {
    let currentParentId = parentId

    if (!node.isLeaf) {
      currentParentId = await createFolder(node.name, parentId)
    }

    if (node.isLeaf) {
      const file = fileMap.get(node.id)
      if (file) {
        currentFolderUploadName.value = file.name
        const form = new FormData()
        form.append('file', file, file.name)
        form.append('parentId', parentId)
        await request.post('/uploadFile', form)
        uploadedFolderFileCount.value += 1
      }
    }

    if (node.children) {
      await processTree(node.children, currentParentId)
    }
  }
}

async function uploadSelectedFiles() {
  if (!folderTree.value.length) return

  uploadLoading.value = true
  uploadedFolderFileCount.value = 0
  currentFolderUploadName.value = ''
  const loading = ElLoading.service({ text: '文件上传中...' })

  try {
    await processTree(folderTree.value, currentIdStore.currentId)
    ElMessage.success('上传成功')
    folderUploadDialog.value = false
  } catch {
    ElMessage.error('上传失败，请重试')
  } finally {
    uploadLoading.value = false
    loading.close()
  }
}

defineExpose({
  openFileUpload() {
    resetFileUploadState()
    fileUploadDialog.value = true
  },
  openFolderUpload() {
    resetFolderUploadState()
    folderInput.value?.click()
  }
})
</script>

<style scoped>
.upload-drag {
  width: 100%;
  padding: 40px;
  border: 2px dashed #d9d9d9;
  border-radius: 10px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.3s ease;
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
  transition: background-color 0.2s ease;
}

.file-item:hover {
  background-color: #fafafa;
}

.file-item:last-child {
  border-bottom: none;
}

.file-name {
  word-break: break-all;
}

.remove-btn {
  cursor: pointer;
  color: #f56c6c;
  transition: color 0.3s ease;
  margin-left: 12px;
}

.remove-btn:hover {
  color: #ff4141;
}

.upload-summary {
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  color: #606266;
  font-size: 13px;
}

.upload-progress {
  margin-top: 20px;
}

.progress-text {
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  color: #606266;
}
</style>
