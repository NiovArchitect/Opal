# Hosted relationship proof (Track A)

Date: 2026-08-04  
API: `https://api.opal.niovlabs.com`  
Image: `sf18-outbox-52cbc3c`  

## Journey (synthetic fixtures, no secrets)

| Step | Result |
|------|--------|
| User A activate | pass |
| User B activate | pass |
| Invitation create (recipient user id) | `waiting_for_them`, `sms_sent=false`, share token present |
| Incoming visible to B | pass |
| Accept | `establishment.status=active`, conversation_id present |
| First social moment | present, `not_a_chatbot=true` |
| A message: plan language | accepted |
| B reply: constraints | accepted |
| Quiet greeting | accepted (signal volume not forced) |
| User C isolation | A–B conversation not listed for C |

## Residual

- Physical iOS/Android contact permission UI still open
- Phone-number invite path requires resolve match to set `intended_recipient_user_id` for accept; recipient_user_id path proven end-to-end
