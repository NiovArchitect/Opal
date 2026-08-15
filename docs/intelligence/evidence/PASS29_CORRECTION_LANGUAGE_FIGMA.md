# PASS 29 CORRECTION — Founder Language + Figma Visual Authority

**Baseline:** `de08689`  
**Verdict:** **HOLD — DO NOT MERGE**  
**Intelligence diff:** **NONE**

---

## EXECUTIVE STATE

Two founder-level failures from Pass 29 report are corrected:

1. **Rejected commercial ownership copy removed from live product**  
2. **Figma FOUNDER REVIEW page created with exact node IDs** (not “didn’t overwrite” as sufficient)

ExperienceField ranking **not redesigned**.

---

## FOUNDER COPY REGRESSION

| Phrase | Status |
|--------|--------|
| Make this mine | **REMOVED live** |
| Make this yours | **REMOVED live** |
| Their experience becomes your possibility | **absent live** |
| Logistics recompose for you | **absent live** |

### LIVE COPY AFTER

| Context | CTA |
|---------|-----|
| Creator I follow | **I want to do this** |
| Friend | **Do this with your people** |
| Open event | **I'm in** |
| Fork sheet | **Just me** · **With people** (no kicker/heading) |

Browser verified: CTA text `I want to do this`; banned phrases clean.

---

## REJECTED LANGUAGE GUARD

- Canon: `docs/brand/OPAL_HUMAN_LANGUAGE_CANON.md`  
- Test: `apps/opal_web/src/opalUi/rejectedLanguage.guard.test.ts` (vitest **PASS**)

Internal architecture law remains **internal only**.

---

## FIGMA PUSH RESULT

| | |
|--|--|
| File | `fy69K8cCug9prf5GLwQ7Hy` |
| Approved baseline page | `0:1` V2.0 — **untouched** |
| Review page | **`116:2`** `FOUNDER REVIEW — SOCIAL EXPERIENCE NETWORK` |
| Push | **SUCCESS** |

### FIGMA NODE MAP

| State | Node ID |
|-------|---------|
| SOCIAL DISCOVERY | `116:3` |
| CREATOR MOMENT | `116:10` |
| INTEREST | `116:19` |
| SOLO / PEOPLE | `116:28` |
| PEOPLE SELECTED | `116:39` |
| REALITY FORMING | `116:46` |
| PRIVATE CURATE | `116:53` |
| V2 SHARED REALITY LANDING | `116:60` |
| RECOMPOSE / ERROR | `116:67` |
| POST MOMENT | `116:74` |
| FOLLOWING A label | `116:81` |
| FOLLOWING B quiet | `116:88` |
| FOLLOWING C none | `116:95` |
| CREATOR IMPACT PRIVATE | `116:102` |

Label on every frame: **FOUNDER REVIEW — NOT APPROVED**

---

## EXPERIENCE FIELD PRODUCT STATUS

| Ranking/domain density | READY (Pass 29) |
| Multi-moment Field UX | **OPEN — FOUNDER REVIEW** |
| Home ≠ Field | preserved |

---

## FOLLOWING / INSPIRED (founder judgment)

| FOLLOWING A label | Figma `116:81` |
| FOLLOWING B quiet (product default) | live `followingVisual="quiet"` + Figma `116:88` |
| FOLLOWING C none | Figma `116:95` |
| Inspired N public | **OFF by default** |
| Creator private impact | Figma `116:102` for review |

---

## FOUNDER JUDGMENT GATES (not auto-PASS)

- Emotional warmth  
- Social naturalness of “I want to do this”  
- Quiet following vs Instagram  
- Private impact vs public  
- Media size / Living Void  
- V2 Shared Reality landing continuity  

---

## MASTER HOLD LEDGER

| Gate | Severity | Status |
|------|----------|--------|
| Social copy | **P1 founder-product** | corrected live + guard |
| Social Moment visual | FOUNDER | FOUNDER REVIEW nodes |
| Experience Field product surface | FOUNDER | ranking ready; multi-Moment UX open |
| V2 merge | FOUNDER | OPEN |

---

## LAW

```
DO NOT WRITE ADVERTISING COPY ON SOCIAL MOMENTS.
OWNERSHIP CTAs ARE REJECTED.
IF GROK DESIGNS IT, FIGMA MUST KNOW IT.
THE EYE IS A HARD GATE.
HOLD. DO NOT MERGE.
```
