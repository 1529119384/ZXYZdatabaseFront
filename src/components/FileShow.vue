<template>
  <div class="file-page">
    <!--
      面包屑由当前路由中的 path 推导出来。
      这里不额外保存目录层级数组，避免出现“路由变了但面包屑状态没同步”的问题。
    -->
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

    <!--
      表格展示的是“当前目录下”的文件列表。
      当前目录由 route.query.path + currentIdStore.currentId 共同确定：
      - path 负责表现层（地址栏、面包屑）
      - currentId 负责接口层（请求哪个 parentId）
    -->
    <el-table :data="list"
      style="width: 100%"
      @row-dblclick="enterFolder">
      <el-table-column type="selection"
        width="55" />

      <el-table-column label="名称">
        <template #default="{ row }">
          <!--
            row 就是这一行文件/文件夹的完整数据对象。
            后面的所有按钮和菜单项都直接用它，不再额外缓存 selectedRow。
          -->
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
          <!--
            这一列集中放当前行的快捷操作。
            统一约定：所有入口都显式传 row 给 handleMenuAction，
            这样“按钮点击”和“下拉菜单点击”的行为模型完全一致。
          -->
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

            <!--
              这个下拉菜单使用 virtual-triggering。
              也就是说它不是固定依附在某个按钮 DOM 上，而是根据 triggerRef 返回的位置进行定位。
              这样点击哪一行的“更多”，菜单就能弹在当前点击点附近。
            -->
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
/*
  组件整体职责：
  1. 根据当前路由 path 计算面包屑
  2. 根据当前目录 id 请求文件列表
  3. 支持双击文件夹进入下一级目录
  4. 提供每一行文件的操作入口

  这份实现有两个关键思路：
  - 页面层级状态尽量由路由驱动，减少额外本地状态
  - 行操作对象始终由当前 row 显式传入，避免“先赋值再操作”的隐式依赖
*/
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowRight } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { useCurrentIdStore } from '@/store/currentId'

// currentIdStore 保存“当前目录 id”，方便其他组件也能复用这个上下文。
const currentIdStore = useCurrentIdStore()

// route 读取当前 path，router 用于进入下级目录时修改地址栏。
const route = useRoute()
const router = useRouter()

// 当前目录的文件列表，直接绑定到表格。
const list = ref([])
// 记录接口异常信息；当前模板没有直接展示，后续可以接空状态/错误提示。
const error = ref(null)
// 用路径反查目录 id，这样刷新页面或直接根据面包屑跳转时还能拿到正确的 parentId。
const pathToIdMap = ref(JSON.parse(sessionStorage.getItem('pathToIdMap') || '{}'))

// 把“路径 -> id”映射持久化到 sessionStorage，避免页面刷新后丢失。
const savePathToIdMap = () => {
  sessionStorage.setItem('pathToIdMap', JSON.stringify(pathToIdMap.value))
}

// 图标映射集中定义在这里，后面若增加新的文件类型只需要补这张表。
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

// 根据 row 的类型和分类决定使用哪个 svg 图标。
const getIcon = (row) => {
  if (row.type === 0) {
    return ICON_MAP.FOLDER
  }
  return ICON_MAP.FILE_TYPES[row.category] || ICON_MAP.DEFAULT_FILE
}

// 面包屑直接由路由上的 path 计算出来，避免再维护一份额外状态。
const crumbArr = computed(() => {
  const path = route.query.path || ''
  // 路由参数里如果带了编码字符，这里先解码再拆分，显示出来的中文才正常。
  const decodedPath = decodeURIComponent(path)
  return decodedPath.split('/').filter(Boolean)
})

// 根据当前面包屑索引重新拼出该层级的完整 path，供点击跳转使用。
const crumbPath = (idx) => {
  return `/${crumbArr.value.slice(0, idx + 1).join('/')}`
}

// 将接口字段转换成表格直接使用的结构，模板层就不用关心后端字段名了。
const transformFileList = (data) => {
  return data.map((item) => ({
    id: item.id,
    fileName: item.originalName,
    type: item.fileType,
    category: item.category,
    modifyTime: item.modifyTime,
    fileSize: item.fileSize,
    // 下面两个字段在列表展示阶段不再直接使用，置为 undefined 只是明确表明已做过转换。
    originalName: undefined,
    fileType: undefined,
  }))
}

