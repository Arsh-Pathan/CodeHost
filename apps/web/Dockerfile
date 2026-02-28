# --- Stage 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

# Enable turbo
RUN npm install -g turbo

# Copy workspace configuration
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Set build-time variables
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build Next.js app
RUN turbo run build --filter=web

# --- Stage 2: Runtime ---
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Next.js standalone setup
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

# Expose Next.js port
EXPOSE 3000

# Start Next.js
CMD ["node", "apps/web/server.js"]
