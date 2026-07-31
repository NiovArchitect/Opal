# Opal Source Material

**Location of originals on founder disk (not the Opal git root):**  
`/Users/genghishameha/Desktop/NIOV Labs/Opal/`

This directory preserves founder-supplied Opal documents **inside the Opal repository** so future agents can recover context without conversation memory.

## Authority classification

| File (repository path) | Original title / filename | Role | Authority |
|------------------------|---------------------------|------|-----------|
| `original/NIOV-Social-Flow-Calendar.md` | NIOV’s Social Flow Calendar.md | Social Flow vision, scenarios, feature catalog | **Historical source** — vision & scenarios valuable; Web3/score/ad mechanisms **not** locked |
| `original/Opal-Commercial-The-AI-That-Moves-Like-You.pdf` | Opal Commercial – The AI That Moves Like You.pdf | Product narrative / commercial | **Historical marketing** — intent only |
| `original/Opal-Developer-Docs.pdf` | Opal Developer Docs.pdf | Later developer documentation | **Historical technical** — RN/Expo + Elixir direction partly preserved; Node paths superseded |
| `original/Opal-MVP-Development-Roadmap.docx` | Opal MVP Development Roadmap.docx | 49-page MVP roadmap | **Historical roadmap** — Node/React/Socket.io **rejected** for orchestration |

## Governing documents when sources conflict

1. Current product-truth under `docs/product/` (especially `OPAL_SOCIAL_FLOW_PRODUCT_TRUTH.md`, `Opal_PRODUCT_TRUTH.md`, `OPAL_CONTEXT_AUTHORITY.md`)
2. Accepted ADRs under `docs/adr/`
3. Current architecture and build-slice evidence
4. These originals and their extracts

## Rules

- Originals are preserved **verbatim** (filename may be normalized for filesystem safety).
- Do **not** rewrite originals to match new architecture.
- Extraction notes under `extracted/` are interpretive summaries, not replacements for originals.
- Marketing language does not prove implementation.
- Scenario examples are **templates**, not hard-coded workflows.

## Disk note

Binaries and markdown copied from Desktop NIOV Labs/Opal total ~660KB. No LFS required. Do not copy `node_modules`, caches, or personal data from outside this set.
