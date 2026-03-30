<template>
  <el-container>
    <el-header height="32px"
      class="header-wrap">
      <el-button-group class="custom">
        <el-button type="primary"
          plain
          round
          :disabled="!hasSelection"
          @click="handleBatchRestore">
          <el-icon>
            <RefreshLeft />
          </el-icon>取消删除
        </el-button>
        <el-button type="danger"
          plain
          round
          :disabled="!hasSelection"
          @click="handleBatchDeleteForever">
          <el-icon>
            <DeleteFilled />
          </el-icon>彻底删除
        </el-button>
        <el-button type="primary"
          plain
          round
          @click="refreshList">
          <el-icon>
            <RefreshRight />
          </el-icon>刷新
        </el-button>
      </el-button-group>

      <el-input v-model="searchText"
        class="input"
        style="width: 240px"
        placeholder="搜索回收站"
        clearable
        :suffix-icon="Search" />
    </el-header>

    <FileShow ref="fileShowRef"
      mode="recycle"
      :search-text="searchText"
      @selection-change="handleSelectionChange"
      @row-action="handleRowAction" />
  </el-container>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import FileShow from '@/components/FileShow.vue'
import { deleteFilesForever, restoreFiles } from '@/api/files'

const fileShowRef = ref(null)
const searchText = ref('')
const selectedRows = ref([])

const hasSelection = computed(() => selectedRows.value.length > 0)

const refreshList = async () => {
  await fileShowRef.value?.refresh()
}

const handleSelectionChange = (rows) => {
  selectedRows.value = rows
}

const executeRestore = async (rows) => {
  const ids = rows.map((item) => item.id)
  if (!ids.length) {
    return
  }

  await Promise.all(ids.map((id) => restoreFiles(id)))
  ElMessage.success(ids.length > 1 ? '批量取消删除成功' : '取消删除成功')
  await refreshList()
  fileShowRef.value?.clearSelection()
}

const executeDeleteForever = async (rows) => {
  const ids = rows.map((item) => item.id)
  if (!ids.length) {
    return
  }

  try {
    await ElMessageBox.confirm(
      ids.length > 1 ? '选中的文件将被彻底删除，删除后不可恢复。是否继续？' : '该文件将被彻底删除，删除后不可恢复。是否继续？',
      '删除确认',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
  } catch {
    return
  }

  await deleteFilesForever(ids)
  ElMessage.success(ids.length > 1 ? '批量彻底删除成功' : '彻底删除成功')
  await refreshList()
  fileShowRef.value?.clearSelection()
}

const handleBatchRestore = async () => {
  await executeRestore(selectedRows.value)
}

const handleBatchDeleteForever = async () => {
  await executeDeleteForever(selectedRows.value)
}

const handleRowAction = async ({ action, row }) => {
  if (action === 'restore') {
    await executeRestore([row])
    return
  }

  if (action === 'deleteForever') {
    await executeDeleteForever([row])
  }
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
