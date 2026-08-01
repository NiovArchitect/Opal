# Social Flow 9 — Journeys A–H

Post-merge verification: `trust_safety_test.exs` **10 tests, 0 failures**.

## A Youth block

Olivia blocks Noah without guardian permission; delivery/sync/request denied; approved contact suspended; minimal guardian notice; no report required; block works without report.

## B Report without block

Marcus reports Victor; reporter confidential to subject; contact-request suspension; optional separate block not auto-applied; subject cannot list reporter identity.

## C Compromised device

List sessions; revoke CompromisedMarcusDevice only; revoked session denied; human identity preserved; other sessions may remain until explicit revoke-all.

## D Recovery

Marcus recovers Olivia with guardian proof; sessions rotated/revoked; recovery-code replay denied; Taylor (outsider) cannot initiate; identity preserved.

## E Guardian authority

Remove Evelyn as co-guardian → `human_review_required`; authority not auto-revoked; not custody adjudication; spoof denied.

## F Block bypass

Noah attempts send/request/stale token/queue/guessed ID after Olivia block → denied without existence leak; no retaliatory “you were blocked by” surface.

## G Bounded evidence

Report stores message hash + minimal snippet only; subject cannot list evidence refs; no full conversation dump into every audit row.

## H Appeal

Victor appeals; reverse restores contact-request capability only; no reporter identity exposed; duplicate appeal denied; no automated guilt conclusion.
