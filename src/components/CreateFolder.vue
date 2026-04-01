<template>
  <el-dialog v-model="createFolderDialog"
    title="新建文件夹"
    width="300"
    show-close
    center
    destroy-on-close
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false">

    <el-input v-model="newFolderName"
      focusable
      clearable
      style="width: 240px"
      placeholder="请输入文件夹名称"
      @keyup.enter="handleSubmit" />

    <template #footer
      center>
      <div class="dialog-footer">
        <el-button
          @click="close">
          取消
        </el-button>
        <el-button type="primary"
          :loading="submitting"
          :disabled="submitting"
          center
          @click="handleSubmit">
          创建文件夹
        </el-button>
      </div>
    </template>

  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const emit = defineEmits(['submit'])

const createFolderDialog = ref(false)
const newFolderName = ref('新建文件夹')
const submitting = ref(false)

function handleSubmit() {
  const folderName = newFolderName.value.trim()
  if (!folderName) {
    ElMessage.warning('文件夹名称不能为空')
    return
  }

  if (submitting.value) {
    return
  }

  emit('submit', folderName)
}

function openCreateFolder(defaultName = '新建文件夹') {
  newFolderName.value = defaultName
  submitting.value = false
  createFolderDialog.value = true
}

function close() {
  if (submitting.value) {
    return
  }

  createFolderDialog.value = false
}

function setSubmitting(value) {
  submitting.value = value
}

defineExpose({
  openCreateFolder,
  close,
  setSubmitting,
})
</script>

<style></style>
