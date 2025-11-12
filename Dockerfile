# Use Node.js 22 with full build tools
FROM node:22-bullseye AS builder

WORKDIR /app

# Install system dependencies for native modules (including libudev)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libudev-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:22-bullseye-slim

WORKDIR /app

# Install only runtime dependencies for native modules
RUN apt-get update && apt-get install -y \
    libudev1 \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Copy node_modules from builder (includes compiled native modules)
COPY --from=builder /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/public ./public

# Expose port (Railway will override with PORT env var)
EXPOSE 8080

# Health check (use PORT env var)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "const port = process.env.PORT || 3001; require('http').get('http://localhost:' + port + '/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the server
CMD ["npm", "start"]
