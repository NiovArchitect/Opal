# Set gate — first two-user proof

**Author:** Grok (lead)  
**Module:** `OpalCore.SocialFlow.AlignmentState.set_gate_satisfied?/1`

## Must be true before Set

1. Conversation has ≥2 authorized members.  
2. Plan-forming evidence exists in shared messages.  
3. ≥2 distinct members gave affirmative responses to the same active proposal.  
4. No cancel evidence.  
5. No private response that invalidates Set (`need_another_time`, `not_this_time`).  
6. Membership and relationship still valid (not blocked).  

## Cannot create Set

- Time passing alone  
- Python proposal alone  
- One user alone (for mutual two-user proof)  
- Client assertion  
- Duplicate responses (idempotent)  

## Public label

**Set** — never Booked / Handled / Reservation requested for this gate.  
