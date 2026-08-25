# ADR-004: Single Persistent EAS Keystore

**Status:** Accepted

## Context

Native Google Sign-In verifies an app's identity using the SHA-1 fingerprint of whatever key signed the APK. A previous project (DigiStore) implemented Google OAuth that worked in testing but failed in the final shipped APK — the most likely cause, identified in retrospect, is that different builds ended up signed with different keys (e.g. a debug keystore during development vs. a different key at final build/submission time), so the SHA-1 registered in Google Cloud Console no longer matched the shipped app.

## Decision

A single Android keystore is generated once via `eas credentials` and reused for every build of Pulse — development, preview, and production — for the lifetime of the project. EAS stores this keystore securely on Expo's servers rather than as a local file, removing the risk of it being lost or accidentally regenerated. Its SHA-1 fingerprint is registered once in Google Cloud Console as an Android-type OAuth client and is never expected to change.

## Consequences

- Google Sign-In verified correctly on the very first Development Build test and requires no reconfiguration for subsequent builds, including the eventual production release.
- The team must never run a keystore-regenerating command (e.g. selecting "Set up a new keystore" again) for this project — doing so would silently break Google Sign-In in exactly the way it broke on the previous project, until the new SHA-1 is registered.
- Because EAS manages the keystore remotely, losing the local development machine does not risk losing the signing key.
