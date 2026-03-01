# --- Stage 1: Build ---
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Install dependencies globally for turbo
RUN npm install -g turbo

# Copy workspace configuration
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/config/package.json ./packages/config/
COPY packages/database/package.json ./packages/database/
COPY packages/docker/package.json ./packages/docker/
COPY packages/logger/package.json ./packages/logger/
COPY packages/redis/package.json ./packages/redis/
COPY packages/types/package.json ./packages/types/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client
RUN cd packages/database && npx prisma generate

# Build the project
RUN turbo run build --filter=@codehost/api

# --- Stage 2: Runtime ---
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Install only production dependencies
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/config/package.json ./packages/config/
COPY packages/database/package.json ./packages/database/
COPY packages/docker/package.json ./packages/docker/
COPY packages/logger/package.json ./packages/logger/
COPY packages/redis/package.json ./packages/redis/
COPY packages/types/package.json ./packages/types/

RUN npm ci --omit=dev

# Copy built assets and prisma client
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/config/dist ./packages/config/dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/packages/docker/dist ./packages/docker/dist
COPY --from=builder /app/packages/logger/dist ./packages/logger/dist
COPY --from=builder /app/packages/redis/dist ./packages/redis/dist
COPY --from=builder /app/packages/types/dist ./packages/types/dist

# Expose port
EXPOSE 4000

# Start the API
CMD ["node", "apps/api/dist/index.js"]
