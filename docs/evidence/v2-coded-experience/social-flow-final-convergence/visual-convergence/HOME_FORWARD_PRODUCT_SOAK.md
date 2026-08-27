# HOME_FORWARD_PRODUCT_SOAK

## Cases

| Case | Expected | Status this pass |
| --- | --- | --- |
| One person · Separately | Independent send | Partial (UI select + cancel proven) |
| Multi · Separately | No group creation | Not fully soaked |
| Multi · Together | Explicit group path | UI mode present; server soak incomplete |
| Cancel | No send | Proven (automation) |
| Double Continue | No duplicate | Not fully soaked |
| Blocked destination | Denied | Domain gates preserved |
| Stale selection | Wrong object denied | Entity id bound on picker |

## Status (2026-08-20 craftsmanship pass)

| Case | Status |
| --- | --- |
| Cancel before selection | **PASS** |
| Cancel after selection | **PASS** |
| Escape dismiss | **PASS** |
| One recipient Continue | **PASS** |
| Multi Separately | **PASS** |
| Multi Together + double Continue | **PASS** |

Visual destination still **MAJOR_DIFF**.  
Functional soak for required Home Forward cases: **6/6 PASS**.  
Root cause: `HOME_FORWARD_RACE_ROOT_CAUSE.md`.
