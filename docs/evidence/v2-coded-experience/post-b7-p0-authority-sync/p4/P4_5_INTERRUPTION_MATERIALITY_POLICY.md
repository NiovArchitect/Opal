# P4.5 Interruption Materiality Policy

**Version:** `p4.5.interrupt.v1`  
**Consumes:** frozen P3 Signal Grammar — do not add colors.

## Interrupt human only when

- time-sensitive OR action required OR meaningful enough  
- AND recipient authorized  
- AND preference permits  

## Never interrupt for

- Kafka telemetry / consumer processed  
- evidence refresh only  
- same High after recompute  
- score jitter  
- non-material world refresh  

## Signal mapping (examples)

| Consequence | Signal |
|-------------|--------|
| New provisional possibility | VIOLET |
| Meaningful context/alignment change | AQUA |
| Confirmed/ready earned | GOLD (only when true) |
| Needs user | CORAL (scarce) |
| Settled | NEUTRAL / none |
| Do-now control | CYAN |

Realtime ≠ perpetual motion. One organic breath only when state law permits.
