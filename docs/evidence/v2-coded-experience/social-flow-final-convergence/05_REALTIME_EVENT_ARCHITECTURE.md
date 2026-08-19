# 05 — Realtime / event architecture

```
Client UI  ←→  Phoenix Channels (conversation:*, Presence)
                 ↑
            PubSub / social_flow events
                 ↑
        Domain TX → Postgres + event_outbox (same commit)
                 ↑
        Oban PublishOutboxWorker → LocalAdapter (now)
                                   KafkaAdapter (future stub)
```

**Law:** Clients never consume Kafka. Kafka does not replace Phoenix. Python does not own durable product state.
