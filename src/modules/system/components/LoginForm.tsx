'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { api } from '@/lib/api'
import { useSemesterStore } from '@/shared/stores/semester-store'
// 登录状态在本地处理，不再展示全局 toast

export function LoginForm() {
  const router = useRouter()
  const syncFromAuthContext = useSemesterStore((state) => state.syncFromAuthContext)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // 判断登陆按钮是否应该被禁用
  const isLoginDisabled = isLoading || !username.trim() || !password

  // 处理用户名回车
  const handleUsernameEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (password) {
        handleLogin()
      } else {
        const passwordInput = document.querySelector('input[type="password"]')
        if (passwordInput) {
          (passwordInput as HTMLInputElement).focus()
        }
      }
    }
  }

  // 处理登录
  const handleLogin = async () => {
    const trimmedUsername = username.trim()
    setUsername(trimmedUsername)

    if (!trimmedUsername) {
      setUsernameError('用户名不能为空')
      return
    }
    setUsernameError('')

    setIsLoading(true)
    try {
      const response = await api.users.login(trimmedUsername, password)

      if (response.error) {
        setUsernameError(response.error || '登录失败，请稍后重试')
        return
      }

      setUsernameError('')

      if (response.data) {
        syncFromAuthContext({
          currentSemesterId: response.data.currentSemesterId,
          selectedSemesterId: response.data.currentSemesterId,
          semesterList: response.data.semesterList,
        })
      }

      // [MOD] 使用 replace 而不是 push：将登录页从历史栈中替换出去，
      // 避免用户在主应用内误点浏览器返回键时回到登录页
      router.replace('/')
    } catch (error) {
      console.error('Login failed:', error)
      setUsernameError('登录失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    handleLogin()
  }

  // 该交互仅用于表单可用性，不属于管理类权限动作
  const handleTogglePasswordVisibility = () => {
    setShowPassword((prev) => !prev)
  }

  const labelLeftOffset = 'calc(1rem + 1.5rem + 2px)'

  return (
    <form className="w-full max-w-md mx-auto flex flex-col items-center" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-4 space-y-3 w-full max-w-md mx-auto">
        <div className="flex flex-col gap-8 space-y-6">
          {/* 邮箱输入框 */}
          <div className="relative group">
          <label
            htmlFor="username-input"
            className="absolute z-20 bg-white px-3 py-0.5 text-[1.3125rem] font-semibold text-gray-700 leading-tight -top-1 -translate-y-[35%]"
            style={{ left: labelLeftOffset }}
          >
            用户名
          </label>
          {usernameError && (
            <span className="absolute right-4 top-0 -translate-y-1/2 z-20 bg-white px-3 py-0.5 text-[1.3125rem] font-semibold text-red-500 leading-tight">
              {usernameError}
            </span>
          )}
          <div
            className={`flex items-center h-16 rounded-lg border bg-white px-4 transition-all ${
              usernameError
                ? 'border-red-500 focus-within:border-red-500'
                : 'border-gray-300 focus-within:border-blue-500'
            }`}
          >
            <div className="flex-shrink-0 text-gray-400 mr-0.5">
              <Mail className="h-6 w-6" />
            </div>
            <input
              id="username-input"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                if (usernameError) {
                  setUsernameError('')
                }
              }}
              onKeyUp={handleUsernameEnter}
              autoFocus
              autoComplete="username"
              className="flex-1 h-full border-none bg-transparent text-lg focus:outline-none"
              style={{ marginLeft: '5px' }}
            />
          </div>
        </div>

        {/* 密码输入框 */}
        <div className="relative group">
          <label
            htmlFor="password-input"
            className="absolute bg-white px-3 py-0.5 text-[1.3125rem] font-semibold text-gray-700 leading-tight -top-1 -translate-y-[35%]"
            style={{ left: labelLeftOffset }}
          >
            密码
          </label>
          <div className="flex items-center h-16 rounded-lg border border-gray-300 bg-white px-4 transition-all focus-within:border-blue-500">
            <div className="flex-shrink-0 text-gray-400 mr-0.5">
              <Lock className="h-6 w-6" />
            </div>
            <input
              id="password-input"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyUp={(e) => e.key === 'Enter' && handleLogin()}
              autoComplete="current-password"
              className="flex-1 h-full border-none bg-transparent text-lg focus:outline-none"
              style={{ marginLeft: '5px' }}
            />
            <button
              type="button"
              onClick={handleTogglePasswordVisibility}
              className="ml-3 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* 登录按钮 */}
        <div className="flex justify-center w-full">
          <button
            type="submit"
            disabled={isLoginDisabled}
            className="w-1/2 max-w-xs mx-auto px-10 py-3 bg-blue-600 text-white font-semibold rounded-lg border border-blue-600 shadow-md hover:bg-blue-700 hover:border-blue-700 disabled:bg-blue-400 disabled:border-blue-400 disabled:text-white disabled:opacity-80 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 transition-colors"
            style={{ backgroundColor: '#2563eb', color: '#fff', borderColor: '#2563eb' }}
          >
            {isLoading ? '登录中...' : '登录'}
          </button>
        </div>
        </div>

        {/* 用户协议 */}
        <div className="text-center text-sm text-gray-500">
          登录视为您已阅读并同意
          <a
            href="https://home.qj-robots.com/policies.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 ml-1"
          >
            用户协议、隐私政策
          </a>
        </div>
      </div>
    </form>
  )
}
