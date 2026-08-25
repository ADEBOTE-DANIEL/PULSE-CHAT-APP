# ADR-001: Local Development Fallbacks (SQLite + In-Memory Channel Layer)

**Status:** Accepted

## Context

Production requires PostgreSQL (durable, concurrent-safe) and Redis (shared channel layer for WebSockets across processes, Celery broker). Requiring every local dev session to install and run PostgreSQL and Redis servers adds significant setup friction, especially on Windows without Docker (Docker Desktop was unavailable on the primary dev machine — no Hyper-V support).

## Decision

The backend detects environment configuration at startup and falls back automatically:

- If `DATABASE_URL` is unset → use SQLite (`db.sqlite3`).
- If `REDIS_HOST` is unset → use Django Channels' `InMemoryChannelLayer` instead of `RedisChannelLayer`.
- Celery tasks run synchronously in-process (`CELERY_TASK_ALWAYS_EAGER = DEBUG`) rather than requiring a running Celery worker + broker locally.

Production (Render) sets `DATABASE_URL` and, if scaling requires multi-process WebSocket support, `REDIS_HOST` — switching the same codebase to production-grade infrastructure with zero code changes.

## Consequences

- Local dev requires no external services beyond Python — lowers onboarding friction significantly.
- The in-memory channel layer only works correctly with a single backend process. This is fine for local dev and for a single-instance Render deployment, but would need Redis if the app ever scales to multiple backend instances.
- Celery running synchronously locally means task failures surface immediately in the same terminal, which sped up debugging during development (e.g. catching the Groq model deprecation errors instantly).
