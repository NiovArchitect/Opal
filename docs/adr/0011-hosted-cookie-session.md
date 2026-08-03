# ADR-0011: Hosted cookie session + socket tickets

**Status:** Accepted  
**Date:** 2026-08-03  
**Amends:** ADR-0010

## Decision

For hosted / production-candidate web:

1. Prefer HttpOnly cookie transport for the signed DeviceSession token.
2. Use SameSite=None; Secure when API origin differs from the web origin.
3. Issue short-lived socket tickets for Phoenix Channel connect.
4. Require CSRF header for state-changing cookie-authenticated HTTP requests.
5. Keep Bearer support for local automated tests and non-browser clients.

## Rationale

SF15 localStorage bearer is a residual risk. Cookies reduce XSS token theft; tickets avoid putting long-lived credentials into WebSocket query strings.
