# Pass 31 — P0-31-04 Group chat who-said-what

**Product SHA:** (this commit)  
**Prior:** `77ec255`  
**HOLD. DO NOT MERGE.**

---

## Root cause

Backend messages carry **`sender_user_id`**.  
Client mapping collapsed every non-self message to **`from: "them"`** and rendered **only bubble side** — no name, no avatar, no per-peer identity.

So multi-human threads looked like a single anonymous “other side.”

Not a Phoenix/transport rewrite problem.

---

## Repair

| Piece | Behavior |
|--------|----------|
| `Message.senderUserId` | Preserved from history + realtime + self-send |
| `messageSpeaker.ts` | Resolve name/initials from member directory by **sender id** |
| `planThreadSpeakerRows` | Header on sender change; group consecutive same sender; system breaks group |
| Thread UI | Avatar + name on transition; a11y `aria-label` with speaker |
| System consequence | Still `humanSpeaker: false`, no peer avatar/name |

---

## Regression holds

- P0-31-01 place continuity (unit suite still green)  
- P0-31-02 when apply (unit suite still green)  
- P0-31-03 system consequence not human speaker  

---

## Unimplemented

Home redesign · local discovery · People sort · full profile photos CDN · name-snapshot policy · broad color system  

Figma: none (implemented against existing chat visual language).
