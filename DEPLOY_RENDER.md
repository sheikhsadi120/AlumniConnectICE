# Deploy AlumniConnect On Render

This guide prepares both services for Render:
- Backend API (Flask + Gunicorn)
- Frontend (React/Vite static site)

## 1. What is already prepared

This repository now includes:
- render blueprint: render.yaml
- backend WSGI entrypoint: backend/wsgi.py
- production dependencies in backend/requirements.txt
- frontend env support in react-app/src/services/api.js

## 2. Important database note

Render does not provide managed MySQL. Use an external MySQL provider (for example Railway, PlanetScale, Aiven, or your own MySQL host), then set these env vars on the backend service:
- MYSQL_HOST
- MYSQL_PORT
- MYSQL_USER
- MYSQL_PASSWORD
- MYSQL_DB

## 3. Deploy with Blueprint (recommended)

1. Push this repository to GitHub.
2. In Render Dashboard: New + -> Blueprint.
3. Select your repo and deploy.
4. Render will create two services from render.yaml:
- alumniconnect-api
- alumniconnect-web

## 4. Set backend secrets/env after first create

Open the Render service alumniconnect-api -> Environment, then set:
- ADMIN_USERNAME
- ADMIN_PASSWORD
- MYSQL_HOST
- MYSQL_PORT
- MYSQL_USER
- MYSQL_PASSWORD
- MYSQL_DB
- SMTP_USERNAME
- SMTP_PASSWORD
- SMTP_FROM_EMAIL

Optional but recommended:
- PUBLIC_BASE_URL=https://<your-api-service>.onrender.com
- CORS_ORIGINS=https://<your-frontend-service>.onrender.com

## 5. Database initialization

With AUTO_INIT_DB=true, app startup attempts schema bootstrap.
If your DB user cannot create DB/schema automatically, import manually once:

```powershell
cd backend
mysql -h <MYSQL_HOST> -P <MYSQL_PORT> -u <MYSQL_USER> -p <MYSQL_DB> < schema.sql
python migrate.py
```

## 6. Verify deployment

1. Backend health:
- https://<your-api-service>.onrender.com/api/health

Expected response:

```json
{"success": true, "message": "ok"}
```

2. Frontend URL:
- https://<your-frontend-service>.onrender.com

3. Test complete flow:
- register/login
- admin login
- upload/view images
- events/trainings pages

## 7. If CORS error appears

Set backend CORS_ORIGINS to your exact frontend URL.
For multiple domains, comma-separate:

```text
https://your-frontend.onrender.com,https://your-custom-domain.com
```
