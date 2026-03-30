<template>
  <div class="file-page">
    <el-breadcrumb v-if="isSpaceMode"
      :separator-icon="ArrowRight"
      class="breadcrumb">
      <el-breadcrumb-item :to="{ name: 'index', query: { path: '' } }">
        首页
      </el-breadcrumb-item>
      <el-breadcrumb-item v-for="(name, idx) in crumbArr"
        :key="idx"
        :to="{ name: 'index', query: { path: crumbPath(idx) } }">
        {{ name }}
      </el-breadcrumb-item>
    </el-breadcrumb>

    <el-table ref="tableRef"
      :data="filteredList"
      style="width: 100%"
      :empty-text="emptyText"
      @row-dblclick="handleRowDblClick"
      @selection-change="handleSelectionChange">
      <el-table-column type="selection"
        width="55" />

      <el-table-column label="名称"
        min-width="220">
        <template #default="{ row }">
          <div class="name-cell">
            <svg class="icon">
              <use :xlink:href="getIcon(row)" />
            </svg>
            <span class="file-name">{{ row.fileName }}</span>
          </div>
        </template>
      </el-table-column>

      <template v-if="isRecycleMode">
        <el-table-column label="原路径"
          min-width="220">
          <template #default="{ row }">
            <span>{{ row.originPath || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="删除时间"
          width="180">
          <template #default="{ row }">
            {{ $fmtTime(row.deleteTime) }}
          </template>
        </el-table-column>
      </template>

      <template v-else>
        <el-table-column label="修改时间"
          width="180">
          <template #default="{ row }">
            {{ $fmtTime(row.modifyTime) }}
          </template>
        </el-table-column>
      </template>

      <el-table-column label="大小"
        width="120">
        <template #default="{ row }">
          {{ $formatSize(row.fileSize) }}
        </template>
      </el-table-column>

      <el-table-column v-if="isRecycleMode"
        label="操作"
        width="190"
        fixed="right">
        <template #default="{ row }">
          <el-button link
            type="primary"
            @click="emitRowAction('restore', row)">
            取消删除
          </el-button>
          <el-button link
            type="danger"
            @click="emitRowAction('deleteForever', row)">
            彻底删除
          </el-button>
        </template>
      </el-table-column>

      <el-table-column v-else
        width="300">
        <template #default="{ row }">
          <el-button-group class="mb-4">
            <el-button link
              circle
              @click="handleMenuAction('view', row)">
              <el-icon>
                <View />
              </el-icon>
            </el-button>
            <el-button link
              circle
              @click="handleMenuAction('share', row)">
              <el-icon>
                <Share />
              </el-icon>
            </el-button>
            <el-button link
              circle
              @click="handleMenuAction('download', row)">
              <el-icon>
                <Download />
              </el-icon>
            </el-button>
            <el-button link
              circle
              @click="handleMenuAction('delete', row)">
              <el-icon>
                <DeleteFilled />
              </el-icon>
            </el-button>
            <el-button link
              circle
              @click="handleMenuAction('rename', row)">
              <el-icon>
                <EditPen />
              </el-icon>
            </el-button>
            <el-button link
              circle
              @click.stop="(event) => handleContextmenu(event)">
              <el-icon>
                <More />
              </el-icon>
            </el-button>

            <el-dropdown ref="dropdownRef"
              :virtual-ref="triggerRef"
              :show-arrow="false"
              :popper-options="{
                modifiers: [{ name: 'offset', options: { offset: [0, 0] } }],
              }"
              virtual-triggering
              trigger="click"
              placement="bottom-start"
              @click-outside="closeContextMenu">
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="handleMenuAction('favorite', row)">
                    收藏
                  </el-dropdown-item>
                  <el-dropdown-item @click="handleMenuAction('share', row)">
                    分享
                  </el-dropdown-item>
                  <el-dropdown-item @click="handleMenuAction('copy', row)">
                    复制
                  </el-dropdown-item>
                  <el-dropdown-item @click="handleMenuAction('remove', row)">
                    移动
                  </el-dropdown-item>
                  <el-dropdown-item @click="handleMenuAction('lock', row)">
                    锁定
                  </el-dropdown-item>
                  <el-dropdown-item divided
                    @click="handleMenuAction('showDetailedInformation', row)">
                    查看详细信息
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </el-button-group>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowRight } from '@element-plus/icons-vue'
import { fetchFileList, fetchRecycleList } from '@/api/files'
import { useCurrentIdStore } from '@/store/currentId'

