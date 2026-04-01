<template>
  <Uploader ref="uploaderRef"
    @success="refresh" />
  <DeleteConfirmDialog ref="deleteConfirmRef" />
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
          round
          @click="openCreateFolderDialog">
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
          round
          :disabled="!hasSelection"
          @click="handleBatchDelete">
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

    <FileShow ref="fileShowRef"
      :search-text="searchText"
      @selection-change="handleSelectionChange"
      @row-action="handleRowAction" />
    <CreateFolder ref="createFolderRef"
      @submit="handleCreateFolder" />
  </el-container>
</template>

<script setup>
import { Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { ref } from 'vue'
import Uploader from '@/components/Uploader.vue'
import FileShow from '@/components/FileShow.vue'
import CreateFolder from '@/components/CreateFolder.vue'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog.vue'
import { createFolder, deleteFileById } from '@/api/files'
import { useCurrentIdStore } from '@/store/currentId'

const currentIdStore = useCurrentIdStore()
const searchText = ref('')
const fileShowRef = ref(null)
const deleteConfirmRef = ref(null)
const selectedRows = ref([])
const hasSelection = ref(false)
const uploaderRef = ref(null)
const createFolderRef = ref(null)

const refresh = () => {
  fileShowRef.value?.refresh()
}

const openFileUpload = () => {
  uploaderRef.value?.openFileUpload()
}

const openFolderUpload = () => {
  uploaderRef.value?.openFolderUpload()
}

const openCreateFolderDialog = () => {
  createFolderRef.value?.openCreateFolder()
}

async function handleCreateFolder(folderName) {
  createFolderRef.value?.setSubmitting(true)

  try {
    await createFolder({
      folderName,
      parentId: currentIdStore.currentId,
    })
    createFolderRef.value?.setSubmitting(false)
    createFolderRef.value?.close()
    ElMessage.success('创建成功')
    await refresh()
  } catch (error) {
    console.error('创建文件夹失败:', error)
    ElMessage.error('创建失败，请稍后重试')
    createFolderRef.value?.setSubmitting(false)
  }
}

async function handleDelete(row) {
  const confirmed = await deleteConfirmRef.value?.open({
    fileName: row.fileName,
    type: row.type,
  })
  if (!confirmed) {
    return
  }

  try {
    await deleteFileById(row.id)
    deleteConfirmRef.value?.close()
    ElMessage.success('删除成功')
    refresh()
  } catch (error) {
    deleteConfirmRef.value?.close()
    console.error('删除文件失败:', error)
    ElMessage.error('删除失败，请稍后重试')
  }
}

async function handleBatchDelete() {
  if (!selectedRows.value.length) {
    ElMessage.warning('请先选择要删除的文件')
    return
  }

  const confirmed = await deleteConfirmRef.value?.open({
    message: `确认删除已选中的 ${selectedRows.value.length} 项吗？`,
    tip: '删除后文件会进入回收站，可在回收站中恢复或彻底删除。',
    confirmText: '确认删除',
  })
  if (!confirmed) {
    return
  }

  try {
    for (const row of selectedRows.value) {
      await deleteFileById(row.id)
    }
    deleteConfirmRef.value?.close()
    ElMessage.success(`已删除 ${selectedRows.value.length} 项`)
    selectedRows.value = []
    hasSelection.value = false
    refresh()
    fileShowRef.value?.clearSelection()
  } catch (error) {
    deleteConfirmRef.value?.close()
    console.error('批量删除文件失败:', error)
    ElMessage.error('批量删除失败，请稍后重试')
  }
}

function handleSelectionChange(rows) {
  selectedRows.value = rows
  hasSelection.value = rows.length > 0
}

function handleRowAction({ action, row }) {
  if (action === 'delete') {
    handleDelete(row)
    return
  }

  console.log(`${action} 文件:`, row)
}
</script>

<style scoped>
.input :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.75);
  height: 100%;
  line-height: inherit;
  display: flex;
  align-items: center;
  border-radius: var(--el-border-radius-round);
  box-shadow: none;
}

.input {
  margin-left: auto;
}

.header-wrap {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
}

.custom {
  margin: 0 10px;
}
</style>
