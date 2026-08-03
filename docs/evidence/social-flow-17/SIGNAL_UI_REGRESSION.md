# SF17 signal UI regression checklist

| Check | Expected |
|-------|----------|
| Chat list peer name | Name only; no journey text as identity subtitle |
| Journey chip | Optional `.opal-moment.row` under preview when active |
| Quiet chat | No chip (demo: Sam Rivera) |
| Thread header | Peer name + peer context; journey bar separate |
| Human bubble | Only human body + time |
| Opal moment | Distinct capsule, not left/right person bubble |
| Plans “In motion” | Lists current shared progress labels |
| Smoke bodies | Hidden from product history API after deploy |
| Walkthrough SF14 | Unchanged |

Automated: web `product.test.ts`, `smoke.social.test.ts`; Elixir signal + smoke tests.
