import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useCurrentIdStore = defineStore('currentId', () => {
  // 全局响应式变量
  const currentId = ref(-1)

  // 提供 setter，顺手刷新列表（可选）
  function setCurrentId(id) {
    currentId.value = id
    // 如果只想存数据，下面一行删掉即可
  }

  return { currentId, setCurrentId }
})