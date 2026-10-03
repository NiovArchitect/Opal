# Hierarchy / lifecycle convergence matrix

**Pass:** Founder screenshot correction — product hierarchy drift  
**HOLD:** MERGE=NO · LIVE=NO · A8_FROZEN_GREEN held (physical walk found hierarchy issues)  
**Law:** KEEP WHAT WORKS · FIX WHAT IS BROKEN · COMPOUND · no parallel engines

| Observed defect | Current owner | Canonical domain/event owner | Minimal change | Regression risk |
|-----------------|---------------|------------------------------|----------------|-----------------|
| Dock too high / steals Home runway | `styles.css` `--dock-*` / `--opal-dock-lift` · `.tabbar-option-b` | Option B dock chrome (frozen slots) | Lower dock container toward safe-area; keep orb protrusion independent; reduce clearance breath | Low — geometry only; verify all member destinations |
| Home = itinerary (“Earlier together” + CHOOSE dinner) | `HomePlanContinuity` · `HomeProjection` · Awaken/`selectHomeAwaken` · `GraphSocialHome` feed | SocialMoment home feed + SharedPlan projection | Past plans → Memory/social stream object; suppress planner stack; keep Stories/SocialMoment primary | Medium — Home composition |
| Graphs treat past Fort Oak as active Ready | `planSurfaceState` · `GraphsHome` lenses All/Action/Ready · `PlanStateArbitration` | SharedPlan + temporal arbitration | Add **Past** lens + status; map temporal past → Past; neutral/white pill | Medium — Graphs filters/tests |
| Thread loses completed Fort Oak; only calls | Thread header `next-plan-strip` / plan-set history · `nextPlan.ts` | SharedPlan alignment + ConversationAlignment | Compact historical Reality strip when past (not Next Together) | Low–medium |
| Confirm 8:00 vs Graph 7:30 contradiction | ConversationAlignment `change_proposal` vs committed lines · SurfaceProjection | SharedPlan single WHEN + pending proposal | Ensure pending vs committed labels never both read as current truth | High if wrong — reuse A8 contract |
| Bell “no activity” while Graph/chat changes exist | `AttentionCenter` · `ActivityDestination` · AttentionAuthority | AttentionAuthority + AttentionCenter items | Project meaningful updated/needs_you from authorized events; deep-link; no like-spam | Medium |
| Chats `Following · Direct` / `Connection · Group` | `ChatsHome.defaultRelLabel` | FollowGraph ≠ Connection; group ≠ Journey | Honest composition labels only (Direct / Group · N) unless canonical relationship proven | Low |
| Center Opal vs redundant + creates | Dock Opal · Chats/Graphs create buttons | Global Opal destination 618:902 | Preserve Opal + create paths this pass; document audit only unless equivalence proven | Low (docs) |
| Demo/placeholder leak | `socialAuthority` · founder seeds · fixture reset | SocialMomentPublishing + fixture scripts | Keep prior hygiene; no new fake social cards | Low |

## Non-goals this pass

- Redesign dock identity / slot order  
- Fake SocialFeedBrain / demo card spam  
- Track B WebRTC  
- Journey feature build  
- Merge / live  

## Proof cases

- Fort Oak Sep 29 → Past (not Ready / Next Together / booking CTA)  
- Home social-first after dock lower  
- Chats labels do not invent Connection  
- Thread shows compact past Reality for Fort Oak  
- Graphs: All · Action · Ready · **Past**  

## Implementation status

See `HIERARCHY_CONVERGENCE_CHECKPOINT.md`. **HOLD** for founder walk. MERGE=NO · LIVE=NO.  
