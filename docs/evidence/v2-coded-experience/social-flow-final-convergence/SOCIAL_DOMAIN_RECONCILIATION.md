# Social domain reconciliation (server authority tranche)

**HOLD.**

| DOMAIN CONCEPT | CURRENT OWNER | TABLE / STORAGE | API | CHANNEL | USED BY HOME? | GAP |
|----------------|---------------|-----------------|-----|---------|---------------|-----|
| Published Memory / SocialMoment | `SocialMomentRecord` + `SocialMomentPublishing` | `social_moments`, `social_moment_media` | `/api/v1/product/social-moments*`, `/home/feed` | PubSub `social_moments:user:*` | Yes (projection) | Media LOCAL_DEV |
| Like | `SocialMomentEngagement` | `social_moment_likes` | PUT/DELETE `.../like` | PubSub + outbox | Yes | — |
| Comment | `SocialMomentEngagement` | `social_moment_comments` | GET/POST `.../comments` | PubSub + outbox | Yes | — |
| Repost | `SocialMomentEngagement` | `social_moment_reposts` | PUT/DELETE `.../repost` | outbox | Yes | Private/specific_people denied |
| Save | `SocialMomentEngagement` | `social_moment_saves` | PUT/DELETE `.../save` | outbox | Yes | Private to viewer |
| Follow | `FollowGraph` | `follow_edges` | `/follows*` | — | Yes | — |
| Story | `TemporaryStory` + `TemporaryStoryPublishing` | `temporary_stories` | `/stories` | outbox | Yes | Media ref LOCAL_DEV / fixture paths |
| SharedMemory / RelationshipMemory | Continuity / prefs | separate tables | conversation channel | ConversationChannel | No (not Home Memory) | Distinct concepts |
| Client engagement store | `homeEngagementStore.ts` | localStorage | — | — | Optimistic/fixture only | Not SoR |

**Naming law:** Home “Memory” = SocialMoment projection. Not SharedMemory.
