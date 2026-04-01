# Build a "virtual laptop" and call it "builder"
FROM node:20.19.0-alpine AS builder

# Install openssl for Prisma (Required for Alpine)
RUN apk add --no-cache openssl

WORKDIR /usr/src/app

# Copy configuration files
COPY package*.json ./

# Ensure Prisma Schema is there before npm ci
COPY prisma ./prisma/

# Install ALL dependencies (including devDeps like Nest CLI)
RUN npm ci

# Copy source code
COPY . .

# Ensure we use the correct binary for Alpine
ENV PRISMA_CLI_BINARY_TARGETS=linux-musl-openssl-3.0.x

RUN npx prisma generate
RUN npm run build

# Remove dev dependencies to keep the image small
RUN npm prune --omit=dev

# ============================================
# RUNTIME STAGE
# ============================================
FROM node:20.19.0-alpine

# Install openssl for runtime
RUN apk add --no-cache openssl

WORKDIR /app

# Copy only production files from builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/package*.json ./

# Set production environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Start the app
CMD ["node", "dist/main"]
