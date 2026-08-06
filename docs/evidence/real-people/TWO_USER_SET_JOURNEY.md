# Two-user message-to-Set journey

**Test:** `test/opal_core_web/real_people_two_user_set_journey_test.exs`  
**Status:** Automated product HTTP + Phoenix proof  
**Twilio:** disabled / synthetic only

## Sequence

1. A and B activate (synthetic OTP + consent)  
2. A invites B  
3. B accepts → relationship + conversation  
4. Both join Phoenix `conversation:{id}`  
5. A: “We should study together this week.” → **Becoming a plan** + **This could work**  
6. B: “Wednesday works, but not too late.” → **Still open** + Wednesday at 5:30  
7. A: “I'm in” → still **Still open**  
8. B: “Works for me” → **Set** (set_version 1)  
9. Refresh preserves Set  
10. Reconnect reconciles Set  
11. Outsider denied  
12. Private participation shared-safe only  
13. Sign-out revokes socket  

## Authority

- Elixir `ProductSignals` classifies lifecycle  
- Mutual Set requires **two distinct** affirmative speakers  
- Python cannot create Set  
- Client cannot invent Set without message evidence  
