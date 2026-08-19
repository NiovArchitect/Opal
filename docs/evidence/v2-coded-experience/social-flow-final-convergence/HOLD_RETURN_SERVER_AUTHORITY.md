## Product SHA



# OPAL GRAPH — Home social core server authority closure

**HOLD. DO NOT MERGE.**

## Exact founder reset URL

```
http://127.0.0.1:5173/?opal_reset_first_run=1
```

(Do not truncate. Vite separately needs `VITE_OPAL_API_URL=http://127.0.0.1:4000`.)

## Acceptance question

> Is Home no longer merely a convincing local social simulation, but backed by authoritative product state that survives reload/session/device?

**YES for durable SocialMoment engagement (Like/Comment/Repost/Save), Stories, Home feed composition, and bad-actor denial** — proven multi-session via API (`HOLD_SERVER_AUTHORITY_PASS`, 14/14).

Remaining honesty: media storage remains LOCAL_DEV (not production CDN); fixture seed cards may still use optimistic cache when ids are non-UUID; Kafka adapter not forced into client path (outbox seam extended).

## Exact test counts

Vitest: **35 passed / 6 files**  
(`socialAuthority` 4, `homeHydration` 9, `graphSocialHome` 10, `graphCreateFlow` 3, `chatsHome` 3, `homeSocialActions` 6)

ExUnit: **9 passed**  
(`social_moment_engagement_test` 7 + `social_moment_engagement_api_test` 2)

Browser/API multi-session proof: **14 passed / 0 failed**

Evidence: `BROWSER_PROOF_SOCIAL_SERVER_AUTHORITY.json`, `SOCIAL_DOMAIN_RECONCILIATION.md`
