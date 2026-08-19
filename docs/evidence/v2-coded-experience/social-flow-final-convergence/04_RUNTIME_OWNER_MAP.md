# 04 — Runtime owner map

| Concern | Owner | Path |
|---------|-------|------|
| Messaging | Messages + ConversationChannel | opal_core |
| Presence / client realtime | Phoenix UserSocket / Presence | opal_core_web |
| Domain events | Postgres event_outbox + Oban | LocalAdapter active |
| Kafka | Stub only | KafkaAdapter → not operational; never mobile UI |
| AI jobs | Python opal_ai | Bounded; not product state |
| SocialReality | social_reality.ex | Authority |
| Follow | follow_graph.ex | ≠ Connection |
| Relationship | relationship_graph.ex | Friend visibility |
| ExperienceField | experience_field.ex | ≠ Home Attention |
| Attention | attention_authority.ex | Needs-you ranking |
| Reservation | reservation_execution.ex | Honesty matrix |
| Brand | brand.ts 160:2 | Never 168:2 |
