// 认证配置和token管理

export interface AuthUser {
  id: number
  collegeId: number
  permissionId: number
  relativeId: number
  userName: string
  email: string
  avatar: string | null
  collegeName: string | null
  introduction: string | null
  job: string | null
  major: string | null
  contactEmail: string | null
}

export interface AuthResponse {
  authToken: string
  user: AuthUser
}

const AUTH_TOKEN_KEY = "education-api-auth-token"
const AUTH_USER_KEY = "education-api-auth-user"
const MANAGED_LOCAL_STORAGE_PREFIX = "education-api-"

// 退出登录时保留的非敏感偏好键
const PRESERVED_LOCAL_STORAGE_KEYS = new Set<string>([
  "education-api-colorTheme",
  "currentActivePage",
  "education-current-school",
  "education-tree-collapsed",
])

function clearManagedLocalStorage(): void {
  const keys = Object.keys(localStorage)

  keys.forEach((key) => {
    if (key === AUTH_TOKEN_KEY || key === AUTH_USER_KEY) {
      localStorage.removeItem(key)
      return
    }

    if (PRESERVED_LOCAL_STORAGE_KEYS.has(key)) {
      return
    }

    if (key.startsWith(MANAGED_LOCAL_STORAGE_PREFIX)) {
      localStorage.removeItem(key)
    }
  })
}

/**
 * 获取存储的认证token
 */
export function getStoredAuthToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

/**
 * 存储认证token
 */
export function setStoredAuthToken(token: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

/**
 * 清除认证token
 */
export function clearStoredAuthToken(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(AUTH_TOKEN_KEY)
}

/**
 * 获取存储的用户信息
 */
export function getStoredAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null
  const userJson = localStorage.getItem(AUTH_USER_KEY)
  if (!userJson) return null
  try {
    return JSON.parse(userJson)
  } catch {
    return null
  }
}

/**
 * 存储用户信息
 */
export function setStoredAuthUser(user: AuthUser): void {
  if (typeof window === "undefined") return
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
}

/**
 * 清除用户信息
 */
export function clearStoredAuthUser(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(AUTH_USER_KEY)
}

/**
 * 检查是否已认证
 */
export function isAuthenticated(): boolean {
  return getStoredAuthToken() !== null
}

/**
 * 获取当前用户ID
 */
export function getCurrentUserId(): number | null {
  const user = getStoredAuthUser()
  return user?.id ?? null
}

/**
 * 获取当前用户权限ID（基于登录后 getcurrentdepartment 结果缓存）
 */
export function getCurrentPermissionId(): number | null {
  const user = getStoredAuthUser()
  return user?.permissionId ?? null
}

/**
 * 清除所有认证信息及缓存数据
 * 退出登录时调用，会清空 localStorage 和 sessionStorage
 */
export function clearAllAuthData(): void {
  if (typeof window === "undefined") return

  // 仅清理认证和业务缓存，保留非敏感偏好设置
  clearManagedLocalStorage()
  // session 级数据在登出时全部清空
  sessionStorage.clear()
}
