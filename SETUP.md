# Pulse - Setup Guide (Verified Working Steps)

This guide reflects the exact steps that work on Windows without Docker.

## Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Create `.env` (copy from `.env.example`) and fill in at least:
```
GROQ_API_KEY=your-groq-key
```
Leave `DATABASE_URL` blank to use SQLite locally.

```bash
mkdir logs
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Backend runs at: http://localhost:8000
API docs: http://localhost:8000/api/docs/

## Mobile Setup

Open a **new terminal** (keep backend running):

```bash
cd mobile
npm install --legacy-peer-deps
```

Create `.env.local`:
```
EXPO_PUBLIC_API_URL=http://localhost:8000/api
EXPO_PUBLIC_WS_URL=ws://localhost:8000
```

```bash
npm start
```

Press `w` for web browser testing.

## Screens Included

- Login (email/password)
- Chat list (with pull-to-refresh)
- Chat detail (messages, AI toggle switch, compose bar)
- Profile (view info, logout)
- Side menu (hamburger, slides from left)

## Login Credentials

Use the superuser you created with `createsuperuser`.

## Known Limitations (to build next)

- Google OAuth: wired in backend, needs Google Cloud credentials (see GOOGLE_OAUTH_SETUP.md)
- Firebase push notifications: needs Firebase service account JSON
- WebSocket real-time updates: consumer code exists in `apps/chat/consumers.py`, mobile hook exists in `app/hooks/useWebSocket.js` — not yet wired into chat detail screen
- Message reactions/edit/delete: backend endpoints exist, mobile UI buttons not yet added
- Group chat creation UI: not yet built (can be created via API/Swagger for now)

## Troubleshooting

**"no such table" errors**: run `python manage.py makemigrations users chat ai_assistant notifications` then `python manage.py migrate`

**Port 8000 already in use**: close other terminal running the server first

**Mobile can't reach backend on physical device**: use your computer's local IP instead of `localhost` in `.env.local` (e.g. `http://192.168.1.x:8000/api`), since a phone can't resolve "localhost" to your PC
