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
# Only install production dependencies to keep image small
RUN npm install --omit=dev

# Kazana default port
EXPOSE 5000

ENV NODE_ENV=production

CMD ["node", "dist/index.cjs"]
