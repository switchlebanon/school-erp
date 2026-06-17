# S³ ERP — Backend

Node.js + Express + PostgreSQL (via Prisma) API for the S³ ERP system.

## 1. Prerequisites

- Node.js 18+ installed
- PostgreSQL installed and running locally (or a remote Postgres URL)

If you don't have PostgreSQL yet on Windows, the easiest path is:
- Install **PostgreSQL** from postgresql.org (includes pgAdmin), or
- Use **Docker**: `docker run --name school-erp-db -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres`

## 2. Setup

```bash
cd backend
npm install
```

Copy the environment file and edit it with your database credentials:

```bash
copy .env.example .env
```

Edit `.env`:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/school_erp"
JWT_SECRET="some-long-random-string"
```

## 3. Create the database & tables

This runs the Prisma migration, which creates all tables defined in
`prisma/schema.prisma` (students, teachers, attendance, grades, fees,
timetable, announcements, users).

```bash
npm run prisma:migrate
```

## 4. Seed demo data

Populates grade levels, sections, subjects, sample teachers, students,
and announcements (matching the frontend mock data).

```bash
npm run seed
```

This creates:
- Admin login: `admin@scube.test` / `admin123`
- Teacher login: `rana.aoun@scube.test` / `teacher123`

## 5. Run the server

```bash
npm run dev
```

The API runs on **http://localhost:4000**.

Test it:
```bash
curl http://localhost:4000/api/health
```

## 6. Authentication

All routes except `/api/auth/login` and `/api/auth/register` require a
JWT in the `Authorization: Bearer <token>` header.

```bash
# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@scube.test\",\"password\":\"admin123\"}"

# Use the returned token
curl http://localhost:4000/api/students \
  -H "Authorization: Bearer <TOKEN>"
```

## 7. Inspect the database visually

```bash
npm run prisma:studio
```

Opens a browser-based database viewer at http://localhost:5555.

## Project structure

```
backend/
├── prisma/
│   ├── schema.prisma     ← database schema (all tables)
│   └── seed.js           ← demo data
├── src/
│   ├── config/db.js      ← Prisma client
│   ├── middleware/auth.js← JWT auth + role checks
│   ├── controllers/      ← business logic per module
│   ├── routes/           ← API endpoints per module
│   └── server.js         ← app entry point
├── .env.example
└── package.json
```

## Modules implemented so far

- ✅ Auth (register, login, /me)
- ✅ Students (CRUD)
- ⬜ Teachers
- ⬜ Attendance
- ⬜ Grades
- ⬜ Fees
- ⬜ Timetable
- ⬜ Announcements

Each module follows the same pattern: a Prisma model in `schema.prisma`,
a controller in `src/controllers/`, and routes in `src/routes/`,
registered in `src/server.js`.
