# P4.5 Recomposition Dependency Matrix

**Version:** `p4.5.recompose.deps.v1`

| Changed dimension | Invalidate | Refresh candidates? | Hard filter? | Score? | Fairness? | Provider truth? | High? | Medium gap? | Low conflict? |
|-------------------|------------|----------------------|--------------|--------|-----------|-----------------|-------|--------------|---------------|
| provider_availability | provider_availability | yes if selected dead | yes | yes | if scope | yes | yes | maybe | maybe |
| participant_membership | participant_membership | maybe | yes | yes | yes | no | yes | maybe | maybe |
| participant_availability | participant_availability | no | time/people | yes | yes | no | yes | maybe | maybe |
| time_window | time_window_validity | hours/open | yes | yes | no | hours | yes | maybe | maybe |
| location / radius | location_radius | yes nearby | yes | yes | no | distance | yes | maybe | maybe |
| budget hard | budget_maximum | maybe | yes | yes | no | price | yes | maybe | maybe |
| soft vibe/budget | soft prefs | no | no | yes | maybe | no | yes | maybe | yes |
| weather (if integrated) | weather_dependency | outdoor only | yes | yes | no | weather | yes | no | no |
| graph_revision | graph_revision | if place/people | yes | yes | yes | maybe | yes | maybe | maybe |
| journey_revision | journey_revision | timing/place | yes | yes | no | maybe | yes | maybe | maybe |
| conversation correction | explicit_reject / intent | delta only | as needed | yes | as needed | no | yes | maybe | maybe |

**Do not** re-extract full conversation on provider-only events.
