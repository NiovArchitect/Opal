# ADR-0004: React Native Expo + TypeScript Client

**Status:** Accepted  
**Date:** 2026-07-31

## Context

Prior developer documentation established RN Expo. Founder lock keeps mobile-first private messenger UX. TypeScript strengthens client correctness without changing backend language requirements.

## Decision

- Primary client: **React Native + Expo + TypeScript**  
- Local: SQLite, secure storage, offline queue  
- No primary React web app in MVP  

## Consequences

- Shared mobile codebase for iOS/Android.  
- Native modules for mic/contacts as needed via Expo ecosystem.  
- Web client deferred.

## Alternatives considered

- Native Swift/Kotlin dual: higher cost.  
- React web primary: rejected for MVP.
