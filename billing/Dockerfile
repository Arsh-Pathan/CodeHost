# --- Stage 1: Build ---
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl libc6-compat git

WORKDIR /app

RUN npm install -g turbo

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

RUN npm ci

COPY . .
RUN cd database && npx prisma generate
RUN turbo run build --no-daemon --filter=@codehost/billing

# --- Stage 2: Runtime ---
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl libc6-compat git

WORKDIR /app
ENV NODE_ENV=production
ENV HOME=/tmp

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

COPY --from=builder /app/billing/dist ./billing/dist
COPY --from=builder /app/packages/config/dist ./packages/config/dist
COPY --from=builder /app/database/dist ./database/dist
COPY --from=builder /app/database/prisma ./database/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/packages/logger/dist ./packages/logger/dist
COPY --from=builder /app/packages/types/dist ./packages/types/dist

EXPOSE 4001
CMD ["node", "billing/dist/index.js"]
