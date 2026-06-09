FROM oven/bun

WORKDIR /app

ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL


COPY package.json bun.lock ./
COPY apps/backend/package.json apps/backend/package.json


COPY packages packages
COPY apps/backend apps/backend


RUN bun install


RUN cd packages/database && bunx --bun prisma generate

EXPOSE 3001

CMD sh -c "cd packages/database && bunx --bun prisma migrate deploy && bun run --cwd apps/backend index.ts"

