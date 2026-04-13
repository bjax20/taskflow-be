# Stage 1: Build
FROM node:20.19.0-alpine AS builder

# 1. Install system dependencies (Prisma needs openssl and libc6-compat on Alpine)
RUN apk add --no-cache openssl libc6-compat

# 2. Setup pnpm
RUN npm install -g pnpm

WORKDIR /usr/src/app

# 3. Copy dependency files AND .npmrc
COPY package.json pnpm-lock.yaml .npmrc ./
COPY prisma ./prisma/

# 4. Strict install (now respects the hoisting/build-script rules)
RUN pnpm install --frozen-lockfile

# 5. Copy source and generate Prisma Client inside node_modules
COPY . .

# Match the binary target to the Alpine runtime
ENV PRISMA_CLI_BINARY_TARGETS=linux-musl-openssl-3.0.x
RUN pnpm exec prisma generate

# 6. Build the NestJS application
RUN pnpm run build

# 7. Remove devDependencies (Prisma client stays because it's in dependencies)
RUN pnpm prune --prod

# ============================================
# Stage 2: Runtime
# ============================================
FROM node:20.19.0-alpine

# Install runtime requirements
RUN apk add --no-cache openssl curl

WORKDIR /usr/src/app

# 8. Copy production node_modules (this now contains the generated Prisma client)
COPY --from=builder /usr/src/app/node_modules ./node_modules

# 9. Copy compiled code and metadata
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/package.json ./

# Optional: Set user to 'node' for security
# USER node

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/src/main.js"]