FROM oven/bun AS builder

WORKDIR /app

ARG NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL


COPY ./package.json ./package.json
COPY ./bun.lock ./bun.lock
COPY ./apps/frontend/package.json ./apps/frontend/package.json

COPY ./packages ./packages
COPY ./apps/frontend ./apps/frontend

RUN bun install
RUN bun run --cwd apps/frontend build


FROM oven/bun AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app/apps/frontend/.next/standalone ./

COPY --from=builder /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public

EXPOSE 3000

CMD ["bun", "apps/frontend/server.js"]