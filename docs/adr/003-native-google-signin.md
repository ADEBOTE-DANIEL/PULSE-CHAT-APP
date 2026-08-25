# ADR-003: Native Google Sign-In Instead of Browser-Redirect OAuth

**Status:** Accepted (supersedes an earlier approach)

## Context

The first implementation used `expo-auth-session`'s generic Google provider, which performs OAuth via a browser redirect. This worked correctly on web (a real `https://` redirect URI). On a native Android build, however, Expo's `AuthSession` generates a redirect URI using the device's development address (`exp://<ip>:8081` in Expo Go, or a custom scheme in a standalone build). Google's OAuth 2.0 security policy explicitly rejects non-HTTPS custom-scheme redirect URIs for "Web application" type OAuth clients ("Custom URI scheme is not enabled for your Android client" / `Error 400: invalid_request`).

This is a known, deliberate Google security restriction, not a configuration bug — no redirect-URI change on our end could satisfy it while using a Web-type OAuth client.

## Decision

Switched to `@react-native-google-signin/google-signin`, the official native Google Sign-In SDK. This performs authentication via the on-device Google Play Services account picker and verifies the app's identity directly using its signing certificate (SHA-1 fingerprint) registered against an **Android**-type OAuth client — no browser redirect involved at all, so the policy restriction above does not apply.

The existing Web-type OAuth client is retained and reused as the `webClientId` passed to `GoogleSignin.configure()`, which is what allows the native SDK to still return an ID token verifiable by the Django backend (`GoogleOAuthView` checks the token's `audience` against `GOOGLE_OAUTH_CLIENT_ID`, unchanged).

## Consequences

- Requires a real signed build (EAS Development Build or production APK) to test — Google Sign-In cannot be tested inside Expo Go, since native modules aren't available there.
- Introduces a hard dependency on the app's SHA-1 fingerprint staying consistent across builds — see [ADR-004](004-persistent-eas-keystore.md) for how this is managed.
- Web sign-in is unaffected and continues to use the browser-based flow, since the HTTPS-redirect restriction doesn't apply there.
