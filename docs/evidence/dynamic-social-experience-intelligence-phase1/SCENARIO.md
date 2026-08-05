# Scenario: Quiet dinner for three

## Personas (synthetic adults)

| User | Role | Availability | Shared preference | Private constraint |
|------|------|--------------|-------------------|--------------------|
| A (Alex fixture) | Initiator | after 7:00 | open to new | none |
| B (Jordan fixture) | Participant | after 7:30 | quiet (group-safe) | none |
| C (Maya fixture) | Participant | after 7:00 | none | max price band `$$` (private) |
| D (Taylor fixture) | Outsider | n/a | n/a | must receive nothing |

No real phone numbers, GPS, or production users.

## Conversation

```text
A: We should get dinner Friday.
B: I can go after 7:30, but somewhere quiet.
C: I might be down.
```

## Venues (static fixtures)

| ID | Quiet | Price | Available | Travel | Expected |
|----|-------|-------|-----------|--------|----------|
| venue_1 Quiet bistro | yes | $$ | 19:45 | balanced | **winner** |
| venue_2 Loud market hall | no | $ | 19:30 | short | fail quiet |
| venue_3 Quiet high-end | yes | $$$ | 20:00 | balanced | fail private budget |
| venue_4 Quiet cafe far | yes | $ | 19:40 | long | valid secondary |

## Expected surface

Headline: `This looks promising for the three of you.`  
Primary: Quiet bistro fixture  
Actions: Interested | Not this time | See why | Keep private  

## Weak and quiet controls

| Input | Expected |
|-------|----------|
| Maybe we should hang out sometime. | Silence |
| Hey, how are you? / Long day. | Silence |
