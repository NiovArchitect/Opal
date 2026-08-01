# SF12 Defect Ledger

| ID | Sev | Title | Status | Notes |
|----|-----|-------|--------|-------|
| D0 | — | No P0 blockers found in readiness suite | closed | — |
| D1 | P2 | Physical device farm incomplete | accepted residual | viewport/simulator-class only |
| D2 | P2 | Visual screenshot baseline not image-committed | accepted residual | state matrix covered by fixture tests |
| D3 | P3 | Server snapshot timing noisy on cold CI | mitigated | generous advisory budgets |

Fixed during slice:

* Internal RC profile forbids DevAuth/localhost  
* Listener cleanup on account switch  
* Deep-link membership enforcement  
* Log redaction for phone/token/body  
