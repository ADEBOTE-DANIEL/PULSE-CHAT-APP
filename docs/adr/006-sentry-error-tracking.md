# ADR-006: Sentry for Error Tracking

**Status:** Accepted

## Context

Server-side logging (structured JSON logs to file + console) captures errors that occur, but only if someone is actively watching the log file at the time. Several real bugs during development (a UUID JSON-serialization crash in the WebSocket consumer, a Groq model deprecation, a malformed `.env` value) were only caught because a developer happened to be watching the terminal during manual testing — in a real production setting with actual end users, these would fail silently with no visibility.

## Decision

Sentry (sentry.io, free tier) is integrated into the Django backend via `sentry-sdk`, initialized conditionally when a `SENTRY_DSN` environment variable is present (so local development without a configured DSN is unaffected). Both the `DjangoIntegration` and `CeleryIntegration` are enabled, so errors are captured from both synchronous API request handling and asynchronous background tasks (AI response generation, push notification sending) — the two places most of this project's real bugs actually originated.

## Consequences

- Production errors are now visible with full stack traces and request context without needing direct server log access, and without waiting for a user to report a problem.
- The free tier has volume limits; if the app grows significantly, usage should be monitored and a paid tier considered.
- `send_default_pii=True` was enabled to capture request/user context useful for debugging (e.g. which user hit an error) — this should be reviewed against privacy requirements before wider production use, since it means Sentry stores user-identifying data alongside error reports.
