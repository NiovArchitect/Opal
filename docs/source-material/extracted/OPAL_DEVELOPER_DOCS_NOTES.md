# Extraction Notes — Opal Developer Docs

**Source:** `original/Opal-Developer-Docs.pdf`  
**Original path:** `Desktop/NIOV Labs/Opal/Opal Developer Docs.pdf`  
**Authority:** EXTRACTION / NOTES  
**Binary preserved** for full text; notes here are high-level.

---

## Themes typically present in later Opal developer documentation

(Consistent with prior Phase 0 extraction in-repo.)

- React Native Expo client  
- Elixir/Phoenix backend direction  
- Local-first / offline storage  
- Channels / realtime messaging  
- Separate frontend/backend repo history (superseded by monorepo ADR-0001)  
- ScyllaDB mentioned as scale option (not locked; Postgres provisional ADR-0005)  

## Governing technical decisions now

| Topic | Authority |
|-------|-----------|
| Monorepo | ADR-0001 |
| Elixir authoritative runtime | ADR-0002 |
| Python AI | ADR-0003 |
| RN Expo client | ADR-0004 |
| Postgres provisional | ADR-0005 |
| Implemented messaging/AI spine | Build Slice 1–2 evidence |

Developer PDF is historical engineering input, not a license to reintroduce Node as messaging core.
