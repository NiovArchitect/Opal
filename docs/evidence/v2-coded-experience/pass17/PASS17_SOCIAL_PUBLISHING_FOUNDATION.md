# PASS 17 — Production-Candidate Social Publishing Foundation

**Date:** 2026-08-14  
**Branch:** `build/v2-coded-experience-closure`  
**Prior:** Pass 16 `6a1e079` · Attribution `f333390` · Providers `76de7c1`  
**HOLD. DO NOT MERGE.**

---

## EXECUTIVE STATE

Pass 16 made the social **loop** feel real.  
Pass 17 makes social **authorship** real as durable infrastructure:

```text
CREATE Moment + media (LOCAL_DEV)
→ choose visibility (not public-by-default)
→ server-enforced fetch
→ hide / report / block (distinct)
→ delete own (public gone; downstream Reality not destroyed)
→ multi-select group path for Do this with your people
```

**No payouts. No feed brain. No booking. No new coordination engine.**

---

## MEDIA ARCHITECTURE INVENTORY

| Capability | Status | Owner |
|------------|--------|-------|
| Object storage | **LOCAL_DEV** | `MediaLocalStore` under `priv/local_media` |
| Production CDN | **NOT CLAIMED** | — |
| Upload | base64 → local file + DB media row | `POST /social-moments/media` |
| Processing | minimal image; size/mime gates | MediaLocalStore |
| EXIF/GPS | stripped policy (no EXIF product fields) | `exif_stripped=true` |
| Video | **PARTIAL / FUTURE** | honest status |
| Moderation | state machine pending/active/restricted/removed | SocialMomentRecord |
| Report | durable `social_moment_reports` | not auto-delete |
| Hide | viewer-local `social_moment_hides` | not report/block |
| Block | existing `TrustSafety` / SafetyBlock | applies to Moments |

---

## VISIBILITY MODEL

Supported (relationship-centered; **no invent public**):

- `private`
- `specific_people`
- `group` (+ `group_conversation_id` membership check)
- `friends` (**default**)

Enforcement is **server-side** in `get_for_viewer` / `list_for_viewer` / `read_media`.  
Unauthorized → `not_found` (no leakage). Media delivered only via auth path — not permanent public URLs.

---

## GOLDEN EPISODES (TESTS)

| ID | Result |
|----|--------|
| SOCIAL-08 publish | PASS |
| SOCIAL-09 unauthorized denied | PASS |
| SOCIAL-10 group membership | PASS |
| SOCIAL-11 delete preserves downstream Reality flag | PASS |
| SOCIAL-12 report ≠ hide ≠ block | PASS |
| Block applies | PASS |
| Protected media | PASS |
| Economics ≠ discovery | PASS |

**14 tests, 0 failures** (`social_moment_publishing_test.exs`)

---

## LINEAGE AFTER DELETE

```text
public_content_removed: true
downstream_reality_destroyed: false
source_moment_deleted: true
lineage_tombstone: true
```

Attribution remains structural-only; **no live payout**.

---

## GROUP MULTI-SELECT (PRODUCT)

Pass 16 people sheet upgraded:

- multi-select toggle
- **Continue with N people**
- one Reality seed for the set (primary chat opens place sheet)

---

## API SURFACE

```
GET  /api/v1/product/social-moments/media-status
POST /api/v1/product/social-moments/media
GET  /api/v1/product/social-moments/media/:media_id
GET  /api/v1/product/social-moments
POST /api/v1/product/social-moments
GET  /api/v1/product/social-moments/:id
PATCH /api/v1/product/social-moments/:id
DELETE /api/v1/product/social-moments/:id
POST /api/v1/product/social-moments/:id/hide
POST /api/v1/product/social-moments/:id/report
```

---

## ECONOMIC UI

Still **zero**: no earn, no balance, no commission on Moments.  
`publish_creates_attribution?` = false · `discovery_uses_commission?` = false.

---

## KNOWN GAPS

1. LOCAL_DEV storage ≠ production CDN  
2. No full video pipeline  
3. No automated ML moderation (manual states only)  
4. Friends graph is permissive (true) pending finer relationship graph API  
5. Full create-Moment SPA compose sheet (photo picker) not a polished production studio  
6. Live Google / booking / payouts still separate lanes  

---

## V2 MERGE VERDICT

**HOLD — DO NOT MERGE.**

A social network is not real because one fixture card exists.  
Users can create, scope, share, hide, report, block, and delete — with private media not publicly bypassable, and Experience/Attribution graphs remaining underneath without monetization theater.
