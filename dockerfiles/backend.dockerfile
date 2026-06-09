FROM oven/bun

WORKDIR /app


ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

# 2. Copy your dependency files
COPY ./package.json ./package.json
COPY ./bun.lock ./bun.lock
COPY ./apps/backend/package.json ./apps/backend/package.json

# 3. Copy source code
COPY ./packages ./packages
COPY ./apps/backend ./apps/backend


RUN bun install

EXPOSE 3001

RUN cd packages/database && bunx --bun prisma generate

CMD ["bun", "run","--cwd", "apps/backend", "index.ts"]