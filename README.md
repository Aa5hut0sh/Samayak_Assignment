# Samayak — Admin Panel

---

## 🔗 Live Demo

| | URL |
|---|---|
| **Live Demo** | https://samayak.ashuttosh.me |
| **Health Check** | https://samayak.ashuttosh.me/api/health |

**Demo login**
```
Email:    admin@samayak.in
Password: demo1234
```

---

## 🚀 Run Locally

### Option A — Docker (recommended, one command)

**1. Clone the repo**
```bash
git clone https://github.com/Aa5hut0sh/Samayak_Assignment.git
cd Samayak_Assignment
```

**2. Create a `.env` file in the root**
```env
# Required — get a free key at console.groq.com
GROQ_API_KEY=your_groq_api_key_here
```

> Everything else (Postgres, Redis, JWT secret, ports) is already set inside `docker-compose.yml`.

**3. Start all services**
```bash
docker compose up -d
```

This starts:
- PostgreSQL on `5432`
- Redis on `6379`
- Backend API on `http://localhost:3001`
- Frontend on `http://localhost:3000`

**4. Seed the database**
```bash
# Run migrations
docker compose exec backend bunx prisma migrate deploy

# Seed CSE timetable data + admin user
docker compose exec backend bun run prisma/seed.ts
```

**5. Open the app**

→ http://localhost:3000

---

### Option B — Manual (without Docker)

**1. Clone and install**
```bash
git clone https://github.com/Aa5hut0sh/Samayak_Assignment.git
cd Samayak_Assignment
bun install
```

**2. Start Postgres + Redis via Docker**
```bash
docker compose up postgres redis -d
```

**3. Create `apps/backend/.env`**
```env
DATABASE_URL=postgresql://samayak:samayak@localhost:5432/samayak
REDIS_URL=redis://localhost:6379
JWT_SECRET=supersecret
ADMIN_SECRET=Iamtheadmin
GROQ_API_KEY=your_groq_api_key_here
PORT=3001
```

**4. Create `apps/frontend/.env`**
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

**5. Run migrations + generate Prisma client**
```bash
cd packages/db
bunx prisma generate
bunx prisma migrate dev
```

**6. Seed the database**
```bash
# Still inside packages/db
bun run prisma/seed.ts
```

**7. Start backend + frontend**
```bash
# From repo root
bun run dev
```

- Backend → http://localhost:3001
- Frontend → http://localhost:3000

---

## 🔑 Environment Variables

| Variable | Where | Description |
|---|---|---|
| `GROQ_API_KEY` | backend | Vision model for PDF OCR · [console.groq.com](https://console.groq.com) |
| `DATABASE_URL` | backend | Postgres connection string |
| `REDIS_URL` | backend | Redis connection string |
| `JWT_SECRET` | backend | JWT signing secret |
| `ADMIN_SECRET` | backend | Secret required to register first admin |
| `PORT` | backend | API port (default `3001`) |
| `NEXT_PUBLIC_BACKEND_URL` | frontend | Backend base URL |

---

