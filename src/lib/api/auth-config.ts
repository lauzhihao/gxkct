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
 * 清除所有认证信息及缓存数据
 * 退出登录时调用，会清空 localStorage 和 sessionStorage
 */
export function clearAllAuthData(): void {
  if (typeof window === "undefined") return
  // 清空 localStorage（包含认证信息、主题设置等）
  localStorage.clear()
  // 清空 sessionStorage（包含课程缓存等）
  sessionStorage.clear()
}

