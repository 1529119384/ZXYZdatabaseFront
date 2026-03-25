import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'element-plus/es/components/message/style/css'
import { createPinia } from 'pinia'
// import './assets/main.css'

const app = createApp(App)
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}
// 时间格式化全局变量
app.config.globalProperties.$fmtTime = iso =>
  new Date(iso).toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');
// 大小全局变量
app.config.globalProperties.$formatSize = (size) => {
  if (size === null || size === undefined || size === '') return '-'
  const bytes = Number(size)
  if (Number.isNaN(bytes) || bytes < 0) return '-'
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  )
  if (unitIndex === 0) {
    return `${bytes} B`
  }
  return `${(bytes / Math.pow(1024, unitIndex)).toFixed(2)} ${units[unitIndex]}`
}
app.use(createPinia()) 
app.use(router)
app.mount('#app')
