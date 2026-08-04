# Physical Smoke Cleanup

## Method

Temporary operator endpoint (PR #32), gated by:
- `OPAL_ALLOW_SMOKE_CLEANUP=true`
- `OPAL_SYNTHETIC_FIXTURE_ONLY=true`
- high-entropy `OPAL_SMOKE_CLEANUP_SECRET` header

Executed only against the synthetic hosted environment.

## Dry run

```
matched: 11
deleted: 0
status: dry_run
```

## Delete

```
matched: 11
deleted: 11
status: deleted
```

## Second run

```
matched: 0
deleted: 0
status: clean
```

## Notes

- Read filter remains as defense in depth.
- Temporary endpoint removed in follow-up commit after cleanup.
- No permanent administrative cleanup capability remains.
