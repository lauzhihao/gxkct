// API配置管理
export interface ApiConfig {
  baseUrl: string
  environment: 'dev' | 'preview'
  timeout: number
}

// 获取当前环境的API配置
export function getApiConfig(): ApiConfig {
  const environment = (process.env.NEXT_PUBLIC_ENVIRONMENT as 'dev' | 'preview') || 'dev'

  // 本地开发环境：使用相对路径，由Next.js rewrites代理到38080
  // 预览环境：使用完整URL指向后端服务
  let baseUrl = ''
  if (environment === 'dev') {
    baseUrl = '' // 使用相对路径，由rewrites代理
  } else {
    baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://qa.gxkct.com/college'
  }

  return {
    baseUrl,
    environment,
    timeout: 30000,
  }
}

// 构建完整的API URL
export function buildApiUrl(endpoint: string): string {
  const config = getApiConfig()
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`

  // 如果baseUrl为空（本地开发），直接返回endpoint
  if (!config.baseUrl) {
    return cleanEndpoint
  }

  // 否则拼接baseUrl和endpoint
  return `${config.baseUrl}${cleanEndpoint}`
}

