# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

ARG PUBLIC_SUPABASE_URL
ARG PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
ENV PUBLIC_SUPABASE_URL=$PUBLIC_SUPABASE_URL
ENV PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=$PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

RUN npm run build

FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --only=production; else npm install --only=production; fi

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/skills ./skills
COPY --from=builder /app/next.config.js ./next.config.js

EXPOSE 3000
CMD ["npm", "run", "start", "--", "-p", "3000", "-H", "0.0.0.0"]
