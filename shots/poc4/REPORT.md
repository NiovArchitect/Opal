# Phase OC-4 report

## Product

`OpalCore.OpalResponse.generate/2` builds a short template reply from intent +
context. `OpalCore.Memory.store/3` and `recall/2` back remember/recall.
Create-message flow: assemble → classify → generate → store Opal reply.
Honest fallbacks when paths or data are missing. No LLM. Max 3 sentences.

## Verification

- OpalResponseTest: 20/20
- Manual POST × 8: all 201, intents match, not placeholder, all &lt;2s
- Real context usage: Maya, Fort Oak / Juniper & Ivy, celebrations, display name
