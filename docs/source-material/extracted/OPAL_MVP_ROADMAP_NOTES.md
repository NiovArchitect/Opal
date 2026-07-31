# Extraction Notes — Opal MVP Development Roadmap

**Source:** `original/Opal-MVP-Development-Roadmap.docx`  
**Original path:** `Desktop/NIOV Labs/Opal/Opal MVP Development Roadmap.docx`  
**Authority:** EXTRACTION / NOTES  
**Governing technical truth:** ADRs 0001–0004, `Opal_PRODUCT_TRUTH.md`

---

## Mission language (preserve as lineage)

- “Turn every message into a meaningful relationship”  
- Resonance Messaging, Resonance Translation  
- Agentic AI assisting communication  

## Architecture in source (historical)

- React web primary  
- **Node.js** backend + WebSocket  
- Python AI services  
- Azure-oriented APIs  
- PostgreSQL or Mongo  
- Future OMCP / blockchain orchestration mentioned  

## Status under current Opal authority

| Item | Status |
|------|--------|
| Mission / resonance / translation vision | Preserved as product lineage |
| Node orchestration core | **Rejected** |
| React web as primary client | **Superseded** by RN Expo mobile-first |
| Python AI services | **Preserved** as workers only |
| Agent modularity | Preserved as product agents (not Node micro-orchestrator) |
| Privacy-first / least privilege AI context | Preserved and strengthened |
| OMCP blockchain vault | Deferred / non-blocking |

## Use of this document

Useful for understanding original MVP ambition and feature inventory.  
**Do not** implement Social Flow or messaging from its Node/Socket.io stack.
