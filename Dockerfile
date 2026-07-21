# 构建阶段：编译 Next.js 应用
FROM node:22.21.1-alpine AS builder

WORKDIR /app

ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_ENVIRONMENT
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_ENVIRONMENT=${NEXT_PUBLIC_ENVIRONMENT}

# 复制 package.json 和依赖锁定文件
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* .npmrc* ./

# 根据 pnpm-lock.yaml 使用 pnpm，否则使用 npm
# （如果项目中同时存在多个锁定文件，优先使用 pnpm）
RUN if [ -f pnpm-lock.yaml ]; then \
      npm install -g pnpm@10.26.1 && \
      pnpm install --frozen-lockfile; \
    else \
      npm ci; \
    fi

# 复制源代码
COPY . .

# NEXT_PUBLIC_* 会在 next build 阶段写入客户端产物，必须在构建期显式传入。
RUN if [ -z "$NEXT_PUBLIC_API_BASE_URL" ]; then \
      echo "NEXT_PUBLIC_API_BASE_URL build arg is required"; \
      exit 1; \
    fi && \
    if [ -z "$NEXT_PUBLIC_ENVIRONMENT" ]; then \
      echo "NEXT_PUBLIC_ENVIRONMENT build arg is required"; \
      exit 1; \
    fi

# 构建应用
RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm run build; \
    else \
      npm run build; \
    fi

# 运行阶段：精简镜像
FROM node:22.21.1-alpine

WORKDIR /app

# 创建非 root 用户（安全最佳实践）
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# 只复制必要的运行时文件
COPY --from=builder /app/package.json ./
COPY --chown=nextjs:nodejs --from=builder /app/.next/standalone ./
COPY --chown=nextjs:nodejs --from=builder /app/public ./public
COPY --chown=nextjs:nodejs --from=builder /app/.next/static ./.next/static

USER nextjs

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1:3000/ || exit 1

# 对外暴露 3000 端口
EXPOSE 3000

# 启动应用，监听 0.0.0.0:3000
CMD ["sh", "-c", "HOSTNAME=0.0.0.0 PORT=3000 NODE_ENV=production node server.js"]
