# Build a "virtual laptop" and call it "builder" (separation of concerns)
FROM node:22-alpine AS builder

# Install openssl for Prisma (Required for Alpine)
RUN apk add --no-cache openssl

WORKDIR /usr/src/app

# Copy configuration files
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDeps for the build)
RUN npm ci

# Copy source code and generate Prisma Client
COPY . .
RUN npx prisma generate
RUN npm run build

# Remove dev dependencies to keep the image small
RUN npm prune --omit=dev

# ---

# STAGE 2 - Build another "virtual laptop" (or image) set up the files by copying files from the "builder" laptop.
FROM node:22-alpine 

# Install openssl for Prisma runtime
RUN apk add --no-cache openssl

ENV NODE_ENV=production

USER node
WORKDIR /usr/src/app

# Copy necessary files from builder ("virtual laptop 1")
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma

CMD ["node", "dist/main.js"] 