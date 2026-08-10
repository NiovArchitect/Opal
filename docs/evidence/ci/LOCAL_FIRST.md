# Local-first Grok / agent CI discipline

Remote Actions are a **checkpoint**, not an iterative compiler.

## Before every push

1. `mix format` (opal_core)  
2. `mix credo --strict` when Elixir changed  
3. Focused tests for the package touched  
4. Broader `mix test test/opal_core/social_flow/` when SocialFlow changes  
5. Frontend typecheck/test when web/mobile changed  
6. **Batch** formatter + Credo + test fixes into **one** commit/push  

## Do not

- Push after every single-line Credo fix  
- Use GitHub runners to discover format failures  
- Commit evidence/docs as separate remote-triggering pushes when they can ride with the code commit  

## Before merge

1. Apply PR label **`full-ci`** (runs full monorepo matrix once)  
2. Or touch ≥2 surfaces / workflows (auto-full)  
3. Confirm `CI gate` green  

## Docs-only

Prefer path-filtered docs lite job — do not expect Docker/Mobile/Web.
