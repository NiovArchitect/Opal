# OPAL GRAPH — Home social core server authority closure

**HOLD. DO NOT MERGE.**

## Product SHA

`7a8a227027680d72eb65c8079b168ac5751d9d53`

Pre-change: `e00e20f` / docs tip `3b97ffc`  
HEAD may include a follow-up docs stamp after this file.

## Exact founder reset URL

```
http://127.0.0.1:5173/?opal_reset_first_run=1
```

Vite separately needs `VITE_OPAL_API_URL=http://127.0.0.1:4000` (env is not a URL).

## Acceptance question

> Is Home no longer merely a convincing local social simulation, but backed by authoritative product state that survives reload/session/device?

**YES for durable SocialMoment engagement (Like/Comment/Repost/Save), Stories, Home feed composition, and bad-actor denial** — proven multi-session via API (`HOLD_SERVER_AUTHORITY_PASS`, 14/14).

Remaining honesty: media storage remains LOCAL_DEV (not production CDN); non-UUID founder fixture cards may still use optimistic cache; Kafka not forced into UI (outbox seam extended for `social_moment.*`).

## Exact test counts

Vitest: **35 passed / 6 files**  
(`socialAuthority` 4, `homeHydration` 9, `graphSocialHome` 10, `graphCreateFlow` 3, `chatsHome` 3, `homeSocialActions` 6)

ExUnit: **9 passed**  
(`social_moment_engagement_test` 7 + `social_moment_engagement_api_test` 2)

Multi-session API proof: **14 passed / 0 failed**

Evidence: `BROWSER_PROOF_SOCIAL_SERVER_AUTHORITY.json`, `SOCIAL_DOMAIN_RECONCILIATION.md`
