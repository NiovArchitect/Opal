# ACTION GRAPH MATRIX

**Status:** PASS 1 PROVEN CORE · PASS 2 expands adversarial rows  
**Law:** `VISIBLE_DEAD_SOCIAL_CONTROL = 0` · `DEAD_CONTROL_COUNT = 0`  
**Updated:** 2026-10-03 (Pass 1 close)

| SURFACE | CONTROL | VISIBLE WHEN | OWNER | HANDLER | DOMAIN/API | EXPECTED | BACK | TEST | STATUS |
|---------|---------|--------------|-------|---------|------------|----------|------|------|--------|
| Center | Today/Week/Shared | Center open | OpalCenterLifeGraph | setPhase | client phase | phase body | stay | whole_product geometry | PROVEN |
| Center | Curate / What's next / Move | rest phase | OpalCenterLifeGraph | askAboutDay | Center ask path | conversation phase | stay | Pass1 inventory | ACTIVE |
| Center | + / mic / send | Center open | OpalCenterLifeGraph | attach / listen / ask | attach + ask | attach/query | stay | Pass1 inventory | ACTIVE |
| Thread | ··· Earlier together | past Shared Reality | GraphPeopleThreadHeader | onOpenEarlierTogether | openGraphDetail | Graph Detail past | thread | whole_product THREAD_HISTORY | PROVEN |
| Thread | next-plan-strip | upcoming eligible only | OpalApp | openGraphDetail | Graph Detail | detail | thread | past strip absent | PROVEN |
| Graph Detail | Repeat | past graph | GraphDetailSheet | openRepeatFromPast | GraphCreateFlow prefill | NEW lineage context | detail | PASS1_REPEAT_SMOKE + unit | PROVEN |
| Graph Create | Change who | Repeat/create | GraphCreateFlow | who picker | participant select | new people ok | create | PASS1_REPEAT_SMOKE | PROVEN |
| Home | like/comment/repost/save | production card | SocialMoment + socialAuthority | authoritative* | BEAM engagement | toggled state | Home | social_engagement_authority_proof | PROVEN |
| Home | story cell | stories present | GraphSocialHome | open story | TemporaryStory | viewer | Home | whole_product HOME_SOCIAL | PROVEN |
| Home | post / author | feed cards | GraphSocialHome | open profile/detail | social moment | destination | Home | HOME densify | ACTIVE |
| Attention | bell badge | actionable_count>0 | OpalApp | fetchAttention | AttentionAuthority | digit badge | — | a61 | PROVEN |
| Attention | Review | actionable item | ActivityDestination | deep-link | ConversationAlignment | Accept/Keep | Attention | a61 | PROVEN |
| Attention | Back | Attention open | ActivityDestination | onBack | nav | prior surface | — | a61 | PROVEN |
| Dock | Home/Chats/Graphs/You/Opal | member nav | OpalApp | setTab / Center | nav | surface | prior | whole_product | PROVEN |

```text
VISIBLE_ACTION_COUNT = 14 (matrix rows)
PROVEN_ACTION_COUNT = 11
ACTIVE_UNPROVEN_OR_THIN = 3 (Center chips semantic depth; Home author tap; engagement on non-durable ids)
DEAD_ACTION_COUNT = 0
```

## Pass 2 expansion targets

- Repeat → durable NEW SharedPlan lineage (same people / different people)
- Center text intelligence paths
- Home engagement click inside whole_product
- Relationship fact retrieval surfaces
- Full back-stack matrix across Attention → Review → thread
