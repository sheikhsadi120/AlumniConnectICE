# AlumniConnect Quick Project Map

This file is only for navigation.
No app logic/design/runtime behavior is changed.

## 1) Root
- `.venv/` -> Python virtual environment
- `.vscode/` -> VS Code workspace config (tasks + explorer settings)
- `backend/` -> Flask + MySQL backend
- `react-app/` -> React frontend (Vite)

## 2) Backend (Flask)
- `backend/app.py` -> Main API routes and server entry
- `backend/config.py` -> DB and app config
- `backend/migrate.py` -> DB migration helper script
- `backend/schema.sql` -> Full DB schema
- `backend/requirements.txt` -> Python dependencies
- `backend/uploads/` -> Uploaded files/images

## 3) Frontend (React)
- `react-app/package.json` -> frontend scripts/deps
- `react-app/vite.config.js` -> Vite config
- `react-app/src/main.jsx` -> app bootstrap
- `react-app/src/App.jsx` -> top-level app/router wrapper

### Pages (where to edit major screens)
- `react-app/src/pages/Home.jsx`
- `react-app/src/pages/AdminDashboard.jsx`
- `react-app/src/pages/StudentDashboard.jsx`
- `react-app/src/pages/AlumniDashboard.jsx`
- `react-app/src/pages/AdminLogin.jsx`
- `react-app/src/pages/StudentLogin.jsx`
- `react-app/src/pages/StudentRegister.jsx`
- `react-app/src/pages/AlumniLogin.jsx`
- `react-app/src/pages/AlumniRegister.jsx`

### Shared
- `react-app/src/components/Navbar.jsx`
- `react-app/src/services/api.js` -> all frontend API calls

### Styles
- `react-app/src/styles/style.css` -> home/common style
- `react-app/src/styles/login.css` -> login/register style
- `react-app/src/styles/admin.css` -> admin dashboard style
- `react-app/src/styles/alumni-dashboard.css` -> alumni/student dashboard style

## 4) Fast Debug Path
- API issue -> `backend/app.py`
- DB issue -> `backend/schema.sql` + `backend/migrate.py`
- Login/Register UI issue -> `react-app/src/pages/*Login*.jsx`, `*Register*.jsx`, `react-app/src/styles/login.css`
- Dashboard UI issue -> relevant `*Dashboard.jsx` + matching style file
- API integration issue -> `react-app/src/services/api.js`

## 5) Notes
- Existing file locations are kept unchanged to avoid breaking imports/routes.
- Explorer nesting is configured in `.vscode/settings.json` for easier browsing.
