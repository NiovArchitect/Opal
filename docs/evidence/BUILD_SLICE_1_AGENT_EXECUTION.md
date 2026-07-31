# Build Slice 1 — Agent Execution

**Program lead:** Agent Zero (this session)  
**Mode:** Single orchestrator with exclusive file ownership by domain (no parallel multi-writer conflicts)

## Recruited roles (minimal)

| Role | Owned surfaces |
|------|----------------|
| Contract/API Architect | `packages/contracts/**` |
| Elixir/OTP Architect | `apps/opal_core/**` |
| Python AI Architect | `services/opal_ai/**` |
| Privacy Engineer | Consent proof model, gate docs |
| Security Engineer | DevAuth isolation, isolation tests |
| Test Architect | Elixir + Python test suites |
| CI/CD Engineer | `.github/workflows/ci.yml`, Makefile, docker |
| Local Infra | `infra/local/docker-compose.yml` |

## Not recruited (slice-out-of-scope)

UI, brand, growth, telephony, translation quality, voice-model agents.

## Conflicts

None. Sequential ownership prevented dual-edits.

## Agent Zero resolutions

1. Lowercase dirs: `opal_core`, `opal_ai`, `opal_mobile`.  
2. JSON Schema + dual validation (Elixir explicit rules + Python jsonschema).  
3. Test AI client for consent “Python not called” proof without network.  
4. Oban migration pinned to v14 for Oban 2.23.  
5. Schema validation before job_id checks for malformed responses.
