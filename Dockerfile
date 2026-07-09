# --- Stage 1: Base Builder ---
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl libc6-compat git

WORKDIR /app

# Enable turbo
RUN npm install -g turbo

# Copy workspace configuration
COPY package.json package-lock.json tsconfig.base.json turbo.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY billing/package.json ./billing/
COPY database/package.json ./database/
COPY packages/config/package.json ./packages/config/
COPY packages/docker/package.json ./packages/docker/
COPY packages/logger/package.json ./packages/logger/
COPY packages/redis/package.json ./packages/redis/
COPY packages/types/package.json ./packages/types/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client
RUN cd database && npx prisma generate

# Build everything
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN turbo run build --filter=@codehost/api --filter=web

# --- Stage 2: API Runner ---
FROM node:20-alpine AS api

RUN apk add --no-cache openssl libc6-compat git docker-cli

WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY billing/package.json ./billing/
COPY database/package.json ./database/
COPY packages/config/package.json ./packages/config/
COPY packages/docker/package.json ./packages/docker/
COPY packages/logger/package.json ./packages/logger/
COPY packages/redis/package.json ./packages/redis/
COPY packages/types/package.json ./packages/types/

RUN npm ci --omit=dev

# Copy built assets and prisma client
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/packages/config/dist ./packages/config/dist
COPY --from=builder /app/database/dist ./database/dist
COPY --from=builder /app/database/prisma ./database/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/packages/docker/dist ./packages/docker/dist
COPY --from=builder /app/packages/logger/dist ./packages/logger/dist
COPY --from=builder /app/packages/redis/dist ./packages/redis/dist
COPY --from=builder /app/packages/types/dist ./packages/types/dist

EXPOSE 4000
CMD ["node", "backend/dist/index.js"]

# --- Stage 3: Web Runner ---
FROM node:20-alpine AS web

WORKDIR /app
ENV NODE_ENV=production

# Next.js standalone setup
COPY --from=builder /app/frontend/public ./frontend/public
COPY --from=builder /app/frontend/.next/standalone ./
COPY --from=builder /app/frontend/.next/static ./frontend/.next/static

EXPOSE 3000
CMD ["node", "frontend/server.js"]
