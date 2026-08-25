# ADR-005: Expo Development Build Instead of Expo Go for Ongoing Testing

**Status:** Accepted

## Context

Expo Go (the pre-built app available on the Play Store) is convenient for early development but has two limitations that became blocking for Pulse: (1) it cannot load custom native modules such as `@react-native-google-signin/google-signin` or Firebase push notification internals, and (2) its own SDK version is controlled by whatever Expo ships to the Play Store, which can silently drift ahead of the project's pinned SDK version and break compatibility with no warning (this happened once during development — Expo Go had moved to SDK 54 while the project was still on SDK 51).

## Decision

Once native modules were required (Google Sign-In, Firebase notifications), the project switched to an EAS **Development Build** — a real, signed build of the app installed once on the test device, which then behaves like Expo Go for JavaScript-only iteration (Metro bundler, Fast Refresh) but supports the project's actual native dependencies and stays version-locked to the project's own Expo SDK rather than the Play Store's.

## Consequences

- A rebuild (`eas build --profile development`) is only required when native dependencies change (a new native package, a new native config plugin, `google-services.json` changes) — not for ordinary JavaScript/UI changes, which still hot-reload instantly via the same Metro server used with Expo Go.
- Testing on a physical device now accurately reflects how the app will behave once built for production, since it shares the same native layer and signing key (see [ADR-004](004-persistent-eas-keystore.md)).
- Slightly higher setup cost per native dependency added (a ~5–10 minute EAS build), accepted as a worthwhile tradeoff for avoiding the SDK-drift and native-module limitations of Expo Go.
