<template>
  <div class="file-page">
    <!-- 面包屑：直接根据 $route.query.path 生成 -->
    <el-breadcrumb :separator-icon="ArrowRight" class="breadcrumb">
      <el-breadcrumb-item v-for="(name, idx) in crumbArr" :key="idx"
        :to="{ name: 'Files', query: { path: crumbPath(idx) } }">
        {{ name || '首页' }}
      </el-breadcrumb-item>
    </el-breadcrumb>

    <!-- 文件表格 -->
    <el-table :data="list" style="width:100%" @row-dblclick="enterFolder">
      <el-table-column type="selection" width="55" />
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
      <el-table-column label="修改时间" width="180" />
      <el-table-column label="大小" width="120" />
    </el-table>
  </div>
</template>

<script setup>
/* ------------------ 引入 ------------------ */
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowRight } from '@element-plus/icons-vue'
// import fetchList from '@/api/files'
import axios from 'axios'

/* ------------------ 路由 ------------------ */
const route = useRoute()
const router = useRouter()

/* ------------------ 数据 ------------------ */
const list = ref([])                // 当前目录文件列表

/* ------------------ 图标 ------------------ */
const iconMap = {
  0: '#icon-yasuobao', 1: '#icon-word', 2: '#icon-ppt', 3: '#icon-excel',
  4: '#icon-pdf', 5: '#icon-jpg', 6: '#icon-mp', 7: '#icon-mp4', 8: '#icon-txt'
}
const getIcon = (row) =>
  row.type === 0 ? '#icon-wenjianjia' : (iconMap[row.category] || '#icon-wenjianlei_weizhiwenjian')

/* ------------------ 面包屑 ------------------ */
// 把 "/（教程+资源）/手机玩电脑二创教程" 切成 ['','（教程+资源）','手机玩电脑二创教程']
const crumbArr = computed(() =>
  (route.query.path || '').split('/').filter(Boolean)
)
// 点击面包屑第 idx 级时对应的 path
const crumbPath = (idx) =>
  '/' + crumbArr.value.slice(0, idx + 1).join('/')

/* ------------------ 获取列表 ------------------ */
async function fetchList() {
  // 1. 调接口：把当前路径 encode 后传给后端
  const { data } = await axios.get('/api/files', {
    params: { path: route.query.path || '/' }
  })
  if(data.code==0){
    console.log("出错了",data);
  
  }
  // 2. 后端返回当前目录下的文件/文件夹数组
  list.value = data
}
// 路由参数变化就重新拉数据
watch(() => route.query.path, fetchList, { immediate: true })

/* ------------------ 进入下级文件夹 ------------------ */
function enterFolder(row) {
  if (row.type !== 0) return          // 只有文件夹能进入
  const current = route.query.path || '/'
  const nextPath = current.endsWith('/')
    ? current + encodeURIComponent(row.fileName)
    : current + '/' + encodeURIComponent(row.fileName)
  router.push({ name: 'Files', query: { path: nextPath } })
}
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
}
</style>