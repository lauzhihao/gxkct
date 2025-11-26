/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NEXT_PUBLIC_ENVIRONMENT === 'preview' ? 'export' : undefined,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: '/Users/liuzhihao/Downloads/education-tree-system',
  },
  // 本地开发环境使用rewrites进行API代理
  ...(process.env.NEXT_PUBLIC_ENVIRONMENT !== 'preview' && {
    rewrites: async () => {
      return {
        beforeFiles: [
          {
            source: '/api/:path*',
            destination: 'http://localhost:38080/api/:path*',
          },
        ],
      }
    },
  }),
}

export default nextConfig
