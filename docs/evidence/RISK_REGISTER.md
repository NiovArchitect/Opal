# Risk Register

**Status:** Phase 0

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|------------|--------|------------|
| R1 | Old Node roadmap revived by habit | M | H | ADRs; Agent Zero rejects Node core |
| R2 | AI UI becomes dashboard | H | H | Noise audit; UX principles |
| R3 | Certainty language harms users | M | H | Safety rules; eval tests |
| R4 | Context bleed across circles | M | H | Boundary tests; design |
| R5 | Consent theater without enforcement | M | H | Elixir authority + tests |
| R6 | Python becomes runtime authority | M | H | Boundary ADR; code review |
| R7 | E2EE overclaim | M | H | ADR-0008 honesty |
| R8 | Provider trains on intimate data | M | H | Contract + FOUNDER gate |
| R9 | Coercive-control misuse | M | H | Block/report; feature limits |
| R10 | Scope explosion before messaging works | H | H | MVP boundary spine |
| R11 | Home git root confuses agents | H | M | Isolated Opal repo only |
| R12 | Impersonation features ship early | L | H | GOVERNED deferral |
| R13 | DevAuth accidentally enabled in prod | M | H | default false; prod plug refuses |
| R14 | AI client mock masks HTTP integration bugs | M | M | HTTPClient + docker compose for later E2E |
