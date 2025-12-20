import axios from "axios";
// request.js
import router from '@/router/index.js';   // 这里路径换成你项目里 router/index.js 的实际位置

const request = axios.create({
  baseURL: "http://localhost:8080",
  timeout: 5000
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const loginUser = JSON.parse(localStorage.getItem("loginUser"))
    // console.log(loginUser);

    if (loginUser && loginUser.token) {
      config.headers["loginUser"] = loginUser.token;
    }
    // console.log("最终发送的 headers =", config.headers)
    return config;   // ✔ 必须返回 config
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const res = response.data;
    if (res.code === 1) { return res.data };          // 业务正常

    // 未登录
    if (res.message === 'NO_LOGIN') {
      // 取当前路径，登录后再回来
      const currentRoute = router.currentRoute.value;
      const redirect = encodeURIComponent(currentRoute.fullPath);
      router.replace(`/login?redirect=${redirect}`);
      return Promise.reject(new Error('NO_LOGIN'));
    }

    // 其他业务错误
    return Promise.reject(new Error(res.message || 'Error'));
  },

  // 网络/500/401 等
  (error) => {
    if (error.response?.status === 401) {
      router.replace('/login');
    }
    return Promise.reject(error);
  }
);

export default request;
