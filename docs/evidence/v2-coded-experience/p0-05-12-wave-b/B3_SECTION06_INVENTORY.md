# B3 — Section 06 finite inventory (pre-code)

**Figma:** `fy69K8cCug9prf5GLwQ7Hy` · Section `618:1254` · Universe `618:2`  
**HEAD at inventory:** `8c090d0`  
**Runtime owner:** `YouPane` (`OpalApp.tsx`) + `YouSettingsDestination.tsx`  
**Dock:** You-active for all nested settings (`755:2`)

Person Profile `618:1257` is **NOT** B3 (relationship surface; Home-active). Hard separation preserved.

## Inventory table

| # | Surface | Figma node | Runtime key / owner | Entry from You | Back | Accent | Pre-B3 status |
|---|---------|------------|---------------------|----------------|------|--------|---------------|
| H | You hub | `618:1344` | YouPane root | Dock You | — | sparse | PARTIAL formal O/D |
| H+ | Settings Hub (scrolled You) | `618:1430` | Same YouPane scroll | scroll / same dock | — | sparse | PARTIAL (no dedicated stamp) |
| 01 | Privacy & Audience | `618:1524` | `privacy` | Privacy row | You hub | violet | PARTIAL |
| 02 | Location & Travel | `618:1591` | `location-travel` | Location & travel | You hub | aqua | PARTIAL |
| 03 | Spending & Fit | `618:1662` | `spending-fit` | Spending & fit | You hub | gold | PARTIAL (Figma captured) |
| 04 | Calls & Opal Assist | `618:1733` | `calls-assist` | Calls & Opal Assist | You hub | cyan | PARTIAL |
| 05 | Feed & Discovery | `618:1801` | `feed-discovery` | Feed & discovery | You hub | violet | PARTIAL |
| 06 | Engagement | `618:1868` | `engagement` | Engagement | You hub | coral | PARTIAL |
| 07 | Notifications | `618:1935` | `notifications` | Notifications | You hub | magenta | PARTIAL |
| 08 | Linked Devices | `618:2003` | `linked-devices` | Linked devices | You hub | aqua | PARTIAL |
| 09 | Safety | `618:2060` | `safety` | Safety | You hub | coral | PARTIAL |
| 10 | Edit Profile | `618:2123` | `edit-profile` | Edit profile CTA | You hub | cyan | PARTIAL |
| 11 | Account & Security | `618:2180` | `account-security` | Account & security | You hub | violet | PARTIAL |
| 12 | Delete Account | `618:2243` | `delete-account` | nest under Account | Account stack | coral | PARTIAL |

**All 12 = 12 nested destinations.** You hub + Settings Hub are presentation of the same owner (scroll continuity). Formal packages required for hub `618:1344` and each of the 12.

## State-completeness (initial classification)

| Screen | States to prove | Class |
|--------|-----------------|-------|
| All toggles | on/off | DERIVABLE + EXPLICIT_FIGMA where drawn |
| Location | private use ≠ social share | EXPLICIT_FIGMA + privacy note in runtime |
| Spending | private comfort / no bank | EXPLICIT_FIGMA |
| Notifications | meaningful classes only | EXPLICIT_FIGMA |
| Delete | confirmation / nest | EXPLICIT_FIGMA nest under Account |
| Back | return to You / stack | DERIVABLE — browser prove |
| Loading/empty | microstates | `904:10`/`904:15` if encountered — not new destinations |

## Zero-dead-control

Every hub row must open its destination. Nested nav rows without destinations → DEPENDENCY/FOUNDER_REVIEW, not fake ACTIVE.

## Out of B3 scope

`902:2` / `902:345` / `902:688` · Activity icon · B4–B7 · Person Profile formal · Create
