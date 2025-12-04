/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  compress: false, // disable gzip compression to avoid buffering SSE streams
turbopack: {
  root: ".",
},
  // 不建议使用 export，否则 chunk 会巨大
  // output: process.env.NEXT_PUBLIC_ENVIRONMENT === 'preview' ? 'export' : undefined,

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