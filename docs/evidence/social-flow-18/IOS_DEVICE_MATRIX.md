# iOS device matrix — SF18

## Environment at evidence time

| Field | Value |
|-------|--------|
| Host workstation | Sadeil’s MacBook Pro |
| iOS Simulator runtimes available | **None installed** (only unavailable iOS 16.2 runtime listed) |
| Physical iPhone/iPad attached | **None** |
| Source commit (mobile) | See HOSTED_AND_DEVICE_PARITY.md |
| Test date | 2026-08-04 |

## Matrix status

| State | Result |
|-------|--------|
| not determined | **BLOCKED** — no device |
| authorized | **BLOCKED** — no device |
| limited | **BLOCKED** — no device |
| denied | **Proven by code contract** (`permissionBlocksProduct=false`, denied phase UI) |
| restricted | **BLOCKED** — no device |
| revoked in Settings | **BLOCKED** — no device |

## Code-level guarantees already landed

- Limited treated as readable (`canReadContacts`)
- Denied opens manual fallback; product remains usable
- Selected-only server submit
- No automatic invitation on permission grant
- NSContactsUsageDescription present

## Required founder pass

Attach a real iPhone (or install a current iOS simulator runtime) and complete A1 journey with VoiceOver sample.
