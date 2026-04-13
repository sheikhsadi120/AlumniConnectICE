# Deploy AlumniConnect on Vercel + Aiven MySQL

## Overview
- Deploy backend as one Vercel project with Root Directory: `backend`
- Deploy frontend as another Vercel project with Root Directory: `react-app`
- Connect backend to Aiven MySQL using environment variables

## 1) Backend Project (Vercel)
Create a new Vercel project from this repository and set:
- Root Directory: `backend`
- Framework Preset: Other

Add environment variables:
- `DEBUG=false`
- `PORT=5000`
- `SECRET_KEY=<strong-random-secret>`
- `PUBLIC_BASE_URL=https://<your-backend-vercel-domain>`
- `CORS_ORIGINS=https://<your-frontend-vercel-domain>`
- `ADMIN_USERNAME=<admin-user>`
- `ADMIN_PASSWORD=<admin-pass>`
- `AUTO_INIT_DB=true`

Aiven MySQL variables (recommended):
- `MYSQL_HOST=<aiven-host>`
- `MYSQL_PORT=<aiven-port>`
- `MYSQL_USER=<aiven-user>`
- `MYSQL_PASSWORD=<aiven-password>`
- `MYSQL_DB=<aiven-database>`
- `MYSQL_SSL_MODE=required`

Mail variables (Brevo):
- `MAIL_PROVIDER=brevo`
- `BREVO_API_KEY=<brevo-api-key>`
- `BREVO_API_URL=https://api.brevo.com/v3/smtp/email`
- `BREVO_TIMEOUT=20`
- `SMTP_FROM_EMAIL=<verified-brevo-sender-email>`
- `SMTP_FROM_NAME=AlumniConnect Admin`

Deploy and copy the backend URL.

## 2) Frontend Project (Vercel)
Create another Vercel project from same repo and set:
- Root Directory: `react-app`
- Framework Preset: Vite

Add environment variables:
- `VITE_API_BASE_URL=https://<your-backend-vercel-domain>/api`
- `VITE_UPLOAD_BASE_URL=https://<your-backend-vercel-domain>/uploads`

Deploy and open the frontend URL.

## 3) Final Checks
- Backend health: `https://<backend-domain>/api/health`
- Frontend loads and login works
- Email test from admin panel

## Notes
- Vercel serverless file system is ephemeral. Uploaded files are not durable storage.
- For production durability, move uploads to object storage (S3/Cloudinary) later.
