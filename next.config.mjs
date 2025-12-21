/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  turbopack: {
    root: process.cwd(), // 明确指定项目根目录，避免 lockfile 检测警告
  },
  compress: false, // disable gzip compression to avoid buffering SSE streams
  // 不建议使用 export，否则 chunk 会巨大
  // output: process.env.NEXT_PUBLIC_ENVIRONMENT === 'preview' ? 'export' : undefined,
  output: 'standalone',

  images: {
    unoptimized: false,
  },

  modularizeImports: {
    lodash: {
      transform: 'lodash/{{member}}',
    },
    'date-fns': {
      transform: 'date-fns/{{member}}',
    },
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  ...(process.env.NEXT_PUBLIC_ENVIRONMENT !== 'preview' && {
    rewrites: async () => ({
      beforeFiles: [
        {
          source: '/api/:path((?!chat/sse).*)', // ❗排除 SSE 的转发
          destination: 'http://localhost:38080/api/:path*',
        },
      ],
    }),
  }),
}

export default nextConfig