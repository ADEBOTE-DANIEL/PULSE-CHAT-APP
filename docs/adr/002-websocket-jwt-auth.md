# ADR-002: Custom JWT Middleware for WebSocket Authentication

**Status:** Accepted

## Context

Django Channels' default `AuthMiddlewareStack` authenticates WebSocket connections using Django session cookies. Pulse's REST API uses JWT (Simple JWT) exclusively — there are no session cookies to check. Using the default middleware would leave every WebSocket connection unauthenticated (`AnonymousUser`), which is both a functional blocker (the consumer needs to know who the connecting user is to join the right room and broadcast correctly) and a security gap (anyone could open a socket to any room).

## Decision

A custom `JWTAuthMiddleware` (`apps/chat/jwt_auth_middleware.py`) reads an access token from the WebSocket connection's query string (`?token=<access_token>`), validates it using Simple JWT's `AccessToken` class, and attaches the resolved `User` to `scope['user']` before handing off to the consumer. The consumer explicitly rejects the connection (`close(code=4001)`) if `scope['user']` is not authenticated.

The mobile client always fetches a fresh token from secure storage immediately before opening a socket (rather than reading a potentially stale token from in-memory state), since access tokens are short-lived (30 minutes) and the client already has a working REST-side refresh flow.

## Consequences

- WebSocket connections are now properly authenticated and tied to a real user, matching the security posture of the REST API.
- Because access tokens expire, long-lived socket connections do not get automatically re-authenticated mid-connection — a connection made with a valid token stays "logged in" for that socket's lifetime even after the token would otherwise expire. This is an accepted tradeoff given the app's reconnect-on-close behavior (see the client's `useWebSocket` hook), which naturally re-authenticates with a fresh token on every reconnect.
