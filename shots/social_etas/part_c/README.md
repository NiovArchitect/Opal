# Part C — Graph detail live ETAs + convoy

Founder description: Who's going, I'm on the way, geometric ETA, convoy sorted by arrival, per-graph Share my ETA.

## Evidence

- `01_graph_detail_convoy.png` — Juniper detail with convoy + ETA panel
- `02_on_the_way.png` — after I'm on the way → On the way ✓
- `VERIFY.json` — automated pass

## VERIFY

- I'm on the way: not_started → on_the_way + button "On the way ✓"
- Geometric estimate honesty label
- Convoy includes "Not sharing location" for opt-out member
- Share my ETA toggle present
- Broadcast hooks wire to conversation LiveExperience (`pushExperienceArrival` / `pushExperienceEta`)
