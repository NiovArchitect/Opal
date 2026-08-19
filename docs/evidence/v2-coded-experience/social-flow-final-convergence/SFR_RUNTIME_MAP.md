# SFR runtime authority map (327:2)

**HOLD.** Internal step enums may remain historically named `frXX`.

Customer behavior and evidence must use **SFR-00…SFR-04**.

Do **not** treat “FR05” as product authority naming. The conversion STOP is **SFR-04**.

| Figma | Authority name | Runtime component / state | Behavior |
|-------|----------------|---------------------------|----------|
| 327:5 | **SFR-00** Splash | `FirstRunExperience` `step === "fr00"` · `data-testid="fr00-splash"` · `data-figma-sfr="327:5"` | Tap begin / Skip intro / I already have an account. **No autoplay.** |
| 327:19 | **SFR-01** | `step === "fr01"` · `fr01-world` · `sfr-manual-swipe` | Manual swipe / Skip → SFR-04 |
| 327:55 | **SFR-02** | `step === "fr02"` · `fr02-who` | Manual swipe / Skip |
| 327:106 | **SFR-03** | `step === "fr03"` · `fr03-ambient` | Manual swipe / Skip |
| (illustrative beat) | Live beat (legacy enum) | `step === "fr04"` · `fr04-live` | Manual swipe into conversion; enum retained only |
| 327:138 | **SFR-04** conversion STOP | `step === "fr05"` · `fr05-start` · `data-fr-mode="conversion-gate"` | Phone / already have account. **STOP.** |
| 327:161+ | AUTH-01…AUTH-05 (+ optional 05A) | `fr06`…`fr09` | Real `productClient` auth → authenticated Home |

## Mapping rule

If runtime internal names remain `frXX`, that is acceptable **only if**:

- customer behavior matches current SFR authority
- evidence explicitly maps old internal name → current Figma authority (this file)
- old timed cinematic semantics are gone
- no stale screen is accidentally reachable

Timed cinematic autoplay: **REMOVED** (61bca7e+).

## Post-auth landing

Authenticated Home authority remains **Figma 287:6 OGX-00** continuous social stream.

Until production owners fully hydrate that surface, runtime marks `data-home-status="partial-ogx"`.
