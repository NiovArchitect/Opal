# Postgres free-tier expiration notice (founder)

**Verified:** 2026-08-03 via Render API  

| Field | Value |
|-------|--------|
| Instance | `opal-postgres` |
| ID | `dpg-d9nu39e1egvs738q1jlg-a` |
| Status | available |
| **Expires** | **2026-09-02T00:32:37Z** |
| Pacific time | **2026-09-01 evening** (2026-09-01 5:32 PM PDT) |

## Expected platform behavior

On free Render Postgres expiry, the instance typically becomes **inaccessible** and may be **deleted**. Application API will fail database connections until a paid instance or restore is configured.

## Actions (do not buy from agent)

1. Upgrade the Postgres plan in Render, **or**  
2. Export/backup before expiry (do not commit dumps to git)  
3. Preserve synthetic evidence needed for future slices  

## What can be recreated

Synthetic fixture accounts, relationships, and messages can be recreated from product activation flows. Authoritative **evidence documents** in git should be preserved; live DB rows should not be treated as the only record.
EOF