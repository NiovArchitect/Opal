# Member navigation authority

Member tabbar and panes require `session.user_id` after live session probe (`authReady`).

| Scenario | Member nav |
|----------|------------|
| Walkthrough open | Hidden |
| First-run complete, no session | Hidden (activation) |
| Activation / phone entry | Hidden |
| Expired / signed-out session | Hidden |
| Valid product session | Visible |

Walkthrough completion localStorage alone is never sufficient.
