FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS development
COPY . .
ENV NODE_ENV=development
EXPOSE 3000
CMD ["pnpm", "dev"]

FROM dependencies AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build \
    BETTER_AUTH_SECRET=build-only-secret-not-used-at-runtime-000000000000 \
    BETTER_AUTH_URL=http://localhost:3000 \
    pnpm build

FROM base AS production
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
RUN addgroup -S --gid 1001 app && adduser -S --uid 1001 --ingroup app app
COPY --from=builder --chown=app:app /app /app
USER app
EXPOSE 3000
CMD ["pnpm", "start"]
