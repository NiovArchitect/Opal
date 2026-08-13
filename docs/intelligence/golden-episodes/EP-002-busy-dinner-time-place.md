# EP-002 — Busy dinner TIME → PLACE

## Cast
Founder, Jordan

## Start
Empty dyad.

## Messages
1. Founder: “We should get dinner Thursday.”
2. Jordan: “I'm free after 6:30. Does Thursday work?”
3. Founder: “I'm in.”
4. Jordan: “Works for me.”
5. Founder: “We should do something Italian but I don't know where yet.”

## Expected after message 4–5
- WHAT: Dinner  
- WHEN: Thursday · ~6:30  
- WHERE: open  
- **next_gap: place**

## Expected actions
- Primary: Choose a place (not Find a time)

## Forbidden
- stuck in share-time mode  
- place CTA serializing time windows  
- private place pick auto-sends  

## Executable coverage
`founder_proof_fixture.mjs`, `live_jordan_foundation_proof.mjs`, social_reality matrix time→place

## Capabilities
INT-JOURNEY-001, INT-PLACE-001, INT-AUTHOR-001, INT-PROOF-001
