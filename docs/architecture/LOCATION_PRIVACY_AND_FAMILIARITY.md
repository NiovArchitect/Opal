# Location Privacy and Familiarity (interface)

**Status:** Interface / future — **not implemented in Phase 1**  
**Rule:** private location intelligence may rank; shared output shows the benefit, not the hidden reason.

## Future internal inputs (not Phase 1)

- approximate current location  
- chosen meeting area  
- home-area preference  
- work-area preference  
- frequent-area model  
- travel time / destination  

## Shared-safe language

| Allowed | Forbidden |
|---------|-----------|
| This area is easy for both of you. | She is usually here Thursday nights. |
| Near the library works. | He leaves work in Carlsbad at 5:45. |
| Want options close to both of you? | She spends most Thursdays with friends there. |

## Phase 1 coupling

Availability alignment tables and APIs must not require location fields.  
Optional future columns or side tables may attach **ranking signals** after an overlap exists—never as peer-visible default payload.

## Habitual location

Not learned or stored in Phase 1. Any later model requires explicit product + privacy review.
