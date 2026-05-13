# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# openssl нужен Prisma query engine (linux-musl-openssl-3.0.x) на Alpine
RUN apk add --no-cache openssl

# Copy the standalone server bundle (next.config.ts sets output:"standalone")
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
RUN mkdir -p ./public

# Templates and prisma schema are needed at runtime
COPY --from=builder /app/templates ./templates
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# Prisma CLI для runtime-команд типа `prisma db push` (не через npx — npx подтянет v7)
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

EXPOSE 3000
CMD ["node", "server.js"]
