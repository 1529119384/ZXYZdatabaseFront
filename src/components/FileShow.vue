<template>
  <div class="file-page">
    <!-- 面包屑：直接根据 $route.query.path 生成 -->
    <el-breadcrumb :separator-icon="ArrowRight" class="breadcrumb">
      <!-- 始终显示首页 -->
      <el-breadcrumb-item :to="{ name: 'index', query: { path: '' } }">
        首页
      </el-breadcrumb-item>
      <!-- 动态生成后续面包屑 -->
      <el-breadcrumb-item v-for="(name, idx) in crumbArr" :key="idx"
        :to="{ name: 'index', query: { path: crumbPath(idx) } }">
        {{ name }}
      </el-breadcrumb-item>
    </el-breadcrumb>

    <!-- 文件表格 -->
    <el-table :data="list"
      style="width:100%"
      @row-dblclick="enterFolder">
      <el-table-column type="selection"
        width="55" />
      <el-table-column label="名称">
        <template #default="{ row }">
          <div style="display:flex;align-items:center">
            <svg class="icon">
              <use :xlink:href="getIcon(row)" />
            </svg>
            <span style="margin-left:8px">{{ row.fileName }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column width="300">
        <template #default="{ row }">
          <el-button-group class="mb-4">
            <el-button type="text"
              circle><el-icon>
                <View />
              </el-icon></el-button>
            <el-button type="text"
              circle><el-icon>
                <Share />
              </el-icon></el-button>
            <el-button type="text"
              circle><el-icon>
                <Download />
              </el-icon></el-button>
            <el-button type="text"
              circle><el-icon>
                <DeleteFilled />
              </el-icon></el-button>
            <el-button type="text"
              circle><el-icon>
                <EditPen />
              </el-icon></el-button>
            <el-button type="text"
              @click.stop="(e) => handleContextmenu(e, row)"
              circle><el-icon>
                <More />
              </el-icon></el-button>
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
                  <el-dropdown-item @click="handleMenuAction('favorite')">
                    收藏
                  </el-dropdown-item>
                  <el-dropdown-item @click="handleMenuAction('share')">
                    分享
                  </el-dropdown-item>
                  <el-dropdown-item @click="handleMenuAction('copy')">

                  </el-dropdown-item>
                  <el-dropdown-item @click="handleMenuAction('remove')">
                    移动
                  </el-dropdown-item>
                  <el-dropdown-item @click="handleMenuAction('lock')">
                    锁定
                  </el-dropdown-item>
                  <el-dropdown-item divided
                    @click="handleMenuAction('showDetailedInformation')">
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
/* ------------------ 引入 ------------------ */
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowRight } from '@element-plus/icons-vue'
import request from "@/utils/request";
import { useCurrentIdStore } from '@/store/currentId';
const currentIdStore = useCurrentIdStore()
/* ------------------ 路由 ------------------ */
const route = useRoute()
const router = useRouter()

/* ------------------ 数据 ------------------ */
const list = ref([])                // 当前目录文件列表
const error = ref(null)             // 错误信息
const selectedRow = ref(null)       // 当前选中的文件项
const pathToIdMap = ref(JSON.parse(sessionStorage.getItem('pathToIdMap') || '{}')) // 路径到ID的映射关系

// 保存路径到ID的映射关系
const savePathToIdMap = () => {
  sessionStorage.setItem('pathToIdMap', JSON.stringify(pathToIdMap.value))
}

/* ------------------ 图标配置 ------------------ */
const ICON_MAP = {
  FOLDER: '#icon-wenjianjia',
  FILE_TYPES: {
    0: '#icon-yasuobao',  // 压缩包
    1: '#icon-word',       // Word
    2: '#icon-ppt',        // PowerPoint
    3: '#icon-excel',      // Excel
    4: '#icon-pdf',        // PDF
    5: '#icon-jpg',        // 图片
    6: '#icon-mp',         // 音频
    7: '#icon-mp4',        // 视频
    8: '#icon-txt'         // 文本
  },
  DEFAULT_FILE: '#icon-wenjianlei_weizhiwenjian' // 默认文件图标
}

/**
 * 获取文件/文件夹图标
 * @param row 文件项
 * @returns 图标链接
 */
const getIcon = (row) => {
  if (row.type === 0) {
    return ICON_MAP.FOLDER;
  }
  return ICON_MAP.FILE_TYPES[row.category] || ICON_MAP.DEFAULT_FILE;
}

/* ------------------ 面包屑 ------------------ */
// 把 "/（教程+资源）/手机玩电脑二创教程" 切成 ['','（教程+资源）','手机玩电脑二创教程']
const crumbArr = computed(() => {
  const path = route.query.path || '';
  // 先解码路径，避免编码导致的问题
  const decodedPath = decodeURIComponent(path);
  const arr = decodedPath.split('/').filter(Boolean);
  // 如果数组为空，返回空数组，在模板中处理显示首页
  return arr;
})

