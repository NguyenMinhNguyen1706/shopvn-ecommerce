# ── BUILD STAGE ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Leverage Docker layer cache
COPY package*.json ./
RUN npm ci

COPY . .

# ── PRODUCTION STAGE ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install curl for docker healthcheck
RUN apk add --no-cache curl

# Create non-privileged user for security - Concept: Secrets Management / IAM
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy only production dependencies and source files
COPY package*.json ./
RUN npm ci --only=production

COPY --chown=nextjs:nodejs . .

USER nextjs

EXPOSE 3000

# Liveness check instruction
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "start"]
