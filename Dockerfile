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

# ✅ ADD THESE LINES: Declare and set all VITE_* variables needed at build time
ARG VITE_PROJECT_ID
ARG VITE_WALLETCONNECT_PROJECT_ID
ARG VITE_APP_ENV
ARG VITE_IE_DOMAIN
ARG VITE_MGMT_API_URL
ARG VITE_QUIZ_API_URL
ARG VITE_SEO_X_DEFAULT_DOMAIN
ARG VITE_SITE_ORIGIN
ARG VITE_UK_DOMAIN
ARG VITE_SEPOLIA_RPC_URL

ENV VITE_PROJECT_ID=$VITE_PROJECT_ID
ENV VITE_WALLETCONNECT_PROJECT_ID=$VITE_WALLETCONNECT_PROJECT_ID
ENV VITE_APP_ENV=$VITE_APP_ENV
ENV VITE_IE_DOMAIN=$VITE_IE_DOMAIN
ENV VITE_MGMT_API_URL=$VITE_MGMT_API_URL
ENV VITE_QUIZ_API_URL=$VITE_QUIZ_API_URL
ENV VITE_SEO_X_DEFAULT_DOMAIN=$VITE_SEO_X_DEFAULT_DOMAIN
ENV VITE_SITE_ORIGIN=$VITE_SITE_ORIGIN
ENV VITE_UK_DOMAIN=$VITE_UK_DOMAIN
ENV VITE_SEPOLIA_RPC_URL=$VITE_SEPOLIA_RPC_URL

# Build the application (now has access to VITE_* vars)
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

# Copy node_modules from builder (includes compiled native modules and all dependencies)
COPY --from=builder /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
# Copy server directory (needed for runtime)
COPY --from=builder /app/server ./server

# Expose port (Railway will override with PORT env var)
EXPOSE 8080

# Health check (use PORT env var)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "const port = process.env.PORT || 3001; require('http').get('http://localhost:' + port + '/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the server
CMD ["npm", "start"]