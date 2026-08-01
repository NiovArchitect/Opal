# Social Flow 10 — Journeys A–H

## A Adult account creation
Alex verifies synthetic number → challenge (no plaintext) → complete → HumanAccount + verified identifier + session. Replay denied. Not legal identity. No auto contacts/relationships.

## B Existing account / new device
Same number on new device → existing HumanAccount; no duplicate; new session registered.

## C Selected contact resolution
One selected identifier → invite_ready / already_connected / etc. No “uses Opal” membership oracle. No full address-book upload.

## D Invitation and acceptance
Alex invites Jordan → view → accept → one RelationshipContext + conversation. Duplicate accept idempotent. No historical messages.

## E Decline / block / revoke
Maya declines Victor → sender sees “Invitation unavailable.” Block blocks resend. Revoked cannot accept.

## F Number reassignment
Provider signal → quarantined identifier → ownership review → no auto history grant to claimant.

## G Duplicate account link
Preview categories only; reauth required; link identifiers preferred over destructive merge; cross-user denied.

## H Guardian-managed youth
Olivia denied adult matching/invite; ApprovedContactRequest + guardian approve_contact (SF8).
