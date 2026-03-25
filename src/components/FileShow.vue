<template>
  <div class="file-page">
    <el-breadcrumb :separator-icon="ArrowRight"
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

    <el-table :data="list"
      style="width: 100%"
      @row-dblclick="enterFolder">
      <el-table-column type="selection"
        width="55" />

      <el-table-column label="名称">
        <template #default="{ row }">
          <div style="display: flex; align-items: center">
            <svg class="icon">
              <use :xlink:href="getIcon(row)" />
            </svg>
            <span style="margin-left: 8px">{{ row.fileName }}</span>
          </div>
        </template>
      </el-table-column>

      <el-table-column width="300">
        <template #default="{ row }">
          <el-button-group class="mb-4">
            <el-button type="text"
              circle
              @click="handleMenuAction('view', row)">
              <el-icon>
                <View />
              </el-icon>
            </el-button>
            <el-button type="text"
              circle
              @click="handleMenuAction('share', row)">
              <el-icon>
                <Share />
              </el-icon>
            </el-button>
            <el-button type="text"
              circle
              @click="handleMenuAction('download', row)">
              <el-icon>
                <Download />
              </el-icon>
            </el-button>
            <el-button type="text"
              circle
              @click="handleMenuAction('delete', row)">
              <el-icon>
                <DeleteFilled />
              </el-icon>
            </el-button>
            <el-button type="text"
              circle
              @click="handleMenuAction('rename', row)">
              <el-icon>
                <EditPen />
              </el-icon>
            </el-button>
            <el-button type="text"
              circle
              @click.stop="(event) => handleContextmenu(event, row)">
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

      <el-table-column label="修改时间"
        width="180">
        <template #default="{ row }">
          {{ $fmtTime(row.modifyTime) }}
        </template>
      </el-table-column>

      <el-table-column label="大小"
        width="120">
        <template #default="{ row }">
          {{ row.fileSize ?? '-' }}
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowRight } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { useCurrentIdStore } from '@/store/currentId'

const currentIdStore = useCurrentIdStore()

const route = useRoute()
const router = useRouter()

const list = ref([])
const error = ref(null)
const pathToIdMap = ref(JSON.parse(sessionStorage.getItem('pathToIdMap') || '{}'))

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

const transformFileList = (data) => {
  return data.map((item) => ({
    id: item.id,
    fileName: item.originalName,
    type: item.fileType,
    category: item.category,
    modifyTime: item.modifyTime,
    fileSize: item.fileSize,
    originalName: undefined,
    fileType: undefined,
  }))
}

async function getFileList() {
  error.value = null
  try {
    const fileList = await request.get('/getFileList', {
      params: { parentId: currentIdStore.currentId },
    })

    console.log('获取到信息为', fileList)

    if (fileList.data && Array.isArray(fileList.data)) {
      list.value = transformFileList(fileList.data)
    } else {
      list.value = []
      console.warn('获取到的文件列表数据格式不正确')
    }
  } catch (err) {
    console.error('获取文件列表失败:', err)
    error.value = '获取文件列表失败，请稍后重试'
    list.value = []
  }
}

watch(
  () => route.query.path,
  (newPath) => {
    const path = newPath || ''

    if (pathToIdMap.value[path] !== undefined) {
      currentIdStore.currentId = pathToIdMap.value[path]
    } else {
      currentIdStore.currentId = path === '' ? -1 : currentIdStore.currentId
    }

    getFileList()
  },
  { immediate: true },
)

function enterFolder(row) {
  if (row.type !== 0) return

  currentIdStore.currentId = row.id

  const current = route.query.path || '/'
  const nextPath = current.endsWith('/') ? current + row.fileName : `${current}/${row.fileName}`

  pathToIdMap.value[nextPath] = row.id
  savePathToIdMap()

  router.push({ name: 'index', query: { path: nextPath } })
}

const dropdownRef = ref()
const position = ref({ top: 0, left: 0, bottom: 0, right: 0 })

const triggerRef = ref({
  getBoundingClientRect: () => position.value,
})

const handleContextmenu = (event, row) => {
  event.preventDefault()
  event.stopPropagation()

  const { clientX, clientY } = event
  position.value = DOMRect.fromRect({ x: clientX, y: clientY, width: 0, height: 0 })

  dropdownRef.value?.handleClose()
  setTimeout(() => {
    dropdownRef.value?.handleOpen()
  }, 0)
}

const closeContextMenu = () => {
  dropdownRef.value?.handleClose()
}

const handleMenuAction = (action, row) => {
  if (!row) return

  switch (action) {
    case 'favorite':
      console.log('收藏文件:', row)
      break
    case 'share':
      console.log('分享文件:', row)
      break
    case 'copy':
      console.log('复制文件:', row)
      break
    case 'remove':
      console.log('移动文件:', row)
      break
    case 'lock':
      console.log('上锁文件:', row)
      break
    case 'delete':
      console.log('删除文件:', row)
      break
    case 'download':
      console.log('下载文件:', row)
      break
    case 'rename':
      console.log('重命名文件:', row)
      break
    case 'view':
      console.log('预览文件:', row)
      break
    case 'showDetailedInformation':
      console.log('查看详细信息:', row)
      break
    default:
      console.log('操作错误:', action)
      break
  }

  closeContextMenu()
}

defineExpose({
  refresh() {
    getFileList()
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

.icon {
  width: 20px;
  height: 20px;
  fill: currentColor;
}
</style>
