// src/utils/auth.js
export function isLoggedIn() {
  return !!localStorage.getItem('loginUser');   // 或取 pinia/vuex
}