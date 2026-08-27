# HOME SEARCH AUTHORITY AUDIT

**Date:** 2026-08-20  
**HOLD. DO NOT MERGE. permissionToStartLive = NO.**

## Question

Where is Search supposed to be entered — and is it on Home?

## Method

Figma file `fy69K8cCug9prf5GLwQ7Hy` inspected via metadata + full-file Search node walk (`use_figma`). Home Header children enumerated. Not assumed from frozen Header status.

## SEARCH-00 destination

| Field | Value |
| --- | --- |
| Node | **373:261** |
| Name | SEARCH-00 — PEOPLE PLACES EXPERIENCES GRAPHS |
| Size | 390 × 844 |
| Modes (pills) | Top · People · Places · Experiences (+ Graphs results section) |
| Field placeholder | Search Opal Graph |
| Dock | Option B dock present on frame |

Reference: `references/FIGMA_373_261_SEARCH.png`

## Navigation law

**155:98** (NAVIGATION LOCK text):

> Search and Activity remain contextual entry points, not extra permanent tabs.

Contract **373:498**:

> Search is one mixed social search across people, places, experiences and Graphs.

## Exact entry points found in approved Figma

| Node | Name | Parent | Opens |
| --- | --- | --- | --- |
| **476:53** | New chat → SEARCH-00 people mode | **CHATS-00** `476:2` | SEARCH-00 people mode |
| **476:51** | Search chats | **CHATS-00** `476:2` | Local Chats filter (not SEARCH-00) |

No other interactive Search entry controls were found on OGX Home.

## Home 287:6 / Header 287:7 inspection

Header **287:7** children (complete):

1. `287:8` brand mark  
2. `287:16` wordmark  
3. `287:19` tagline “your social world, in motion”

**No search icon. No search field. No Search affordance anywhere on Home 287:6.**

This is **not** because Header is frozen.  
The approved Home composition simply does not contain a Search control.

Dock **433:2** tabs remain: Home · Chats · Opal · Graphs · You — no Search tab (consistent with 155:98).

## Runtime probe

- Home Search controls: **0**
- Chats Search inputs: present (contextual)
- New chat control: present on Chats

## Verdict

### Home → SEARCH-00

**FIGMA NAVIGATION GAP**

SEARCH-00 exists as an approved destination, but **current Figma provides no discoverable entry from Home**.

Approved entry is contextual on **Chats** (`476:53`).

### What we did NOT do

- Did not add Search to frozen Header 287:7  
- Did not invent a magnifying-glass tab  
- Did not invent a sixth dock destination  
- Did not copy Instagram  

### Implementation note for a later Chats pass (out of scope)

Wire `476:53` New chat → SEARCH-00 people mode when Chats convergence is authorized. Not this Home pass.