// 读取当前目录下的文件列表。
// currentIdStore.currentId 是真正传给后端的目录标识。
async function getFileList() {
  error.value = null
  try {
    const fileList = await request.get('/getFileList', {
      params: { parentId: currentIdStore.currentId },
    })

    console.log('获取到信息为', fileList)

    // 接口返回结构正确时才更新列表，否则回退为空数组，避免模板报错。
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

    // 路由变化时优先用路径映射恢复当前目录 id，保证刷新/回退后仍能正确拉取列表。
    if (pathToIdMap.value[path] !== undefined) {
      currentIdStore.currentId = pathToIdMap.value[path]
    } else {
      // 根目录约定 parentId 为 -1；非根目录但暂时没映射时，先沿用旧值避免误切目录。
      currentIdStore.currentId = path === '' ? -1 : currentIdStore.currentId
    }

    // path 一变就重新拉当前层级数据，让地址栏、面包屑和表格保持一致。
    getFileList()
  },
  // 首次进入页面时也要执行一次，否则初始列表不会加载。
  { immediate: true },
)

// 双击文件夹进入子目录；如果是普通文件则直接返回。
function enterFolder(row) {
  if (row.type !== 0) return

  // 当前目录切换后，先把共享 id 更新成新目录。
  currentIdStore.currentId = row.id

  const current = route.query.path || '/'
  // 统一处理路径拼接，避免多一个 / 或少一个 /。
  const nextPath = current.endsWith('/') ? current + row.fileName : `${current}/${row.fileName}`

  // 进入子目录时顺手记录“路径 -> id”的映射，后续面包屑跳转和刷新会用到。
  pathToIdMap.value[nextPath] = row.id
  savePathToIdMap()

  // 最终通过更新路由来驱动页面切换，避免手动维护多份状态。
  router.push({ name: 'index', query: { path: nextPath } })
}

// dropdownRef 用于手动控制右侧菜单的打开和关闭。
const dropdownRef = ref()
// position 保存虚拟触发点的位置，供 el-dropdown 读取。
const position = ref({ top: 0, left: 0, bottom: 0, right: 0 })

// 右侧菜单不是挂在按钮本身上，而是通过虚拟触发点定位到鼠标点击位置。
const triggerRef = ref({
  getBoundingClientRect: () => position.value,
})

// 打开“更多”菜单。
// 这里的 row 目前没有直接参与逻辑，但保留这个参数能提醒我们：
// 这个菜单本质上是“某一行”的菜单，而不是整个表格的全局菜单。
const handleContextmenu = (event, row) => {
  event.preventDefault()
  // 阻止事件继续冒泡，避免与行点击/其他点击逻辑互相干扰。
  event.stopPropagation()

  // 每次点击“更多”都更新弹层锚点，这样菜单会出现在当前按钮附近。
  const { clientX, clientY } = event
  position.value = DOMRect.fromRect({ x: clientX, y: clientY, width: 0, height: 0 })

  // 先关再开，能避免快速切换不同行时菜单位置不更新。
  dropdownRef.value?.handleClose()
  setTimeout(() => {
    dropdownRef.value?.handleOpen()
  }, 0)
}

// 把菜单关闭动作单独抽出来，便于“点击空白区域”和“执行完操作后”复用。
const closeContextMenu = () => {
  dropdownRef.value?.handleClose()
}

const handleMenuAction = (action, row) => {
  // 所有入口都显式传 row，不再依赖 selectedRow 这类额外状态。
  if (!row) return

  // 现在这里只是打印日志，后续接接口时可以直接在对应 case 中补业务逻辑。
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
      // 打印 action 本身，方便定位是哪个调用方传了未支持的动作名。
      console.log('操作错误:', action)
      break
  }

  // 当前菜单型操作执行完成后统一收起菜单，避免菜单残留。
  closeContextMenu()
}

// 对外暴露 refresh，方便父组件在上传成功、删除成功后主动刷新列表。
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
