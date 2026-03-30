<template>
  <el-dialog v-model="dialogVisible"
    title="删除确认"
    width="420"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false">
    <div class="delete-confirm-content">
      <p class="delete-confirm-title">
        {{ confirmMessage }}
      </p>
      <p class="delete-confirm-tip">
        {{ confirmTip }}
      </p>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button :disabled="confirmLoading"
          @click="handleCancel">
          取消
        </el-button>
        <el-button type="danger"
          :loading="confirmLoading"
          @click="handleConfirm">
          {{ confirmButtonText }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref } from 'vue'

const dialogVisible = ref(false)
const confirmLoading = ref(false)
const targetName = ref('当前文件')
const targetType = ref(1)
const customMessage = ref('')
const customTip = ref('删除后文件会进入回收站，可在回收站中恢复或彻底删除。')
const confirmButtonText = ref('确认删除')
let resolver = null

const targetTypeLabel = computed(() => (targetType.value === 0 ? '文件夹' : '文件'))
const confirmMessage = computed(() => {
  if (customMessage.value) {
    return customMessage.value
  }
  return `确认删除${targetTypeLabel.value}“${targetName.value}”吗？`
})
const confirmTip = computed(() => customTip.value)

function finish(result) {
  resolver?.(result)
  resolver = null
}

function resetState() {
  dialogVisible.value = false
  confirmLoading.value = false
  targetName.value = '当前文件'
  targetType.value = 1
  customMessage.value = ''
  customTip.value = '删除后文件会进入回收站，可在回收站中恢复或彻底删除。'
  confirmButtonText.value = '确认删除'
}

function handleCancel() {
  if (confirmLoading.value) return
  finish(false)
  resetState()
}

function handleConfirm() {
  confirmLoading.value = true
  finish(true)
}

defineExpose({
  open(options = {}) {
    targetName.value = options.fileName || '当前文件'
    targetType.value = options.type ?? 1
    customMessage.value = options.message || ''
    customTip.value = options.tip || '删除后文件会进入回收站，可在回收站中恢复或彻底删除。'
    confirmButtonText.value = options.confirmText || '确认删除'
    confirmLoading.value = false
    dialogVisible.value = true

    return new Promise(resolve => {
      resolver = resolve
    })
  },
  close() {
    resetState()
  }
})
</script>

<style scoped>
.delete-confirm-content {
  padding: 8px 0 4px;
}

.delete-confirm-title {
  margin: 0;
  color: #303133;
  font-size: 16px;
  line-height: 24px;
  word-break: break-all;
}

.delete-confirm-tip {
  margin: 12px 0 0;
  color: #909399;
  font-size: 13px;
  line-height: 20px;
}
</style>
