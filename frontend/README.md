# S³ ERP — Frontend

React + Vite frontend for the S³ ERP system.

## 1. Setup

```cmd
cd frontend
npm install
```

(Optional) copy `.env.example` to `.env` if your backend isn't running on
the default `http://localhost:4000`:

```cmd
copy .env.example .env
```

## 2. Run

Make sure the **backend** is running first (`npm run dev` in the `backend`
folder, on port 4000). Then:

```cmd
npm run dev
```

Open **http://localhost:5173**.

## 3. Log in

Use the seeded admin account:
- Email: `admin@scube.test`
- Password: `admin123`

## What's connected to the backend so far

- ✅ **Login / Auth** — real JWT login, session persists across reloads
- ✅ **Students** — list pulled live from `GET /api/students`
- ⬜ Dashboard, Teachers, Attendance, Timetable, Grades, Fees, Announcements
  still use mock data (`src/data/mockData.js`) until their backend modules
  are built.

## Project structure

```
frontend/
├── src/
│   ├── api/client.js        ← fetch wrapper + JWT handling
│   ├── context/AuthContext.jsx ← login state, persisted session
│   ├── components/          ← Sidebar, Topbar, shared UI (Card, Badge…)
│   ├── pages/                ← one file per module/page
│   ├── data/mockData.js      ← placeholder data for unconnected modules
│   ├── theme.js               ← color tokens
│   ├── App.jsx                ← layout + routing + auth gate
│   └── main.jsx                ← entry point
├── .env.example
└── package.json
```

## Connecting the next module

To wire up a new module (e.g. Teachers):
1. Build the backend controller/routes (see `backend/src/controllers` and
   `backend/src/routes` for the Students example)
2. In the matching page file (e.g. `src/pages/Teachers.jsx`), replace the
   `teachers` import from `mockData` with a `useEffect` + `api.get(...)`
   call, following the pattern in `src/pages/Students.jsx`
