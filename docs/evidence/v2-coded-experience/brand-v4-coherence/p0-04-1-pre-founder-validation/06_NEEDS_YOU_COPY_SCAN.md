# CUSTOMER_VISIBLE_NEEDS_YOU_OCCURRENCES

Date: 2026-08-26 · HOLD · P0-04.1

Founder rejected Activity destination title "Needs you". ChatGPT synced Figma 618:2384 title → **Activity**.
Do **NOT** silently rename Graphs Overview filter "Needs you" without founder decision.

## Occurrences

| node / source | screen | purpose | runtime | recommendation |
|---|---|---|---|---|
| 618:2384 / 618:2389 | Activity destination | Destination title | Runtime title **Activity** (ActivityDestination.tsx) | **CLOSED** — keep Activity; do not restore Needs you |
| 618:54 header control | Home header Activity | 42×42 control icon | `icon-activity-618.svg` people+pulse; Figma synced FOUNDER_REVIEW_REQUIRED | Icon FOUNDER_REVIEW_REQUIRED (not frozen); title path closed |
| 618:685 / 618:686 | Graphs Overview filter chip | Filter for Graphs needing human action | GraphsHome.tsx `["needs_you", "Needs you"]` | **COPY REVIEW — DO NOT SILENTLY CHANGE**. Preserve until founder decides |
| attentionAuthority.ts | Attention copy fragments | Internal headline assembly `"needs you."` | May surface in attention strings | Audit customer surfaces; prefer Activity framing where destination-facing |
| notificationDelivery.ts | Lock-screen / plan copy | `"Something needs you."` / plan needs you | Push/notification body paths | **FOUNDER COPY REVIEW** — not Activity title; keep until founder rejects notification wording |
| brand.ts / comments / tests | Dev comments + tests | Historical naming | Non-customer | No change required |
| icon-needs-you*.svg | Legacy asset filenames | Superseded by icon-activity-618.svg | Not primary header asset | Keep quarantined/legacy; do not wire as Activity title |

## Fresh Figma text scan (page 618:2)
4 TEXT hits for `/needs you/i`:
1. `618:264` — Home section **annotation** (not UI chrome)
2. `618:267` — Home destinations **annotation**
3. **`618:686` — Graphs Overview filter pill "Needs you"** ← customer-visible
4. `618:3292` — Wiring map **annotation**

No customer-facing Activity destination title "Needs you" remains in dated Figma.

## Summary
- Activity destination customer title: **Activity** only.
- Graphs filter "Needs you": **preserved** pending founder.
- Notification/attention phrase remnants: flagged for founder copy review, not auto-renamed.