/**
 * 获取面包屑对应路径
 * @param idx 面包屑索引
 * @returns 路径字符串
 */
const crumbPath = (idx) => {
  return '/' + crumbArr.value.slice(0, idx + 1).join('/');
}

/* ------------------ 文件列表处理 ------------------ */
/**
 * 转换文件列表数据格式
 * @param data 原始文件数据
 * @returns 转换后的文件列表
 */
const transformFileList = (data) => {
  return data.map(item => ({
    id: item.id,
    fileName: item.originalName,
    type: item.fileType,
    category: item.category,
    modifyTime: item.modifyTime,
    fileSize: item.fileSize,
    // 移除不需要的字段
    originalName: undefined,
    fileType: undefined
  }));
}

/**
 * 获取文件列表
 */
async function getFileList() {
  error.value = null;
  try {
    const fileList = await request.get('/getFileList', { params: { parentId: currentIdStore.currentId } });

    console.log("获取到信息为", fileList);

    // 检查响应数据
    if (fileList.data && Array.isArray(fileList.data)) {
      list.value = transformFileList(fileList.data);
    } else {
      list.value = [];
      console.warn("获取到的文件列表数据格式不正确");
    }
  } catch (err) {
    console.error("获取文件列表失败:", err);
    error.value = "获取文件列表失败，请稍后重试";
    list.value = [];
  }
}

// 路由参数变化就重新拉数据
watch(() => route.query.path, (newPath, oldPath) => {
  // 当路径变化时，需要重新获取文件列表
  const path = newPath || '';

  // 根据路径获取对应的文件夹ID
  if (pathToIdMap.value[path] !== undefined) {
    currentIdStore.currentId = pathToIdMap.value[path];
  } else {
    // 如果是根路径，设置currentId为-1（假设-1表示根目录）
    currentIdStore.currentId = path === '' ? -1 : currentIdStore.currentId;
  }

  // 获取文件列表
  getFileList()
}, { immediate: true })

/* ------------------ 进入下级文件夹 ------------------ */
/**
 * 进入下级文件夹
 * @param row 文件项
 */
function enterFolder(row) {
  if (row.type !== 0) return          // 只有文件夹能进入

  // 更新当前文件夹ID
  currentIdStore.currentId = row.id;

  const current = route.query.path || '/'
  // 优化路径拼接，避免重复的 /
  const nextPath = current.endsWith('/')
    ? current + row.fileName
    : `${current}/${row.fileName}`

  // 保存路径到ID的映射关系
  pathToIdMap.value[nextPath] = row.id;
  savePathToIdMap();

  router.push({ name: 'index', query: { path: nextPath } })
}

/* ------------------ 右键菜单 ------------------ */
const dropdownRef = ref();
const position = ref({ top: 0, left: 0, bottom: 0, right: 0 })

const triggerRef = ref({
  getBoundingClientRect: () => position.value,
})

/**
 * 处理右键菜单
 * @param event 事件对象
 * @param row 文件项
 */
const handleContextmenu = (event, row) => {
  event.preventDefault(); // 阻止默认右键菜单 
  event.stopPropagation(); // 阻止事件冒泡

  selectedRow.value = row; // 保存当前选中的文件项

  // 设置菜单位置
  const { clientX, clientY } = event;
  position.value = DOMRect.fromRect({ x: clientX, y: clientY, width: 0, height: 0 });

  // 先关闭再打开，确保菜单正确显示
  dropdownRef.value?.handleClose();
  setTimeout(() => {
    dropdownRef.value?.handleOpen();
  }, 0);
}

/**
 * 关闭右键菜单
 */
const closeContextMenu = () => {
  dropdownRef.value?.handleClose();
  selectedRow.value = null;
}

/**
 * 处理右键菜单操作
 * @param action 操作类型
 */
const handleMenuAction = (action) => {
  if (!selectedRow.value) return;

  switch (action) {
    case 'favorite':
      // 收藏逻辑
      console.log('重命名文件:', selectedRow.value);
      break;
    case 'share':
      // 分享逻辑
      console.log('重命名文件:', selectedRow.value);
      break;
    case 'copy':
      // 复制逻辑
      console.log('重命名文件:', selectedRow.value);
      break;
    case 'remove':
      // 移动逻辑
      console.log('删除文件:', selectedRow.value);
      break;
    case 'lock':
      // 上锁逻辑
      console.log('分享文件:', selectedRow.value);
      break;
    default:
      console.log('操作错误:');
      break;
  }

  closeContextMenu();
}

/* ------------------ 组件暴露方法 ------------------ */
defineExpose({
  /**
   * 刷新文件列表
   */
  refresh() {
    getFileList()
  },
  /**
   * 设置当前文件夹ID
   * @param parentId 文件夹ID
   */

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