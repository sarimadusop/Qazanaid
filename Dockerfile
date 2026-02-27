# Build Stage
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Production Stage
FROM node:20-slim

WORKDIR /app

# Copy built files and production dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/server ./server

# Only install production dependencies to keep image small
RUN npm install --omit=dev

# Kazana default port
EXPOSE 5000

# Create uploads directory and ensure it is writable
RUN mkdir -p /app/uploads && chmod 777 /app/uploads

ENV NODE_ENV=production

CMD ["node", "dist/index.cjs"]
