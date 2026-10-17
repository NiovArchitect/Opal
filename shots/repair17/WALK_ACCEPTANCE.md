# Repair #17 — Walk Acceptance

Each founder finding from the phone walk, mapped to its fix and the test
that proves it. "Walk path" = the web app served to his phone with
`opal_founder_seed=1` — after F17-01 that path is the real system.

| # | Founder finding (his words, condensed) | Fix | Proving test |
|---|----------------------------------------|-----|--------------|
| 1 | "Fix the three clock dependent tests… have them not fail again" | F17-02: injectable `SocialFlow.Clock` on the whole quiet-hours path; tests pin scenario times | Full suite 0 failures unpinned, pinned 02:00 LA, pinned 14:00 LA (TEST_REPORT) |
| 2 | "Add story… sits behind a border or frame… behind the whole social screen" | F17-03: story composer portaled to `document.body` top layer | `repair17UiIntegrity.test.tsx` — composer is a direct body child, outside the app shell |
| 3 | Chat log, Maya: "farmers market plus coast and coast is hanging outside of the pill" | F17-04: pill label in a real truncating span; shared-component containment audit | `repair17UiIntegrity.test.tsx` pill containment cases |
| 4 | "All the colors are the same… supposed to be based off of the status" / "color status didn't change in the chat log but status did change inside of the chat thread" | F17-05: single derivation `planProjectionSurfaceState`; backend projects `pending_proposal_by_user_id`; canonical state colors everywhere | Backend: `home_projection_test.exs` (+2). Web: `repair17UiIntegrity.test.tsx` list/thread same-state cases |
| 5 | "The chat composer is a bit weird… there's this arrow inside of there… things clashing in with it" + NEXT TOGETHER overlapping messages (screenshot) | F17-06: voice glyph → SVG icon (glyph asserted absent); input padding; card fully opaque | `repair17UiIntegrity.test.tsx` composer cases |
| 6 | Chanelle thread: "let's change the time for Juniper and Ivy at 8 PM" → AI auto-reply "Can't wait to see you there"; "confirm 8 PM" → nothing changed; "7:30 PM is locked" still claimed | F17-01 (the AI reply was the scripted layer — deleted) + F17-07 (real two-party revision flow: proposal, truthful "until they confirm" copy, pending revision surfaced everywhere, confirm mutates) | `repair17_w4_flows_test.exs` item 1: two-user distinct-session flow — proposal row, plan holds 7:30 until the other party's "confirm 8 PM", then plan + list + thread projections all read 8:00 PM |
| 7 | Maya thread: "yes confirm" → "Locked in — Saturday 10:30 market, 12 coast drive" (worked) | Preserved — the lead direct-change path is a regression test, not a casualty | `repair17_w4_flows_test.exs` lead direct-change regression |
| 8 | Center: birthday planning for Maya; "Dave and Busters near me" names "shouldn't have to be perfect… it should create a search" | F17-11: fuzzy named-venue search; location gate cannot block a named search | `repair17_w4_flows_test.exs` item 5: extraction, fuzzy match, end-to-end `exact_entity` search job, no category question |
| 9 | "It says… food outdoors or nightlife… I typed in food… why is it losing continuity… 'you mentioned Maya earlier'" | F17-08: outstanding-question state; the answer is consumed in flow; the re-engagement guard cannot fire on an answer turn | `repair17_w4_flows_test.exs` item 2: the founder's exact sequence, asserting no re-engagement line and the flow continuing on Maya's birthday |
| 10 | "I typed in yes and it says done Nighthawk with Maya is set up… I didn't ask anything about Nighthawk" | F17-09: a bare yes binds only to the currently outstanding ask; an intervening turn closes old asks | `repair17_w4_flows_test.exs` item 3: derailment sequence creates no plan, no "is set up" copy |
| 11 | "Schedule a date night with Chanelle tonight 5 PM Oceanside Italian" → "Updated tonight 5 PM same plan same people" (no completion) | F17-10: new-plan requests excluded from the when-correction branch; PlanCompletion drives the new plan | `repair17_w4_flows_test.exs` item 4: new plan row created, old plan untouched, completion steps persisted |
| 12 | "If I wanted to clear the chat with Opal how come it's not clearing… we should have new chats the same way Muse has" | F17-13: real backend sessions (new/list/switch/clear), drawer UI, server-first honest clear | `repair17_w4_api_test.exs` (HTTP incl. cross-account 404) + `opalChatSessions.test.tsx` (14) |
| 13 | "Inside of the Opal center where it says… 3:30 7:30 — that's supposed to be dynamic with real events" | F17-12: `Center.NowStrip` live plan projection merged into calendar/today; web renders real plans or honest empty state | NowStrip/controller tests; web strip tests incl. empty state |
| 14 | "Fix our settings, add to them, take away whatever we gotta do" (per the Muse reference he shared) | SETTINGS_MAP continuation: YOU hub search over real destinations; connected-sources "last checked" from real `last_synced_at`; backend-gated items stay unpainted (R13 standard) | `youHubSearch` + settings suites green; dispositions in TRACK_W5_SURFACES.md |
| 15 | Addendum: "the center character… static image" — must be alive | F17-15: presence quartet derived from real signals only; stuck states unwound; calm motion + reduced-motion | `opalPresence.test.tsx` (20) incl. fuzz — no signal ⇒ never thinking/listening/responding |
| 16 | Addendum: splash-1 logo text "not the logo text that I was looking for" | F17-14: canon `opal-logo` lockup on both splash-1 paths; Splash-2 'Enter Opal' exactly-once pinned | `splashCanonLockup.test.ts` (6) |
| 17 | Addendum: TestFlight as the acceptance surface | F17-16: repo-side prep complete (`TESTFLIGHT_STEPS.md`); mobile suite 105/105 | Mobile suite; steps doc separates prepared vs founder-only |

## The meta-finding, in his terms
"I should have never had to go into anything that was broken" — the
repairs were real but his walk ran a scripted demo layer that bypassed
them (F17-01). That layer no longer exists: with the seed flag on, the
app provisions real backend data and every send/open/confirm runs the
same code as production. The acceptance tests above drive the backend
flows and the web send path his phone executes — not a parallel harness.
