# Expiration — Phase 2

Default opportunity TTL: 72 hours from surface.

`Durable.expire_stale/0` marks past-due active opportunities `expired`.

`get_for_user` returns quiet for expired moments. Human messages are never deleted.
