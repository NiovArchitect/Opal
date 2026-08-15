# PASS 26 Results

**Run ID:** `soak7-msttwuhs`  
**H-25-01:** CLOSED  
**20-min soak:** 34 PASS / 0 PRODUCT_FAIL / ~20.05 min  
**Conversation:** `4fa00238-8130-4aef-823c-76880d921ace`

## Root cause

Harness opened **Home** instead of **People** → `joinConversation` never ran. Phoenix transport was fine.

## Proof

- All six members: `channel_joined=true`
- Realtime message matrix: all peers realtime
- Private selection isolation PASS
- Explicit share PASS
- Network interruption recovery PASS
- Checkpoints 0/5/10/15/20 HEALTHY
- Stranger 403

## Product repairs

- People-first conversation open (soak + auth browser)
- `AwakenSurface` `data-conversation-id`
- Evidence-only join diagnostics on RealtimeClient

## Honesty

- Product `/follows` still P2 OPEN
- Group create ≥3 intentional
- Full multi-persona daypart UI suite not re-run this pass
- HOLD / DO NOT MERGE

See PASS26_EXECUTIVE.md and H25_01_ROOT_CAUSE.md.
