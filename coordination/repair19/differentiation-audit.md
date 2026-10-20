# Repair #19 — Wave W23: Differentiation-Legibility Audit

**Persona:** an investor with Meta Muse open in the other hand, asking
*"where are the relationships, and how do people identify them?"*
**Build audited:** `muse/r19-diff` @ `9a0a1be4ca892cb66957cab94156d154994e8a39`
(final merged build), worktree `~/workspace/opal-graph/wt-r19-diff`.
**Method:** served build walked live — fresh Postgres DB `opal_dev_r19diff`
(113 migrations, clean), Phoenix from this tip on `:4123`
(`OPAL_PHONE_VERIFY_MODE=synthetic_development`), web bundle built from this
worktree (`npm run build`; the page itself stamped
`data-git-head-full = 9a0a1be4…` and the dev chip `seed · 9a0a1be`, read back
from the rendered DOM), headless Chromium at 390×844, dark mode, human seed
world (founder seed comm 200 / graph 200). Accounts: Ethan Walker (viewer),
Maya Torres (second account), plus a fresh unseeded account for the cold hold.
Relationship types were set through the product's own HTTP API
(`PUT /api/v1/product/relationships/:id`) because — see DL-01 — the served
app offers no other way. Evidence: `diff-audit-shots/` beside this file
(screenshots + the three walk-result JSONs with full rendered text per
surface). Audit only: no application code, ledger, or acceptance file was
edited.

---

## Verdicts (one paragraph each)

