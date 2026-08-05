# Restraint — Phase 1

## Decision inputs

- context confidence
- forming?
- participant count
- option count / preferred quality
- recent suggestion frequency
- privacy risk
- permission revoked
- group correction suppress

## Rule

Surface only when expected social value clearly exceeds interruption and privacy cost.

## Required silence cases (tested)

| Case | Reason |
|------|--------|
| Weak hangout language | context_not_forming / low confidence |
| Ordinary chat | context_not_forming |
| No valid venues | no_valid_options |
| Permission revoked | permission_revoked |
| “Not with this group” | group_correction |

Silence is a first-class pass.
