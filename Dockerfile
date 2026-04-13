# Build a "virtual laptop" and call it "builder"
FROM node:20.19.0-alpine AS builder

# Install openssl for Prisma (Required for Alpine)
RUN apk add --no-cache openssl

WORKDIR /usr/src/app

# Copy configuration files
COPY package*.json ./

# Ensure Prisma Schema is there before installation
COPY prisma ./prisma/

# Install ALL dependencies
RUN npm ci

# Copy source code
COPY . .

# Ensure we use the correct binary for Alpine
ENV PRISMA_CLI_BINARY_TARGETS=linux-musl-openssl-3.0.x

# 1. Generate the client into src/generated/client
RUN npx prisma generate

# 2. Build the NestJS app (it will now include the generated client in /dist)
RUN npm run build

# Remove dev dependencies
RUN npm prune --omit=dev

# ============================================
# RUNTIME STAGE
# ============================================
FROM node:20.19.0-alpine

RUN apk add --no-cache openssl curl

WORKDIR /usr/src/app

# Copy node_modules (production only)
COPY --from=builder /usr/src/app/node_modules ./node_modules

# 3. CRITICAL: Copy the generated client folder 
# Even though it's built into /dist, the runtime code still looks for 
# the source paths if you used relative imports.
COPY --from=builder /usr/src/app/src/generated ./src/generated

# Copy the compiled code
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/package*.json ./

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/src/main.js"]