import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'element-plus/es/components/message/style/css'

// import './assets/main.css'

const app = createApp(App)
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}
// 时间格式化全局变量
app.config.globalProperties.$fmtTime = iso =>
  new Date(iso).toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');
// 大小全局变量
app.config.globalProperties.$formatSize = (bytes) => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i]
}
app.use(router)
app.mount('#app')

