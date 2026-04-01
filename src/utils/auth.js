const LOGIN_USER_KEY = 'loginUser'

function parseLoginUser(rawValue) {
  if (!rawValue) {
    return null
  }

  try {
    const loginUser = JSON.parse(rawValue)
    return loginUser && typeof loginUser === 'object' ? loginUser : null
  } catch {
    return null
  }
}

export function clearLoginUser() {
  localStorage.removeItem(LOGIN_USER_KEY)
}

export function getLoginUser() {
  const rawValue = localStorage.getItem(LOGIN_USER_KEY)
  const loginUser = parseLoginUser(rawValue)

  if (!loginUser && rawValue) {
    clearLoginUser()
    return null
  }

  return loginUser
}

export function getToken() {
  const loginUser = getLoginUser()
  const token = loginUser?.token
  return typeof token === 'string' && token.trim() ? token.trim() : ''
}

export function setLoginUser(loginUser) {
  if (!loginUser || typeof loginUser !== 'object') {
    clearLoginUser()
    return
  }

  localStorage.setItem(LOGIN_USER_KEY, JSON.stringify(loginUser))
}

export function isLoggedIn() {
  return !!getToken()
}
