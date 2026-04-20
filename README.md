# AlumniConnect

Local-first Alumni management platform with:
- Flask backend (`backend/`)
- React + Vite frontend (`react-app/`)
- MySQL local data directory (`backend/mysql-local/data`)

## Prerequisites

- Windows + PowerShell
- Python virtual environment at `.venv`
- Node.js + npm
- MySQL Server 8 binaries installed at:
	`C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe`

## Run From VS Code (Recommended)

Use the task:

`Start Full App (MySQL + Backend + Frontend)`

This starts:
- Local MySQL on `127.0.0.1:3307` (project datadir)
- Flask backend on `http://127.0.0.1:5000`
- React frontend on `http://localhost:5173`

## Environment Files

Backend local environment is loaded from:
- `backend/.env`

Reference template:
- `backend/.env.example`

Frontend production template:
- `react-app/.env.production.example`

## Backend DB Quick Check

Run:

`d:/alumniconnect/AC/.venv/Scripts/python.exe d:/alumniconnect/AC/backend/test_db.py`

Expected:
- Connection successful
- Tables listed

## API Health Check

`http://127.0.0.1:5000/api/health`

Expected JSON response with success status.

## Notes

- The app is now configured for clean local development by default.
- API client resolution prefers local backend endpoints on localhost.
