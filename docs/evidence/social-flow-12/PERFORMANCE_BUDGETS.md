# SF12 Performance Budgets

Environment: Jest + Mix CI hosts (synthetic).

| Metric | Budget | Notes |
|--------|--------|-------|
| cold_start_ms | 3000 | Client lifecycle model |
| warm_start_ms | 1500 | Client |
| home_cached_ms | 500 | Client model |
| chats_list_ms | 800 | 50-item page |
| conversation_open_ms | 800 | 50-message page |
| sqlite_query_ms | 100 | Local synthetic |
| snapshot_bytes | 250000 | Server encode gate |
| home_snapshot_ms (server CI) | 5000 | Structural + generous timing |
| nav cycles | 100 | Zero residual listeners |

Not a production SLA. Large lists must paginate (PAGE_SIZE=50).
