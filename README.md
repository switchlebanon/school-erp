# SchoolHub ERP

A full-stack School ERP system built with React (frontend) and
Node.js/Express + PostgreSQL/Prisma (backend).

## Structure

```
school-erp/
├── backend/    ← Express API + Prisma + PostgreSQL
├── frontend/   ← React + Vite dashboard
└── DEPLOYMENT.md ← Cloud deployment guide (Neon + Render + Vercel)
```

## Local Development

See `backend/README.md` and `frontend/README.md` for setup instructions.

## Deployment

See `DEPLOYMENT.md` for deploying to Neon (database), Render (backend),
and Vercel (frontend) so the app is accessible from anywhere.

## Features

- Student management (CRUD, bulk import from Excel, guardian contacts)
- Class & section management
- Fees & installment payments, printable invoices
- WhatsApp payment reminders (individual & bulk)
- Grades / gradebook by class, subject, and term
- Full data export to Excel for backups
- Role-based authentication (Admin / Teacher / Parent / Student)
