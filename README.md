# Pulse — Real-Time Chat with AI Assistant

Pulse is a full-stack real-time messaging app with 1-to-1 and group chat, an opt-in AI reply assistant, push notifications, and Google/email authentication. Built as a portfolio project demonstrating production-grade engineering practices: clean architecture, JWT auth with token rotation/blacklisting, automated testing, structured logging, error tracking, and CI/CD.

## Tech Stack

**Backend**
- Django 4.1 + Django REST Framework (REST API)
- Django Channels + Daphne (WebSocket real-time messaging)
- PostgreSQL (production) / SQLite (local dev)
- Redis (production channel layer + Celery broker) / in-memory layer (local dev)
- Celery (async tasks: AI generation, push notifications)
- Groq API (`openai/gpt-oss-20b`) for AI-generated reply suggestions
- Firebase Admin SDK (push notifications)
- Simple JWT with refresh token rotation + blacklisting
- Sentry (error tracking)

**Mobile**
- React Native (Expo SDK 54) + Expo Router
- Zustand (state management)
- Axios (HTTP client with auto token refresh)
- Native Google Sign-In (`@react-native-google-signin/google-signin`)
- Expo Notifications (FCM push)
- Jest + jest-expo (testing)

## Features

- 1-to-1 and group chat with real-time delivery over WebSocket
- Message edit, delete (soft delete), and emoji reactions
- Typing indicators and online presence
- AI reply assistant — toggle per conversation, generates a suggested reply which the user can Accept, Edit, or Dismiss
- Push notifications for new messages and AI suggestions (Firebase Cloud Messaging)
- Authentication: email/password registration + login, and native Google Sign-In (Android + Web)
- Dark themed UI (`#0A0A0A` background, `#3B82F6` blue, `#D4AF37` gold accents)

## Project Structure

```
pulse-chat-app/
├── backend/                 Django REST API + WebSocket server
│   ├── apps/
│   │   ├── users/            Auth, registration, profile, device tokens
│   │   ├── chat/             Chat rooms, messages, reactions, WebSocket consumer
│   │   ├── ai_assistant/     AI config + Groq-powered suggestion generation
│   │   └── notifications/    In-app + push notification records and delivery
│   └── core/                 Settings, URL routing, ASGI/WSGI entrypoints
├── mobile/                  Expo React Native app
│   └── app/
│       ├── (screens)          Login, register, chats, chat detail, profile, new-group
│       ├── components/        Shared UI (TopBar, SideMenu)
│       ├── store/              Zustand stores (auth, chat)
│       ├── services/           API client
│       └── hooks/              useWebSocket
└── docs/
    └── adr/                  Architecture Decision Records
```

## Local Development Setup

### Backend

```
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt --break-system-packages
copy .env.example .env       # then fill in values (see below)
python manage.py migrate
python manage.py runserver
```

Required `.env` values for local dev: `DJANGO_SECRET_KEY`, `GROQ_API_KEY`, `GOOGLE_OAUTH_CLIENT_ID`/`SECRET`, `FIREBASE_CREDENTIALS_JSON`. Leave `DATABASE_URL` and `REDIS_HOST` blank locally — the app automatically falls back to SQLite and an in-memory channel layer (see [ADR-001](docs/adr/001-local-dev-fallbacks.md)).

### Mobile

```
cd mobile
npm install
copy .env.example .env.local  # fill in EXPO_PUBLIC_* values
npx eas-cli build --profile development --platform android   # first-time native build
npm start -- --clear
```

Google Sign-In on Android requires a Development Build, not Expo Go — see [ADR-003](docs/adr/003-native-google-signin.md).

## Testing

**Backend** (28 tests — auth, chat rooms, messaging, AI assistant, notifications):
```
cd backend
python manage.py test
```

**Mobile** (11 tests — auth store, chat store):
```
cd mobile
npm test
```

## Data Model

See [docs/ERD.md](docs/ERD.md) for the full entity-relationship diagram.

## Architecture Decisions

See [docs/adr/](docs/adr/) for the reasoning behind key technical choices (local dev fallbacks, WebSocket auth, native vs. browser-based Google Sign-In, persistent EAS keystore, error tracking).

## Deployment

- Backend: deployed to Render (see `render.yaml` / CI/CD section)
- Mobile: distributed as a signed Android APK via EAS Build