**Identification verdict.** Opal's relationship machinery is real and deep
in the backend — a 7-type taxonomy (`spouse, partner, family, close_friend,
friend, business, acquaintance`), a family-subtype dimension with a minor
flag, communication bounds, tone/nudge gating, check-in circle resolution,
and close-circle audience gating all exist and work — but in the app an
investor can hold, **a user cannot say who anyone is to them, anywhere.**
The served C2 shell contains no control that sets or changes a relationship
type: no picker on person-add, none in the thread, none on the profile,
none in You. The one editable picker that exists in the codebase
("How do you know {name}?", `GraphProfilePage`) lives in the legacy
`OpalApp` shell that `App.tsx` no longer mounts. Types enter the product
only silently (invite join auto-writes `"friend"` on both sides; the seed
writes one `close_friend`) or by API call. Family subtype is worse: it has
**no HTTP endpoint at all** — the one controller that could carry it drops
the field silently (verified live: `PUT {type:"family",
family_subtype:"sibling"}` returned 200 with `family_subtype: null`), and
the web client's relationship contracts do not contain the field. And a
type that *is* set renders in exactly **one** place — a single line on the
person profile sheet, reached by tapping a thread avatar — where it is
spelled with the plural group grammar ("Partners", "Close friends") for a
single person. Everywhere else the investor looks — chats list, thread
header, Home, Center, Graphs roster, Orbit sheet — the tie is invisible
and people appear as names, initials, and anonymous counts ("4 of 4
going"). A relationship layer that exists in data but cannot be set and
barely renders is, to anyone benchmarking against Muse in the other hand,
indistinguishable from no relationship layer.

**First-minutes verdict.** The first 30 seconds are genuinely Opal's:
Splash 1 ("REAL PEOPLE. REAL PLANS. / Your people. Your plans. One
place.") and Splash 2 ("Opal turns talk into a time, a place, and your
people", convergence into a Happening plan card) state the relationship +
shared-plans thesis in words. From minute one the thesis evaporates:
onboarding is phone → code → your own name and never asks who anyone else
is; the fresh account lands on a Center whose loudest affordances are an
orb and "Talk to Opal" above an empty deck — the single most
Muse-shaped screen in the product — followed by an Instagram-shaped
story rail ("Your story / Add / Nothing here yet"), a messenger-shaped
Chats list whose "+ New" picker dead-ends at "No one connected yet"
(with no invite path offered), and a "Your Graphs" surface whose key noun
is never explained. At no point in five cold minutes does the app make
perceivable that people have identities *relative to you*, or that the
graph is an organizing principle rather than a synonym for "plans". The
differentiation is in the deck physics once real plans exist (Needs you /
Next together / state families — that part reads as its own thing); the
relationship identification layer contributes nothing to the first five
minutes because, per Part 1, it is not in the app.

---

## PART 1 — Relationship identification, end to end

### 1.0 What the product actually carries (source-verified)

| Layer | What exists | Where |
|---|---|---|
| Type taxonomy | Exactly 7: `spouse, partner, family, close_friend, friend, business, acquaintance` | `relationships/relationship_type.ex` (`@allowed_types`), `Relationships.allowed_types/0` |
| Write path (domain) | `Relationships.set_type/3,4` — upsert per (user, contact), fills `communication_bounds` defaults per type, syncs `PersonMemory.relationship_type` | `relationships.ex:23` |
| Family subtype | 8 slugs (`parent, child, sibling, grandparent, aunt_uncle, cousin, niece_nephew, co_parent`) + `family_minor` flag; valid only under `type == "family"`; drives Behavior dials + minor nudge restraint + check-in target filtering | `relationships/family_subtype.ex`, `relationships.ex: set_family_subtype/4`, `social_flow/checkin.ex:417,477` |
| Write path (HTTP) | `GET /api/v1/product/relationships` (rows + contacts + allowed_types), `PUT /api/v1/product/relationships/:contact_user_id` (**type + bounds only**) | `relationship_controller.ex`, `router.ex:455-456` |
| Family subtype (HTTP) | **Nothing.** No route, no controller handling; the web client's `RelationshipContact`/`RelationshipRow` types have no `family_subtype`/`family_minor` field (the backend contract *does* return them — the client drops them by omission) | grep: zero hits for `family_subtype` under `opal_core_web/`; `productClient.ts` relationship types at ~L3985-4045 |
| Closeness / circle | **No closeness score anywhere, by explicit design** ("Explicit user-set types only. No auto-detection. No closeness scores." — `relationships.ex` moduledoc; hard ban repeated in `conversation_moment_bridge.ex`). The only closeness-shaped constructs: the `close_friend` tier itself, and the backend `close_circle` audience (`spouse/partner/family/close_friend`) gating Lives visibility (`lives.ex:25,315`) and story/live audiences in legacy UI code | as cited |
| Behavior engine | Type (+ subtype) drives tone, planning style, lead times, nudge caps, mediation/invite/split copy, attention budget | `relationships/behavior.ex`, `access.ex`, `intelligence/attention_budget.ex`, `invites.ex` |
| Inference | Provisional type inference + one-time prompt *"I think of {name} as a {type} — right?"*, exposed via Intelligence `ProductSurface.memory_transparency/1` | `relationships/inference.ex`, `intelligence/product_surface.ex:64` — **no served-shell caller** (zero hits in `apps/opal_web/src/c2`) |
| Auto-writes | Invite join and personal-code redeem silently `set_type(..., "friend")` both directions — the only in-product moment a type is ever created for a normal user | `invites.ex:253-254`, `invites/personal_codes.ex:177-178` |
| Contacts universe | `contacts_with_types/1` = peers from **active `RelationshipEstablishment` rows** ∪ already-typed contacts. Conversations do **not** confer membership | `relationships.ex: connected_peer_ids/1` (verified live, §1.2) |

### 1.1 The identification walk (served build, cold start)

Task attempted at each step: *add/find a person and say who they are to
you — type, family subtype where relevant, closeness/circle.*

| # | Action (moment of need) | Affordance exists? | Taps | Words the product uses | Result |
|---|---|---|---|---|---|
| 1 | Onboarding / first run: name your people | **No** | — | Onboarding is exactly 3 steps: "Start with your phone." → "Enter the code." → "This is you. / A name helps your people find you." (name + optional username). No person is ever asked about | No identification moment exists at entry |
| 2 | Chats → **+ New** (the person-add moment) | **Broken** | 2 (Chats, + New) | Sheet title "Start a chat"; body: **"No one connected yet. People you connect with will show up here."** — on an account with 10 live conversations and 8 seeded people. No search field, no invite action inside the picker | Dead end. Root: picker reads `GET /people` → `connected: []` (establishment-only), while the chats list reads conversations. Two different "my people" universes (DL-04, DL-08) |
| 3 | Find a person via Search | Partial | Search → type name | People hits resolve to conversation peers (name only). Opening one leads to the thread; no identification step on the way | Person found; who they are to you: never asked |
| 4 | First thread with a person | **No** | — | Header shows name + a sub-line that *duplicates the peer's name* (rendered: "Chanelle Brooks / Chanelle Brooks" — `sharedLine` = peers' names). Below: "NEXT TOGETHER" strip, "Talk to Opal about this plan", "Opal chats about {name}" | The header's one sub-line — the natural home for "Family · sister" — is spent repeating the name (DL-14) |
| 5 | Person profile (tap thread avatar) | **Display only** | 1 from thread | Sheet: avatar, name, `@handle`, one relationship line *if a type already exists*, "Next together", buttons "Message" / "What Opal remembers" / "Done". No edit control, no "How do you know…?" prompt, no subtype, no circle | You can *read* a type you cannot set (DL-01). Untyped person (Sabrina): the line renders nothing — honest, but there is no "Set" doorway either |
| 6 | Plan invite / Graphs detail → **Add people** | **Dead button** | 1 | "Add people" renders on every graph detail; in the served shell it is wired `addPeople: () => undefined` (`C2Shell.tsx:669,780`) — tap produces no sheet, no picker, no error (verified live: DOM identical after tap) | The plan moment of need neither adds nor identifies anyone (DL-07) |
| 7 | Create flow ("Make something happen" / New plan) | **No people step at all** | — | Form is title / when / where only ("A time, a place, your people." as a headline — but no people field exists in the form; participants only arrive via shelf-starter prefill) | A plan can be created with nobody on it and nobody identified |
| 8 | You hub (looking for a People / Relationships room) | **No such room** | — | You index: Edit profile, Your moments, Your library, Appearance, Soul, Memory, What Opal remembers, How Opal helps, Opal Assist and calls, Activity, What Opal graphs, Connections, Connected sources, Quiet, Privacy, Linked devices, Location and travel, Care and household, Account and security, Saved logins, Your invite code, Delete…, Help & support. "Your invite code — Share it — anyone who joins is connected with you" is the only people-management entry, buried in Care and account | There is no surface whose job is "your people and who they are" (DL-10) |
| 9 | Settings → Graphing standing permission (legacy `YouSettingsDestination`) | Exists **in unmounted code only** | — | Lists people with `relationshipTypeLabel(p.type)` for call-graphing opt-in — still no type *editing*. This component is mounted only by `OpalApp.tsx`, which `App.tsx` does not render | Even the legacy shell never offered type editing here |
| 10 | **API** (the path that actually works) | Yes — API only | n/a (HTTP) | `PUT /relationships/:id {type}` → 200, bounds defaults filled (`partner` → daily/spontaneous/warm). `PUT` with `family_subtype` → **200 with the field silently dropped** (`family_subtype: null` in the response) | Type: settable by API. Subtype: **settable by nothing outside Elixir** (DL-02) |
| 11 | Invite join (the silent path) | Automatic, invisible | 0 | No copy names it; both sides become `"friend"` | The product *does* identify people — once, silently, always as "friend", never shown at the moment it happens |

**Taps-to-identify summary:** in the served app the count is not "many
taps" — it is **∞ (no path)** for type, subtype, and closeness alike. The
only in-code editor ("How do you know {name}?" with the 7 options,
`GraphProfilePage.tsx` + `RELATIONSHIP_TYPE_OPTIONS`) is reachable only
through `OpalApp.tsx`, which the served entry (`App.tsx` → `C2Shell`
unconditionally, W15) never mounts.

### 1.2 The contacts-universe discrepancy (live API evidence)

On the freshly seeded viewer account, `GET /relationships` returned
**contacts = [Maya Torres] only** — the one person the seed itself typed
(W21 ABS-1 leg, `human_seed_world.ex:200`, typed solely so an Opal
proposal could resolve). Chanelle, Jordan, Sabrina, Alex, Nina, Priya and
Marcus — all with live conversations and shared plans — were **absent**
from the contacts list because `connected_peer_ids/1` reads
`RelationshipEstablishment` rows, not conversations. Typing Chanelle and
Jordan by their raw conversation-peer ids succeeded (the write path does
not check establishment), after which the contacts list grew to 3. So the
API index a client would use to *offer* identification cannot see most of
the people the user actually talks to (DL-08).

### 1.3 Does it show? — renders-where matrix

Setup: Maya = `close_friend` (seed), Chanelle = `family` (API, subtype
attempted and dropped), Jordan = `partner` (API), Sabrina = untyped.
All cells are rendered evidence from the served build unless marked
*(source)*.

| Surface | What renders for the tie | Verdict |
|---|---|---|
| Person **profile** (C2 `PersonProfileSheet`) | One line under name/handle: Maya → **"Close friends"**, Chanelle → **"Family"**, Jordan → **"Partners"**, Sabrina → *(nothing — element absent)* | **Renders — the only place.** Human words, no raw slug (unknown types render no label at all, `C1ShellHosts` adapter). But grammar is the *group* plural for one person (DL-03/DL-12), and no subtype can ever appear (`PersonProfileProjection` has a single `relationshipLabel` string, built from `type` only) |
| **Chats list** rows | Name, preview, time, plan-awareness card. **No relationship label on any row** — for Partner, Family, and Close friend alike | **Not rendered** |
| Chats list footer — "Your circles" | Group headers "Partners" / "Family" / "Close Friends", each above an identical check-in row: "Check in with everyone". No member named; the row is a check-in sweep control, not a circle roster | **Renders as group label only** — the type names a *check-in bucket*, and "circles" here means sweeps, not closeness (DL-09) |
| **Thread header / context** | Name; sub-line = peers' names repeated; Next Together strip names the *plan*, never the tie. No type anywhere in the thread, including its check-in bar | **Not rendered** |
| **Graphs list** cards | State, title, when/where, "4 of 4 going". People element absent on list cards (probe: `c2-plan-people` null on all 7 cards); attendance is a count, not people | **Not rendered** (people are anonymous counts) |
| **Graph detail** — roster | Section "WHO IS COMING, AND WHERE THEY ARE": rows = avatar, name, "Going · Not sharing location". Jordan (Partner), Maya (Close friend), Chanelle (Family) all render identically. *(Source concurs: `GraphDetailProjection.who` = {name, avatar, responseLabel, locationLabel} — no relationship field exists to render.)* | **Not rendered** — the plan roster never says who is whose what (DL-06) |
| Graph detail — share card / event card | People line is a name list ("Maya, Jordan + 2 more" grammar) *(source: `EventShareCardProjection.peopleLine`)*; no ties | **Not rendered** |
| **ORBIT** header / sheet | Title = person's name; sub = "Plans and Opal conversations about this person. Opal chats live here, never in your chat thread with them."; sections PLANS / OPAL CONVERSATIONS. Chanelle's orbit, opened *after* she was set to Family, shows no "Family" anywhere | **Not rendered** — the surface named for a person's orbit carries no relationship identity |
| **HOME** cards | Author name ("Maya Torres"), plan state, title, "2 of 6 going". No relationship cue on any card, including the Partner's and the Family member's plans | **Not rendered** |
| **Center** deck (opening) | "Next together — Saturday morning at Oceanside Farmers Market — Oceanside Farmers Market · 2 of 6 going"; Needs-you cards name plans, not people; no tie anywhere | **Not rendered** |
| **Center chat** | Header "Chat with Opal"; the seeded person-scoped session renders as "Thank-you note help" with no person/tie anchor in the header. Scoped doorways from threads ("Opal chats about Maya Torres") name the person but never the tie | **Not rendered** |
| **New-chat picker** | No rows at all (DL-04) — nothing to render a tie on | **Absent surface** |
| Legacy surfaces (not served) | `GraphProfilePage` (unmounted): editable type + singular labels. Founder fixtures (seed-gated, not served data): "Fiancée", "Close friend", "Neighbor" labels in `founderChatsPlanPills.ts` / `founderGraphSeed.ts` | The *richest* relationship rendering in the repo is fixture + dead code — a code-search reads as if identification were handled (DL-10) |

**Raw-schema check:** no surface rendered a raw slug (`close_friend`,
`family_subtype`, …) — the adapter layer correctly maps known types to
finished words and unknown types to nothing. The failure is absence, not
leakage.

---

## PART 2 — First-minutes test (cold hold)

Fresh account, no guidance, no seed, served build, 390×844. (Signed-in
leg uses the harness-provisioned fresh account exactly as the pack recipe
provisions reviewers; the anonymous leg typed nothing and followed the
app's own entry path.)

| Clock | Surface | What the app itself communicates | Reading |
|---|---|---|---|
| 0:00 | Splash 1 | Full-bleed orb master, living rings, points of light. "REAL PEOPLE. REAL PLANS." / "Your people. Your plans. One place." / Continue | **(a) perceivable — in words.** Relationships + plans are the headline promise. The orb reads as beauty/brand, not yet as "people as points" — nothing names that reading |
| 0:30 | Splash 2 | Chat chips converge ("Anyone free tonight?" "Count me in") into a Happening plan card (Rooftop Jazz, Tonight 8 PM, 12 going). "Your social life, already in motion. TALK. ALIGN. GO. Opal turns talk into a time, a place, and your people. Less coordinating. More living." / Enter Opal | **(a) again, strongest form:** talk → plan with your people. **(b) not yet:** convergence is shown as chat bubbles, not as a graph; "12 going" are strangers' initials |
| 1:00 | Onboarding — Phone | "Step 1 of 3 — Start with your phone. Keeps your account yours. That is it." | Generic auth. **Clone-risk moment #1:** indistinguishable from any app's OTP screen |
| ~1:45 | Onboarding — Verify | "Enter the code. We sent it to {phone}." | Generic auth |
| ~2:15 | Onboarding — Meet Opal | "This is you. A name helps your people find you." Name + optional username; "Photo comes later, when you want it." → "Looks good" | The only "people" word in onboarding is about *you* being findable. **Nobody is added, nobody is identified, no invite is offered.** The 60-second law is met by omitting the product's thesis |
| ~3:00 | **Center (landing)** | Orb, "Good evening." + "Make something happen" / "Talk to Opal" / "How Opal works for you" / "Nothing needs you right now. It is all yours." Dock: Home · Chats · (orb) · Graphs · You | **Clone-risk moment #2 — the peak.** Orb + Talk-to-Opal + empty calm = an AI assistant's home screen. With Muse in the other hand, this screen *is* the clone comparison, and nothing on it says "relationships". (Note: no "People" destination exists in the dock at all) |
| ~3:30 | Home | Story rail: "Your story / Add". "Nothing here yet. Posts from your people and your plans will show up here." | **Clone-risk moment #3:** Instagram grammar (stories + feed) with zero people in it. (a) survives only as the phrase "your people" in an empty-state sentence |
| ~4:00 | Chats | "Chats / + New / Chats · Calls / No chats yet. Start a chat." → tap + New → **"No one connected yet. People you connect with will show up here."** [Cancel] | **Clone-risk moment #4 + functional dead end.** A messenger with no way to reach anyone: the picker offers no search, no contacts, no invite. The relationship product cannot be *started* from its own first run |
| ~4:30 | Graphs | "Your Graphs / All 0 · Action 0 · Ready 0 · Past 0 / Nothing here yet. Your plans will live here. / New plan" + Private graphs (passcode) + "INTENTIONS — The rhythm you are keeping with your people, in your words." + Working toward + Someday shelf | "Graphs" is the organizing noun and is never explained; cold, it reads as *plans/charts*, not as futures-with-people. **(b) not perceivable:** nothing shows people as points, orbits, or ties. The Intentions line is the one sentence gesturing at relationship rhythm |
| ~5:00 | You | A long settings index (Soul, Memory, What Opal remembers, …, Care and household, …, Your invite code). No People/Relationships room | The tour ends in settings. After five minutes the user has been told the product is about "your people" four times in copy and has **met no people, named no relationship, and seen no graph** |

**Where (a) becomes perceivable:** at 0:00–0:30, by *assertion* (splash
copy), and again only when real data exists: in the seeded world the
Center deck (Needs you / Next together / state-tinted plan cards with
counts) does read as a shared-plans product rather than a chat app. But
*identification* — that these people are somebody *to you* — never
becomes perceivable at any minute, cold or seeded, because the surfaces
never render it (Part 1).

**Where (b) becomes perceivable:** never in the first five minutes. The
orb's points of light are nowhere glossed as people; "orbit" appears only
deep inside a thread doorway ("Opal chats about {name}" → Orbit sheet)
and even there it means "Opal chats filed under this person", with no
tie, no circle, no graph geometry. Graphs-as-futures is carried by plan
*states* (Forming/Ready/Happening), which a cold user meets as zeros.

**Named clone-risk moments:** onboarding OTP (generic auth) · Center
landing (generic AI-assistant home — highest risk, it is the default
route) · Home story rail (generic social feed) · Chats + dead picker
(generic messenger, minus the people).

---

## PART 3 — Findings register

Severity: **investor-visible** = an investor/user holding the app sees
 the gap in the first session; **coherence** = the product contradicts
its own data/contracts across surfaces; **polish** = wording/grammar-level.

### Investor-visible

**DL-01 — No relationship-identification affordance exists in the served
app.** The C2 shell (the only shell `App.tsx` mounts) contains zero calls
to `setRelationshipType` and no type-picker component; the profile sheet
is display-only. The working editor ("How do you know {name}?",
`GraphProfilePage` + `RELATIONSHIP_TYPE_OPTIONS`) is mounted only by the
unmounted legacy `OpalApp`. Types are created only by API, by seed, or
silently by invite-join.
*FIX scope:* mount a type editor in the served shell at the moments of
need — (i) `PersonProfileSheet`: make the relationship line tappable,
opening the 7-option picker (reuse `RELATIONSHIP_TYPE_OPTIONS` +
`setRelationshipType`, both already client-side); (ii) first-thread /
person-add: one optional "How do you know {name}?" row. One wave, web
only; backend already supports the write.

**DL-02 — Family subtype is unreachable: no HTTP endpoint, no client
field, silent drop.** `Relationships.set_family_subtype/4` and the
contract fields exist backend-side, but no route/controller exposes
them; `RelationshipController.upsert` reads only `type`/`bounds`, so a
`family_subtype` param returns 200 with `family_subtype: null` (verified
live). Web `RelationshipContact`/`RelationshipRow` omit the fields, and
`PersonProfileProjection` cannot carry a subtype. "Family — sister" is
therefore unrepresentable end-to-end despite a designed taxonomy
(Repair #15 Track B).
*FIX scope:* extend `PUT /relationships/:id` (or add
`PUT /relationships/:id/family-subtype`) to accept
`family_subtype`/`family_minor` via `set_family_subtype/4`; add the
fields to the web contracts + profile projection; render "Family ·
Sister" on the profile (and a subtype step in the DL-01 picker when
Family is chosen). Backend + web, additive.

**DL-03 — A set type renders in exactly one place.** Profile line only.
Chats rows, thread header, Home cards, Center deck/chat, Graphs list and
detail, and the Orbit sheet all render nothing (matrix §1.3, all
live-verified with Partner/Family/Close-friend types set). The backend
spends real machinery on types (tone, nudges, gating) that the user can
never see, so the differentiation is invisible at the glass.
*FIX scope:* carry the finished label through the projections that
already exist — thread header sub-line (replacing the duplicated name,
DL-14), `GraphDetailProjection.who[]` (add `relationshipLabel`), plan
card people line, Orbit sheet header. One adapter change per surface;
all data already server-held (`listRelationships` is already fetched by
ChatsHost and CenterHost).

**DL-04 — The person-add moment is a dead end: "+ New" picker says "No
one connected yet" on a fully populated account.** Picker reads
`GET /people.connected` (establishment-only → `[]` for the seed world)
while every other surface reads conversations. A new user meets this in
minute ~4 with no invite/search fallback inside the sheet.
*FIX scope:* feed the picker from the conversation-peer universe (the
same peers ChatsHost already holds) unioned with `connected`; or make
`/people.connected` include conversation peers. Add an "Invite someone"
row to the picker sheet (the invite-code machinery already exists in
You). Until fixed this is also a first-run blocker, not just a label gap.

**DL-05 — First run never asks who anyone is, and lands on the most
generic screen in the product.** Onboarding (phone/code/name) contains
no people step; the landing route is Center, whose fresh state is orb +
"Talk to Opal" + empty deck. Judged against the identity bar (W5-28 —
Opal's own physics should carry the difference), the first-minutes
physics here are *chat-assistant* physics.
*FIX scope (choose, founder call):* (i) a deferrable post-Meet-Opal step
"Who's in your world?" — invite code share + optional first-person add
with the DL-01 picker; or (ii) land fresh accounts on a people-first
empty state that teaches adding a person (not an empty deck). Either
must respect the 60-second law: one skippable screen.

**DL-06 — The graph never names the tie between people on a plan.**
Graph detail's roster ("WHO IS COMING, AND WHERE THEY ARE") renders
name + response + location-sharing state only; the projection type has
no field for a tie, so a Partner, a sister, and a work contact are
interchangeable rows. Graphs list cards reduce people to counts
("4 of 4 going").
*FIX scope:* as DL-03's roster leg — `who[].relationshipLabel` from the
viewer's relationship rows, rendered as a quiet sub-line ("Maya Torres ·
Close friend"); list-card people line already exists in `PlanCardC2`
(`peopleLine`) — populate it on Graphs list cards with names, not only
counts.

### Coherence

**DL-07 — "Add people" on graph detail is a no-op in the served shell.**
Rendered on every detail; wired `addPeople: () => undefined` in
`C2Shell.tsx` (both mount sites). Tap = nothing (live-verified). A dead
control at the plan-invite moment of need.
*FIX scope:* wire it to a real people picker over conversation peers
(the DL-04 picker, fixed) that calls the existing participant-add path;
if that path does not exist server-side, this becomes a named backend
gap for the coordinator — do not re-ship the button unwired.

**DL-08 — Three different answers to "who are my people?"**
Conversations know 8 peers; `GET /relationships.contacts` knows 1
(establishments ∪ typed); `GET /people.connected` knows 0. The
identification index cannot see the user's actual interlocutors, so any
future "label your people" UI built on `contacts_with_types` would omit
most of them.
*FIX scope:* one contacts universe: `connected_peer_ids/1` should union
conversation peers (and plan participants) with establishments, or a
new `People` index should be the single source all three endpoints
project from. Backend, with a coherence test pinning the three lists
equal for a seeded world.

**DL-09 — "Circles" in the UI does not mean closeness; closeness itself
has no UI.** The only rendered "circles" are check-in sweep groups
("Your circles → Partners / Family / Close Friends → Check in with
everyone") — identical rows, members unnamed, purpose (a check-in) not
stated by the label. Meanwhile the backend's real closeness construct,
the `close_circle` audience (type-gated in `Lives`), never surfaces in
the C2 shell: the served story composer posts with `visibility:
"friends"` and offers no close-circle choice. And per design there is no
closeness score at all — `close_friend` vs `friend` is the whole
gradient, invisible except on the profile line.
*FIX scope:* rename or re-caption the check-in groups ("Check-in
circles" + member names on the row), and surface the close-circle
audience in the C2 story/live composer using the existing backend
vocabulary. No new closeness machinery — the finding is legibility of
what exists. (The no-scores design itself is recorded as a **named
exception**: intentional product law in `relationships.ex`, not a gap.)

**DL-10 — The product's nouns hide the relationship layer, and the
richest relationship UI is dead code.** Served dock: Home · Chats ·
(Opal) · Graphs · You — no People/Relationships destination or noun
(the legacy dock had People). The verbs that do exist fragment by
layer: API "contacts/connected", UI prose "people", check-ins
"circles", settings "relationships" (only in unmounted code). A
codebase tour (or an investor's technical diligence) finds
`GraphProfilePage`, founder fixtures with "Fiancée/Neighbor" labels, and
a Graphing people list — and concludes identification is handled; none
of it is served.
*FIX scope:* coordinator decision — either promote one served People
surface (Chats list header already says "people" in its search
placeholder; a People room in You is the cheapest honest version) or
explicitly retire the unmounted editors/fixtures from the "current
product" story. At minimum, the pack/walk materials should stop citing
fixture labels as product behavior.

**DL-11 — The one proactive identification moment never renders.**
`Relationships.Inference` can ask "I think of Maya as a close friend —
right?" (one-time, dismissible, shame-free by design) and
`ProductSurface.memory_transparency/1` exposes it — but no served
surface calls it: zero references in `apps/opal_web/src/c2`. The
designed "Opal notices who someone is to you" beat is backend-only.
*FIX scope:* surface the pending prompt in the C2 Memory room ("What
Opal remembers", already routed from the person profile) with
confirm/correct/dismiss wired to the existing endpoints — or formally
retire the inference path so the backend stops maintaining an
unrenderable feature.

### Polish

**DL-12 — Profile relationship label uses plural group grammar for one
person, from a duplicated label map.** Rendered: Jordan → "Partners",
Maya → "Close friends" on their *person* profiles. Cause: the C2
adapter's `RELATIONSHIP_TYPE_LABELS` in `C1ShellHosts.tsx`
(`partner: "Partners"`, `business: "Work"`, …) is a group-header map
reused for the singular profile projection, while
`opalUi/relationshipTypes.ts` already holds the correct singular map
("Partner", "Close friend", "Business") used by dead code. Two sources
of truth for the product's most identity-bearing words.
*FIX scope:* profile projection uses the singular map; keep the plural
map for circle group headers only; add a test pinning both.

**DL-13 — Even the demo world cannot show the relationship layer.**
The human seed world types exactly 1 of 8 people (Maya, `close_friend`,
added for ABS-1 proposal plumbing per `human_seed_world.ex`), and zero
family/partner/spouse — so a reviewer walking the seeded build sees at
most one circle header and one profile line, and could reasonably
conclude types are a one-off. (This audit had to API-set Partner +
Family to even exercise the rendering.)
*FIX scope:* seed a small typed mix through the same `set_type` path
(e.g. Chanelle `partner` or `family`+subtype once DL-02 lands, one
`friend`, one `business`) so the pack world demonstrates the layer the
product claims. Seed-only change.

**DL-14 — Thread header spends its one sub-line repeating the person's
name.** Rendered "Chanelle Brooks / Chanelle Brooks" (name +
`sharedLine` of peer names). In a 1:1 thread the sub-line carries zero
information; it is the exact slot where a tie ("Family", "Partner ·
since the invite", next-plan fact) belongs.
*FIX scope:* fold into DL-03: 1:1 thread sub-line = relationship label
when set, else the existing plan/shared line; group threads keep the
peer-names line.

---

## Appendix — what is genuinely strong (not findings)

- **Backend depth is real:** bounds/tone/lead-time/nudge gating per type
  and subtype, minor restraint, check-in circle resolution incl. subtype
  filter, close-circle audience gating in Lives, attention budget,
  PersonMemory sync. An investor's *technical* diligence will find a
  relationship engine; the failure is strictly that the glass neither
  sets nor shows it.
- **No raw schema ever reaches the glass:** unknown types render no
  label rather than a slug; untyped people render honest absence.
- **The plan-state physics differentiates:** in the seeded world the
  Center deck (Needs you / Next together / Taking shape, state-tinted
  cards) does not read as Muse or as a messenger. The clone risk is
  concentrated in the *fresh* first minutes and in every people-bearing
  surface's silence about ties.
- **Splash copy already says the thesis** ("Your people. Your plans.
  One place." / "a time, a place, and your people"). The product's words
  promise exactly the layer its surfaces don't deliver — which is why
  the fix is mostly *wiring existing machinery to the glass* (DL-01,
  DL-02, DL-03), not new invention.

## Method notes / limits

- Served web was the audit target (the pack recipe's stack). The native
  mobile app was not walked; if it mounts `OpalApp`-family surfaces, its
  identification story may differ and should be audited separately.
- One automation artifact, disclosed: a sibling wave's Vite preview was
  already bound to the local web port; it serves the **identical tip**
  (`wt-r19-account` HEAD = `9a0a1be4…`, same final merged build), and all
  data, seeding, and API mutations in this walk ran against this audit's
  own backend/DB on `:4123` — their effects (new circle groups, profile
  labels) rendered live in the walk, and the in-page build stamp read
  back `9a0a1be4…`. The bundle this audit built from `wt-r19-diff`
  carries the same stamp.
- Screenshots + full rendered-text JSON: `diff-audit-shots/` beside this
  file. Stack torn down and the audit worktree left clean after the walk.
