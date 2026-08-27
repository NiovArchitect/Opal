# 05 — Production / Fixture Firewall

| Mode | URL | Expected | Observed |
|---|---|---|---|
| Production | `/` | PRODUCTION_HYDRATION | yes · seed cards 0 · count 46 |
| Founder seed | `/?opal_founder_seed=1` | FOUNDER_FIXTURE | yes · same CSS/components · grammar order |

`PRODUCTION_FIXTURE_LEAK = 0` on default authenticated route.
