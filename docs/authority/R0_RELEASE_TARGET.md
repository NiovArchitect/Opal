# R0 Release Target Ladder

**HEAD:** `e52d095` · **Program:** POST_P4_PRODUCTIONIZATION  
**Law:** No stage is authorized by this document. Each stage needs explicit founder GO.

| Stage | ID | Meaning | Capability classes required (minimum) |
|-------|-----|---------|----------------------------------------|
| A | `INTERNAL_DEV` | Engineers run web + local API + synthetic OTP | DI REAL · synthetic identity · local Kafka optional |
| B | `FOUNDER_DEVICE` | Founder installs internal RC on personal phone against hosted API | Real or trial SMS · installable binary · no store claim |
| C | `PRIVATE_TEST` | TestFlight / Play internal · 2+ trusted humans | Production SMS · two-device chat · **TLS verified** · synthetic off |
| D | `EXTERNAL_BETA` | Limited external testers | C + crash reporting · push for chat/call wake · Calls media if Calls advertised |
| E | `STORE_RC` | Submission candidate | D + store packaging · privacy nutrition · production bundle IDs · claimed surfaces real |
| F | `PUBLIC_RELEASE` | Live on stores | E + founder Production Walk pass · `STORE_SUBMISSION_AUTHORIZED=YES` |

## North-star RC (maps to stage C→D)

**Two real users · two real phones · real OTP · real chat · real WebRTC audio call · consequence can reach Decision Intelligence without founder fixture.**

Production Kafka / Places depth / Store packaging are **not** required for that spine (they gate later stages / claims).
