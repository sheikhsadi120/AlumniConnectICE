# AlumniConnect Public Deployment Guide

This guide makes your app usable by all users over the internet (register + login + dashboard).

## 1. Final architecture

- Frontend: Vercel (React/Vite)
- Backend: Render (Flask + Gunicorn)
- Database: Railway MySQL

## 2. Prepare GitHub repo

1. Push your latest code to GitHub.
2. Confirm these files exist:
- `backend/wsgi.py`
- `backend/Procfile`
- `backend/.env.example`
- `react-app/.env.production.example`

## 3. Create cloud MySQL (Railway)

1. Create a new Railway project.
2. Add a MySQL service.
3. Copy these values from Railway variables:
- `MYSQLHOST`
- `MYSQLPORT`
- `MYSQLUSER`
- `MYSQLPASSWORD`
- `MYSQLDATABASE`

## 4. Import schema to cloud MySQL

Run from your local machine (PowerShell):

```powershell
cd backend
mysql -h <MYSQLHOST> -P <MYSQLPORT> -u <MYSQLUSER> -p <MYSQLDATABASE> < schema.sql
```

Then run migration once:

```powershell
cd backend
python migrate.py
```

## 5. Deploy backend to Render

1. Create "Web Service" in Render and connect GitHub repo.
2. Configure:
- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `gunicorn wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120`
3. Add environment variables:
- `DEBUG=false`
- `SECRET_KEY=<strong-random-secret>`
- `PUBLIC_BASE_URL=https://<your-render-service>.onrender.com`
- `CORS_ORIGINS=https://<your-vercel-domain>.vercel.app`
- `ADMIN_USERNAME=<your-admin-username>`
- `ADMIN_PASSWORD=<your-admin-password>`
- `MYSQL_HOST=<MYSQLHOST>`
- `MYSQL_PORT=<MYSQLPORT>`
- `MYSQL_USER=<MYSQLUSER>`
- `MYSQL_PASSWORD=<MYSQLPASSWORD>`
- `MYSQL_DB=<MYSQLDATABASE>`
4. Deploy and open:
- `https://<your-render-service>.onrender.com/api/health`

Expected response:

```json
{"success": true, "message": "ok"}
```

## 6. Deploy frontend to Vercel

1. Create Vercel project from same GitHub repo.
2. Configure:
- Root Directory: `react-app`
- Build Command: `npm run build`
- Output Directory: `dist`
3. Add environment variables:
- `VITE_API_BASE_URL=https://<your-render-service>.onrender.com/api`
- `VITE_UPLOAD_BASE_URL=https://<your-render-service>.onrender.com/uploads`
4. Deploy.

## 7. Set production CORS correctly

After Vercel deployment, update Render env:

- `CORS_ORIGINS=https://<your-vercel-domain>.vercel.app`

If you use custom domain, append both domains comma-separated:

- `CORS_ORIGINS=https://app.example.com,https://<your-vercel-domain>.vercel.app`

## 8. End-to-end test checklist

1. Open frontend URL.
2. Register a student/alumni account.
3. Approve account from admin panel.
4. Login from student/alumni page.
5. Open directory and verify profile images load.
6. Create event/training and try registration.
7. Verify backend logs on Render for errors.

## 9. Security checklist before public launch

- Change default admin credentials.
- Use a strong `SECRET_KEY`.
- Keep `DEBUG=false`.
- Set exact `CORS_ORIGINS` (never `*`).
- Keep DB credentials only in platform env vars.
- Take periodic DB backups on Railway.

## 10. Optional custom domain

1. Add custom domain in Vercel.
2. Add custom API domain in Render (optional).
3. Update env values:
- `PUBLIC_BASE_URL`
- `VITE_API_BASE_URL`
- `VITE_UPLOAD_BASE_URL`
- `CORS_ORIGINS`