const props = defineProps({
  mode: {
    type: String,
    default: 'space',
  },
  searchText: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['selection-change', 'row-action'])

const currentIdStore = useCurrentIdStore()
const route = useRoute()
const router = useRouter()

const isSpaceMode = computed(() => props.mode === 'space')
const isRecycleMode = computed(() => props.mode === 'recycle')

const list = ref([])
const tableRef = ref(null)
const dropdownRef = ref()
const selectedRows = ref([])
const position = ref({ top: 0, left: 0, bottom: 0, right: 0 })
const pathToIdMap = ref(JSON.parse(sessionStorage.getItem('pathToIdMap') || '{}'))

const triggerRef = ref({
  getBoundingClientRect: () => position.value,
})

const emptyText = computed(() => {
  return isRecycleMode.value ? '回收站为空' : '暂无文件'
})

const savePathToIdMap = () => {
  sessionStorage.setItem('pathToIdMap', JSON.stringify(pathToIdMap.value))
}

const ICON_MAP = {
  FOLDER: '#icon-wenjianjia',
  FILE_TYPES: {
    0: '#icon-yasuobao',
    1: '#icon-word',
    2: '#icon-ppt',
    3: '#icon-excel',
    4: '#icon-pdf',
    5: '#icon-jpg',
    6: '#icon-mp',
    7: '#icon-mp4',
    8: '#icon-txt',
  },
  DEFAULT_FILE: '#icon-wenjianlei_weizhiwenjian',
}

const getIcon = (row) => {
  if (row.type === 0) {
    return ICON_MAP.FOLDER
  }
  return ICON_MAP.FILE_TYPES[row.category] || ICON_MAP.DEFAULT_FILE
}

const crumbArr = computed(() => {
  const path = route.query.path || ''
  const decodedPath = decodeURIComponent(path)
  return decodedPath.split('/').filter(Boolean)
})

const crumbPath = (idx) => {
  return `/${crumbArr.value.slice(0, idx + 1).join('/')}`
}

const filteredList = computed(() => {
  const keyword = props.searchText.trim().toLowerCase()
  if (!keyword) {
    return list.value
  }

  return list.value.filter((item) => {
    const matchedName = item.fileName?.toLowerCase().includes(keyword)
    const matchedPath = item.originPath?.toLowerCase().includes(keyword)
    return matchedName || matchedPath
  })
})

const transformFileList = (data) => {
  return data.map((item) => ({
    id: item.id,
    fileName: item.originalName,
    type: item.fileType,
    category: item.category,
    modifyTime: item.modifyTime,
    fileSize: item.fileSize,
    fileUrl: item.fileUrl,
  }))
}

const transformRecycleList = (data) => {
  console.log(data);
  return data.map((item) => ({
    id: item.id,
    fileName: item.originalName,
    type: item.fileType,
    category: item.category,
    fileSize: item.fileSize,
    deleteTime: item.modifyTime,
    originPath: item.originPath,
  }))
}

async function loadSpaceList() {
  const fileList = await fetchFileList(currentIdStore.currentId)
  list.value = Array.isArray(fileList.data) ? transformFileList(fileList.data) : []
}

async function loadRecycleList() {
  const recycleList = await fetchRecycleList()
  list.value = Array.isArray(recycleList.data) ? transformRecycleList(recycleList.data) : []
}

async function refresh() {
  if (isRecycleMode.value) {
    await loadRecycleList()
    return
  }

  await loadSpaceList()
}

watch(
  () => route.query.path,
  async (newPath) => {
    if (!isSpaceMode.value) {
      return
    }

    const path = newPath || ''
    if (pathToIdMap.value[path] !== undefined) {
      currentIdStore.currentId = pathToIdMap.value[path]
    } else {
      currentIdStore.currentId = path === '' ? -1 : currentIdStore.currentId
    }

    await refresh()
  },
  { immediate: true },
)

watch(
  () => props.mode,
  async (mode) => {
    if (mode === 'recycle') {
      await refresh()
    }
  },
  { immediate: true },
)

function enterFolder(row) {
  if (!isSpaceMode.value || row.type !== 0) {
    return
  }

  currentIdStore.currentId = row.id

  const current = route.query.path || '/'
  const nextPath = current.endsWith('/') ? current + row.fileName : `${current}/${row.fileName}`

  pathToIdMap.value[nextPath] = row.id
  savePathToIdMap()
  router.push({ name: 'index', query: { path: nextPath } })
}

function handleRowDblClick(row) {
  if (isSpaceMode.value) {
    enterFolder(row)
  }
}

function handleSelectionChange(rows) {
  selectedRows.value = rows
  emit('selection-change', rows)
}

function emitRowAction(action, row) {
  emit('row-action', { action, row })
}

function handleContextmenu(event) {
  event.preventDefault()
  event.stopPropagation()
  const { clientX, clientY } = event
  position.value = DOMRect.fromRect({ x: clientX, y: clientY, width: 0, height: 0 })
  dropdownRef.value?.handleClose()
  setTimeout(() => {
    dropdownRef.value?.handleOpen()
  }, 0)
}

function closeContextMenu() {
  dropdownRef.value?.handleClose()
}

function downloadFile(row) {
  if (!row || row.type === 0 || !row.fileUrl) {
    return
  }

  const link = document.createElement('a')
  link.href = row.fileUrl
  link.download = row.fileName || ''
  link.target = '_blank'
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function handleMenuAction(action, row) {
  if (!row) {
    return
  }

  switch (action) {
    case 'download':
      downloadFile(row)
      break
    case 'delete':
      emitRowAction('delete', row)
      break
    default:
      console.log(`${action} 文件:`, row)
      break
  }

  closeContextMenu()
}

defineExpose({
  refresh,
  getSelectedRows() {
    return selectedRows.value
  },
  clearSelection() {
    tableRef.value?.clearSelection()
  },
})
</script>

<style scoped>
.file-page {
  margin: 20px;
}

.breadcrumb {
  margin-bottom: 12px;
  user-select: none;
}

.name-cell {
  display: flex;
  align-items: center;
}

.file-name {
  margin-left: 8px;
}

.icon {
  width: 20px;
  height: 20px;
  fill: currentColor;
}
</style>
