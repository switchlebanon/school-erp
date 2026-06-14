# SchoolHub ERP — Cloud Deployment Guide

This guide deploys SchoolHub so it's accessible from anywhere on the
internet, using free tiers:

- **Database** → Neon (PostgreSQL)
- **Backend** → Render (Node/Express API)
- **Frontend** → Vercel (React/Vite static site)

---

## Step 1 — Database (Neon)

1. Go to https://neon.tech and sign up.
2. Create a new project (e.g. `schoolhub`).
3. Copy the **connection string** shown — looks like:
   ```
   postgresql://username:password@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require
   ```
4. Keep this safe — you'll paste it into Render in Step 2.

---

## Step 2 — Backend (Render)

1. Push your `backend` folder to a **GitHub repository** (Render deploys from GitHub).
   - If you don't already use Git, see "Pushing to GitHub" below.
2. Go to https://render.com and sign up (GitHub login is easiest).
3. Click **New +** → **Web Service** → connect your GitHub repo.
4. Configure:
   - **Root Directory**: `backend` (if backend is a subfolder of the repo)
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Add Environment Variables (Render dashboard → Environment tab):
   ```
   DATABASE_URL = <your Neon connection string>
   JWT_SECRET   = <a long random string>
   JWT_EXPIRES_IN = 7d
   NODE_ENV     = production
   CORS_ORIGIN  = https://your-frontend-url.vercel.app
   ```
   (You'll fill in `CORS_ORIGIN` after Step 3, once you know the Vercel URL.
   You can redeploy after adding it.)
6. Click **Create Web Service**. Render will install dependencies, run
   `prisma generate && prisma migrate deploy` (creates all tables on Neon),
   and start the server.
7. Once deployed, Render gives you a URL like:
   ```
   https://schoolhub-backend.onrender.com
   ```
8. Seed the database once (creates the admin account + demo data).
   In the Render dashboard, open the **Shell** tab for your service and run:
   ```
   npm run seed
   ```

**Note on free tier:** Render's free web services "sleep" after 15 minutes
of inactivity and take ~30-60 seconds to wake up on the next request. For
a school ERP used during the day, this is usually fine, but the first
request after idle time will feel slow. Paid tiers ($7/mo) remove this.

---

## Step 3 — Frontend (Vercel)

1. Push your `frontend` folder to GitHub (same repo or separate).
2. Go to https://vercel.com and sign up (GitHub login).
3. Click **Add New** → **Project** → import your repo.
4. Configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite (auto-detected)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default)
5. Add Environment Variable:
   ```
   VITE_API_URL = https://schoolhub-backend.onrender.com/api
   ```
   (Use the Render URL from Step 2, with `/api` appended.)
6. Click **Deploy**. Vercel gives you a URL like:
   ```
   https://schoolhub.vercel.app
   ```

---

## Step 4 — Connect them together

1. Go back to **Render** → your backend service → Environment.
2. Update `CORS_ORIGIN` to your Vercel URL:
   ```
   CORS_ORIGIN = https://schoolhub.vercel.app
   ```
3. Save — Render will redeploy automatically.

---

## Step 5 — Test it

1. Open your Vercel URL on your phone, laptop, anywhere.
2. Log in with `admin@schoolhub.test` / `admin123`.
3. Everything should work exactly like local — Students, Fees, Grades, etc.

**Important:** change the default admin password after your first login
(via Manage Classes / a future "My Account" page), since this URL is now
public on the internet.

---

## Pushing to GitHub (if you haven't used Git before)

1. Install Git: https://git-scm.com/download/win
2. Create a free GitHub account: https://github.com
3. Create a new repository (e.g. `school-erp`).
4. In your project folder (the one containing both `backend` and `frontend`):
   ```cmd
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/school-erp.git
   git push -u origin main
   ```
5. Make sure `.gitignore` excludes `node_modules/` and `.env` (already set
   up in this project) so you don't upload secrets or huge folders.

---

## Ongoing updates

Whenever you make changes locally:
```cmd
git add .
git commit -m "Description of change"
git push
```
Both Render and Vercel auto-redeploy on every push to `main`.

---

## Costs at a glance (free tier limits)

| Service | Free tier limit |
|---|---|
| Neon (DB) | 0.5 GB storage, plenty for a school |
| Render (backend) | Free, sleeps after 15 min idle |
| Vercel (frontend) | Generous free tier, effectively unlimited for this use |

For a small-to-medium school, the free tiers are sufficient to start.
If the Render sleep delay becomes annoying, upgrading just the backend
to the $7/mo plan removes it.
