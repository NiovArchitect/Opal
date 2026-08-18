# S1.1 Level 5 multi-session adversarial proof

Generated: 2026-08-18T02:00:10.964Z
API: http://127.0.0.1:4000
Product SHA (at run): `3237f70353088da84b99c669b16bc9bdbedb105b` (pre-authority-commit stamp; re-stamp after final commit)\n\nVerdict: **PASS**
PASS 36 · PRODUCT_FAIL 0 · ENV 0

## Actor IDs
```json
{
  "A": "47aa5856-8c56-4b18-a4d4-6a9b456516a8",
  "B": "b599fcd7-7a97-4736-8221-86e0a6d8dc7a",
  "C": "f69f941c-2288-432e-a46d-c0f143eaa8b8",
  "E": "5c9baed1-9cc4-45b3-a8de-27f16c42583c",
  "F": "ee88e6fb-1cbf-4347-9e67-e973790de2e1"
}
```

## Results
- **PASS** `api_health` — API reachable
- **PASS** `activate_matrix` — A=47aa5856 B=b599fcd7 C=f69f941c E=5c9baed1 F=ee88e6fb
- **PASS** `direct_pair_ensure_idempotent` — id=ace99adc-db67-4258-9d95-f612246c6c84 composition=dyad reuse=true
- **PASS** `direct_pair_not_group` — {"count":2,"composition":"dyad"}
- **PASS** `direct_pair_plan_visible_to_B` — B has Juniper 7:30 in direct history
- **PASS** `group_create_ABE` — group=8973d16d-9560-4cf4-81ab-fac3a080a1a6 count=3 composition=group
- **PASS** `group_widening_E_no_direct` — E denied direct history status=403
- **PASS** `group_member_E_sees_group` — status=200 has=true
- **PASS** `group_masquerade_person_is_dyad` — person=ace99adc-db67-4258-9d95-f612246c6c84 labeledGroup=c8518bb0-9fa6-42ff-924f-22146ff7181c equal=false
- **PASS** `group_masquerade_reuses_true_dyad` — prior=ace99adc-db67-4258-9d95-f612246c6c84 now=ace99adc-db67-4258-9d95-f612246c6c84
- **PASS** `realtime_pair_push` — B channel received push without client reload
- **PASS** `realtime_pair_reply` — A sees B reply after history read
- **PASS** `sender_identity_not_them` — sender=b599fcd7 expected B
- **PASS** `reload_history_authority` — shared=28 ordered=true a=28 b=28
- **PASS** `unrelated_F_history_denied` — status=403
- **PASS** `unrelated_F_send_denied` — status=403
- **PASS** `unrelated_F_group_denied` — status=403
- **PASS** `sign_out_A` — status=200
- **PASS** `revoked_session_api_denied` — status=401
- **PASS** `revoked_session_send_denied` — status=401
- **PASS** `multi_tab_second_session` — second session ok=true
- **PASS** `group_speaker_attribution` — each human message attributed to correct user_id
- **PASS** `group_speaker_reintroduce_after_others` — A reappears after other speakers with own identity
- **PASS** `solo_session_no_forced_peer` — session alive; conversation list status=200 (Solo UI is client; no fake peer forced by activate)
- **PASS** `reservation_confirmed` — status=confirmed booked=true live_claimed=false
- **PASS** `reservation_idempotency` — idempotent=true status=confirmed
- **PASS** `reservation_pending` — status=held booked=false
- **PASS** `reservation_failed` — status=payment_authorization_required booked=false live_claimed=false
- **PASS** `pair_disagreement_preserves_human_speech` — 7:30 proposal and 8 preference both remain as human messages
- **PASS** `pair_disagreement_no_false_alignment` — no false agreement claim after B prefers 8
- **PASS** `auth_wrong_code` — status=401 code=invalid_code
- **PASS** `auth_username_collision` — status=422 code=handle_taken
- **PASS** `walkthrough_cannot_grant_auth` — status=401
- **PASS** `browser_independent_contexts` — context A member=0 prememberish=2 (independent storage)
- **PASS** `browser_no_false_add_photo` — no interactive Add photo controls on cold load
- **PASS** `profile_photo_decision` — OPTION_B PROFILE_PHOTO_DURABILITY_DEFERRED — initials only, no interactive false save

## Network denials (expected 401/403 ok)
Denied captures: 8
Unexpected 5xx: 0

## Profile photo
`PROFILE_PHOTO_DURABILITY_DEFERRED` (Option B) — initials only; no interactive Add photo.
