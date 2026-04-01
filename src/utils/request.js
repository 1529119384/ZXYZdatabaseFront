import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router/index.js'
import { clearLoginUser, getToken } from '@/utils/auth'

const request = axios.create({
  baseURL: 'http://localhost:8080',
  timeout: 5000,
})

let lastErrorMessage = ''
let lastErrorTime = 0

function showErrorMessage(message) {
  const now = Date.now()
  if (message === lastErrorMessage && now - lastErrorTime < 1500) {
    return
  }

  lastErrorMessage = message
  lastErrorTime = now
  ElMessage.error(message)
}

function redirectToLogin() {
  clearLoginUser()

  const currentRoute = router.currentRoute.value
  const targetPath = currentRoute?.fullPath || '/index'

  if (currentRoute?.name === 'login') {
    return
  }

  router.replace({
    name: 'login',
    query: { redirect: targetPath },
  })
}

request.interceptors.request.use(
  (config) => {
    const token = getToken()

    if (token) {
      config.headers.loginUser = token
    }

    return config
  },
  (error) => Promise.reject(error),
)

request.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.code === 1) {
      return res
    }

    if (res.message === 'NO_LOGIN') {
      redirectToLogin()
      return Promise.reject(new Error('NO_LOGIN'))
    }

    return Promise.reject(new Error(res.message || 'Error'))
  },
  (error) => {
    if (error.response?.status === 401) {
      redirectToLogin()
      return Promise.reject(error)
    }

    if (!error.response) {
      const message = error.code === 'ECONNABORTED'
        ? '请求超时，请检查网络或稍后重试'
        : '网络未连接或服务异常，请稍后重试'
      showErrorMessage(message)
      return Promise.reject(error)
    }

    if (error.response.status >= 500) {
      showErrorMessage('服务器异常，请稍后重试')
    }

    return Promise.reject(error)
  },
)

export default request
