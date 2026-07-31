# Noise Removal Audit

**Status:** Phase 0 checklist for design and eng review

---

## Banned as primary UI

| Noise | Why banned | If needed, where |
|-------|------------|------------------|
| Sentiment meters | Pseudo-science theater | Under-the-hood only |
| Relationship scores | Harmful | Never |
| Agent names in chrome | Engineering leak | Dev/debug builds |
| “Vector search” / RAG labels | Jargon | Never user-facing |
| Workflow state machines | Jargon | Ops only |
| Memory capsule browsers (raw) | Creepy | Simplified “what Opal used” |
| Constant inference banners | Anxiety | Sparse, dismissible |
| Confetti / gamification on intimacy | Tone-deaf | Never |
| Empty AI chatbot home | Wrong product | Contextual actions |

## Allowed signal patterns

- One-line soft suggestions  
- Compact commitment cards  
- Translation label: “Translated from Spanish”  
- “May suggest…” copy  
- Clear consent sheets  

## Review ritual

Before shipping a surface, ask:

1. Does this help a human relationship in under five seconds?  
2. Would this feel invasive if my partner saw it?  
3. Is there a non-AI way this is just good messaging UX?  
4. Can the user dismiss forever without penalty?  
