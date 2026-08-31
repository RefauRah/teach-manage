# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency specifications
COPY package*.json ./
RUN npm ci

# Copy source files
COPY tsconfig*.json vite.config.ts ./
COPY src/ ./src/
COPY web/ ./web/

# Build client and server
RUN npm run build

# Stage 2: Production Runtime
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Install tzdata for timezone handling
RUN apk add --no-cache tzdata

COPY package*.json ./
RUN npm ci --omit=dev

# Copy built assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/database/migrations ./src/database/migrations

# Expose port
EXPOSE 3000

# Set entry point
CMD ["node", "dist/server/server.js"]
