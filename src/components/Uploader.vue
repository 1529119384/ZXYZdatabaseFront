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
import { ElLoading, ElMessage } from 'element-plus'
import { createFolder } from '@/api/files'
import { useCurrentIdStore } from '@/store/currentId'
import { getErrorDetail, logUploadError, uploadFileWithPresign } from '@/services/upload'

const emit = defineEmits(['success'])

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
  await uploadFileWithPresign(file, currentIdStore.currentId, onProgress)
}

function formatUploadSummary(successList, failList, successText) {
  const summary = [`成功 ${successList.length} 个`, `失败 ${failList.length} 个`]
  if (failList.length) {
    const failNames = failList.slice(0, 3).map(item => item.fileName).join('、')
    summary.push(`失败文件：${failNames}${failList.length > 3 ? ' 等' : ''}`)
  } else if (successText) {
    summary.unshift(successText)
  }

  return summary.join('，')
}

async function uploadFilesWithResult(filesToUpload) {
  const successList = []
  const failList = []
  const total = filesToUpload.length

  for (let index = 0; index < filesToUpload.length; index++) {
    const file = filesToUpload[index]

    try {
      await uploadSingleFile(file, e => {
        if (!e.total) return
        const completed = index * (100 / total)
        const single = (e.loaded / e.total) * (100 / total)
        progress.value = Math.min(Math.round(completed + single), 99)
      })
      successList.push({
        fileName: file.name,
        size: file.size
      })
      progress.value = Math.min(Math.round(((index + 1) / total) * 100), 100)
    } catch (error) {
      failList.push({
        fileName: file.name,
        size: file.size,
        message: getErrorDetail(error)
      })
    }
  }

  return { successList, failList }
}

async function doUpload() {
  if (!fileList.value.length) return

  uploading.value = true
  progress.value = 0

  const filesToUpload = [...fileList.value]

  try {
    const { successList, failList } = await uploadFilesWithResult(filesToUpload)

    progress.value = successList.length === filesToUpload.length ? 100 : progress.value

    if (successList.length) {
      emit('success')
    }

    if (!failList.length) {
      ElMessage.success(formatUploadSummary(successList, failList, '全部文件上传成功'))
      fileUploadDialog.value = false
      return
    }

    if (successList.length) {
      ElMessage.warning(formatUploadSummary(successList, failList))
      fileUploadDialog.value = false
      return
    }

    ElMessage.error(formatUploadSummary(successList, failList))
  } catch (error) {
    console.error('[文件上传流程失败]', {
      files: filesToUpload.map(file => file.name),
      message: error?.message
    })
    ElMessage.error(error?.message || '文件上传失败，请重试')
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

async function createFolderByScene(folderName, parentId) {
  const res = await createFolder({
    folderName,
    parentId,
    scene: 'upload',
  })
  return res.data
}

async function processTree(nodes, parentId) {
  const successList = []
  const failList = []

  for (const node of nodes) {
    let currentParentId = parentId

    if (!node.isLeaf) {
      try {
        currentParentId = await createFolderByScene(node.name, parentId)
      } catch (error) {
        logUploadError('创建文件夹失败', { name: node.name, size: 0 }, error, { parentId })
        failList.push({
          fileName: node.name,
          message: `创建文件夹失败：${getErrorDetail(error)}`
        })
        continue
      }
    }

    if (node.isLeaf) {
      const file = fileMap.get(node.id)
      if (file) {
        currentFolderUploadName.value = file.name
        try {
          await uploadFileWithPresign(file, parentId)
          uploadedFolderFileCount.value += 1
          successList.push({
            fileName: file.name,
            size: file.size
          })
        } catch (error) {
          failList.push({
            fileName: file.name,
            size: file.size,
            message: getErrorDetail(error)
          })
        }
      }
    }

    if (node.children) {
      const childResult = await processTree(node.children, currentParentId)
      successList.push(...childResult.successList)
      failList.push(...childResult.failList)
    }
  }

  return { successList, failList }
}

async function uploadSelectedFiles() {
  if (!folderTree.value.length) return

  uploadLoading.value = true
  uploadedFolderFileCount.value = 0
  currentFolderUploadName.value = ''
  const loading = ElLoading.service({ text: '文件上传中...' })

  try {
    const { successList, failList } = await processTree(folderTree.value, currentIdStore.currentId)

    if (successList.length) {
      emit('success')
    }

    if (!failList.length) {
      ElMessage.success(formatUploadSummary(successList, failList, '上传成功'))
      folderUploadDialog.value = false
      return
    }

    if (successList.length) {
      ElMessage.warning(formatUploadSummary(successList, failList))
      folderUploadDialog.value = false
      return
    }

    ElMessage.error(formatUploadSummary(successList, failList))
  } catch (error) {
    console.error('[文件夹上传流程失败]', {
      currentFile: currentFolderUploadName.value,
      uploadedCount: uploadedFolderFileCount.value,
      total: folderStats.value.fileCount,
      message: error?.message
    })
    ElMessage.error(error?.message || '上传失败，请重试')
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
