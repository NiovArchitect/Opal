# Orbit v2 Report - Repair #20 amendment wave (Cluster CC, backend)

Branch: muse/r20a-orbitbe (base 8bf9186b).
Scope of this report: the Sameness Test and the assembly fix it
forced, Orbit Projection v2, the bidirectional-law investigation,
the self-mirror, and the standing product law recorded for Orbit.
Plain hyphens only; no destructive migrations; no frontend files
touched.

## 1. The Orbit Ethics Constitution (founder, 2026-10-20 08:25 PDT)

Recorded verbatim in substance; these articles govern every Orbit
surface and every Orbit answer:

1. NO FABRICATED FEELINGS - Orbit never invents a sentiment the
   asker does not hold; it may ASK ("do you miss her?") but never
   asserts one into a draft.
2. NO MANIPULATION CRAFT - Orbit refuses to help engineer guilt,
   jealousy, deception, or control; refusal is kind and plain, and
   offers the honest version instead.
3. THE SELF-MIRROR - Orbit usage is visible to the user themselves
   in their own activity (a mirror, never a lock, QUIET): a person
   can see if they have leaned on Orbit for nearly every message
   to someone.
4. FADING SCAFFOLD (design direction, intelligence phase): Orbit
   coaches, it does not ghostwrite forever - it increasingly shows
   its reasoning so the user internalizes the moves; success =
   needing Orbit less for that relationship, not more.
5. Standing: no auto-send EVER; drafts anchored in the asker's real
   scoped context.

## 2. Orbit Law 3 - the Truth of Misalignment (founder, 2026-10-20 08:39 PDT)

Summarized faithfully:

- Orbit's deepest use is conflict; "where we're at" names
  misalignment honestly.
- Help = the asker's truth expressed RECEIVABLY: kind delivery,
  UNDILUTED content. The "kind version" in the escalation guard
  means kind delivery of the undiluted truth, not a softened truth.
- Orbit is NOT a therapist: no diagnosis, no treatment framing,
  no side-taking against the absent partner; the partner's
  dignity is held.
- The aim is alignment between two authentic people - never
  compliance, performance, or manufactured harmony.

Projection v2 carries this law in one concrete place: the
where_lines of the orbit projection name a presented fork and a
window that closed unanswered in plain words, with no smoothing
language (see section 5).

## 3. Orbit Law 2 and the Sameness Test (Part 1)

### The law

Founder, 2026-10-20 08:15 PDT, verbatim in substance: "If multiple
people were having the same conversation with the same person and
they opened Orbit, and all their answers from Opal's Orbit are the
same, then Orbit didn't work." Every asker's help must differ
because every asker converses with that person differently. Root
cause by design: Orbit's answers assemble from the ASKER'S OWN
scoped context (their capsules about this person, their dyadic
history, their relationship type/tone, their Soul) - never a shared
template, never the partner's context.

Product law recorded alongside: no rote/template relational
answers - answers assemble from the asker's own scoped context
(Law 2).

### The proof

New standing test:
apps/opal_core/test/opal_core/social_flow/orbit_sameness_test.exs
(module OpalCore.SocialFlow.OrbitSamenessTest). It joins the
two-account isolation proofs (the W-GAP-32 suite) as a standing
regression species.

Design: two asker accounts A and B, one shared partner P. Each
asker holds a real dyad conversation with P (real Conversation,
ConversationMember, and Message rows) with different history;
different distilled dyadic memory per asker (PersonMemory
known_facts and behavior_override notes, per-asker
ConversationIndex rolling summaries); different relationship
records through the real machinery (Relationships.set_type/4,
which syncs PersonMemory.relationship_type read by recall - A-P is
close_friend, B-P is business, so the seeded
relationship-behavior-profile tones differ: warm_casual vs
friendly_respectful); different personal-memory capsules per asker
through the real capsule write leg, both conversation-scoped and
relationship-scoped. Assembly is the real chat-path entry:
PromptBuilder.build/4 with SocialMemory.for_account/1, which is
fed by ScopedContext -> CapsuleRead, plus ScopedContext.assemble/2
directly for the id/count legs.

Assertions: (a) the packages differ in substance - each contains
its own capsule content, its own history summary, and its own
relationship facet (type + tone), and the prompt texts differ
beyond ids; (b) isolation - literal substring scans: no
B-sourced string appears in A's package and vice versa, at the
prompt-text level and at the capsule-id/count level; (c) the
partner's own private capsules (user-scoped, conversation-scoped,
and relationship-scoped) appear in NEITHER asker's package, with a
positive control that P's own assembly does carry P's capsule, so
the absence is scoping, not a broken store.

### The gap the exercise exposed, and the fix

First run: 1 failure, exactly one marker missing - ZX-A5, the
relationship-scoped capsule. Everything else (conversation-scoped
capsules, known facts, history summaries, relationship type and
tone) already differed per asker and leaked nothing.

What was wrong: PromptBuilder's capsule section named only ONE
context - scope_kind "conversation" with the conversation id.
CapsuleRead admissibility requires an exact kind + id match for
any non-personal scope, so a relationship-scoped capsule was
admissible in NO prompt assembly at all. That silently excluded
exactly the capsules Law 2 names first ("their capsules about
this person") - including every durable-preference fragment about
a person, which the capsule facade converts to relationship scope
(PersonalMemoryCapsule.from_durable_fragment/1). The assembly was
thread-deep only; the asker's relationship capsules never entered
an Orbit answer.

The minimal fix (this branch):

- OpalCore.MemoryWallet.ScopedContext.assemble_many/2 (plus
  prompt_section_for_contexts/2): ONE package for one account from
  several named contexts - the union of CapsuleRead.list_for_owner/2
  per context, deduplicated by capsule id, packaged by the same
  builder as assemble/2. Still exclusively through the mediated
  facade; still one account per call. Registered in
  PlanProjection.capsule_read_functions/0.
- PromptBuilder.append_capsule_section/3 now names both lawful
  contexts: the conversation context, plus - for a dyad only - the
  relationship context for the conversation's one other member
  (Messages.member_user_ids/1). Group conversations keep the
  conversation context only: per-person depth is already stripped
  for groups by the cardinality law, and relationship capsules are
  per-person depth. Any other shape names no relationship context
  (fail closed to the conversation context alone).

Result after the fix: orbit_sameness_test.exs 2 tests, 0 failures;
the W-GAP-32 isolation suite (repair18_sm_isolation_test.exs) and
the capsule suite (memory_wallet_capsule_test.exs) re-run green in
the same run (21 tests, 0 failures combined) - isolation did not
move: the partner's capsules and the other asker's capsules still
appear in neither package, because every added context is still
read through the asker's own owner-scoped facade.

## 4. The bidirectional law - volunteered context in an orbit

Founder, 2026-10-20 08:31 PDT: users SHARE context from their own
point of view inside an orbit; that sharing centers the user.
In-wave truth: the orbit conversation itself is the stored,
viewer-scoped, relationship-anchored home of volunteered context
(invisible to the other party).

Investigation findings:

- There is NO module named CapsuleWrite in the codebase (searched
  lib, tests, web). The capsule write leg that exists is
  CapsuleRead.remember/2 - the write facade on the same module as
  the mediated read facade - reached over HTTP by POST
  /api/v1/product/memory-wallet/capsules (SoulMemoryController
  create_capsule). It builds the scope policy as data through the
  one builder (PersonalMemoryCapsule.scope_policy/1) and supports
  conversation and relationship scopes today.
- There is NO orbit-specific explicit user action for filing a
  piece of orbit context as a capsule: no control on an orbit
  message, no endpoint in OpalConversationController, and no call
  from OpalConversations to the capsule write leg (searched both).
  The generic capsule-create endpoint above is a Memory Wallet
  action ("You told Opal"), not an orbit action.

What was done: nothing wired. Per the governing instruction, chat
messages are NOT silently converted into capsules - that would
manufacture memory the user never chose to file, and would blur
the provenance the capsule class is built on ("You told Opal").

Named as intelligence-phase design: capsule-anchoring of orbit
context - an explicit per-message/per-selection "remember this in
this orbit" action in the orbit room, writing through
CapsuleRead.remember/2 with scope_kind "conversation" (scope_id =
the thread conversation id) or "relationship" (scope_id =
counterpart user id) from the session's stored birth scope
(OpalConversation context_person_id / context_conversation_id,
which already carry exactly those ids, validated fail-closed at
session birth). The backend write leg and the scope ids both
exist; the missing piece is the explicit user action (surface +
endpoint) that names the volunteered text. Until that action
exists, volunteered context lives where the in-wave truth says it
lives: in the orbit conversation itself.

## 5. Orbit Projection v2 (Part 2)

OpalCore.SocialFlow.OrbitProjection.for_conversation/3 now returns,
in addition to the existing conversation_id, composition, parties,
plans (with participants), and next_plan:

- "subject": the next plan's title when one exists, else the
  conversation record's own title (its label, when the label is a
  human title rather than a machine routing label -
  group-/direct-/connection- prefixes are not names), else nil.
  The room's center is the TOPIC, never a person.
- "where_lines": finished plain lines for the "Where we're at"
  card, rendered verbatim by the frontend. Composition: one
  next-together line from the NextPlan fact (or "No next plan is
  set yet."), then at most one standing line per plan for the
  first three plans, sourced from
  NonResponseEtiquette.viewer_projection/3 (the machinery's own
  per-viewer export: stage, fork state, limbo, and its finished
  remaining-window text) or, absent an etiquette truth, the plan's
  own pending participant reads. Misalignment honesty (Law 3):
  - an escalated loop reads "<Name> did not answer <title> before
    the answer window closed. It is still unanswered."
  - a presented fork reads "A choice is in front of <Name> on
    <title> - decline, or ask for another time - and it is still
    unanswered."
  - an open limbo reads "<Name> has not answered <title> yet."
    plus the machinery's remaining-window line when one exists.
- "past_plans": this conversation's past/settled facts from the
  new NextPlan.past_for_conversation/3 - the upcoming pipeline's
  own candidate scope and per-viewer vault filter, past defined
  as not-upcoming under the same L8 rule (terminal statuses and
  time-expired active plans), each fact the same projection with
  state "past" and completed_at carried. Loved evidence, ONLY
  from data: "repeated" is true when a plan's F-15 repeat
  provenance (alignment["repeated_from_plan_id"]) points at the
  past plan; "loved" is true only then, with "loved_evidence"
  naming "repeated". The plan model carries no explicit
  positive-signal field (checked: no loved / rating / reaction
  field on SharedPlan or its contract), so repeats are the only
  loved evidence that exists - stated here so no surface invents
  another.

The existing member-only fail-closed behavior is intact: a
non-member still gets nil (no subject, no lines, no past).

Tests (repair20_orbit_projection_test.exs, extended): subject
derivation order (plan title, then conversation title, then nil
for a machine label); where_lines next-together + pending truth,
the honest empty line, the limbo line with its remaining-window
text, a presented-fork line, and a closed-window escalated line
that names the non-answer plainly; past_plans settled state,
loved only after a real F-15 repeat is created, and the viewer's
own vault mark removing a plan from their past only. File count:
4 tests at base, 8 tests after.

## 6. The self-mirror (Ethics article 3) - built, minimally

Investigation: two candidate write paths exist.

- AttentionSignal (the NonResponseEtiquette / FollowThrough
  needs-you path) is a needs-you surface with a closed signal_type
  vocabulary, statuses, and surfacing rules - writing quiet
  self-mirror entries there would put them in the user's
  needs-you stream, which is not quiet and not a mirror; rejected.
- OpalCore.Accounts.AccountActivity is the real user-visible
  activity trail: AccountActivity.record/4 writes ActivityEntry
  rows; the Settings account controller serves
  list_for_user(user_id) - owner-only by construction (the query
  is filtered on the caller's own user id before any entry
  exists in memory).

Built: the one real orbit event the backend owns - a scoped
(orbit) session birth. insert_scoped_session/2 in
OpalConversations is the single choke point every orbit session
(person-scoped and conversation-scoped alike) is born through; it
now records, on success only, an AccountActivity entry of kind
"orbit_session_started", subject = the new session's id, detail =
anchor type/id and the session's context ids only. No message
content, no other party's activity, nothing that any code reads
to gate anything (a mirror, never a lock). A failed mirror write
is rescued and never fails the session birth.

Exact remaining gap, named: reopening an already-born session and
individual message sends inside a session do not pass through a
backend write choke point that distinguishes orbit use from
ordinary Opal chat at the activity layer, so the mirror currently
counts orbit session births, not orbit messages. The per-session
message truth itself is stored (OpalMessage rows under the scoped
session, with its context ids), so an intelligence-phase mirror
can count messages per orbit from real records without new
storage; that counting read is designed-not-built here.

Test: orbit_self_mirror_test.exs (new, 2 tests) - a scoped session
birth lands exactly one entry on the owner's trail with the
session's scope and no content keys; the other party's trail
stays empty; three births accumulate to three quiet entries the
user themselves can count.

## 7. Files changed in this wave

Backend code:
- apps/opal_core/lib/opal_core/intelligence/prompt_builder.ex
  (capsule section names conversation + dyad relationship contexts)
- apps/opal_core/lib/opal_core/memory_wallet/scoped_context.ex
  (assemble_many/2 + prompt_section_for_contexts/2; assemble/2
  refactored onto the same package builder)
- apps/opal_core/lib/opal_core/social_flow/next_plan.ex
  (past_for_conversation/3; candidate sources take a status set)
- apps/opal_core/lib/opal_core/social_flow/orbit_projection.ex
  (subject, where_lines, past_plans)
- apps/opal_core/lib/opal_core/social_flow/plan_projection.ex
  (registry: NextPlan.past_for_conversation/3,
  ScopedContext.assemble_many/2)
- apps/opal_core/lib/opal_core/opal_conversations.ex
  (self-mirror write at scoped-session birth)

Tests:
- apps/opal_core/test/opal_core/social_flow/orbit_sameness_test.exs
  (new - the Sameness Test, 2 tests)
- apps/opal_core/test/opal_core/social_flow/repair20_orbit_projection_test.exs
  (extended - 4 tests at base, 8 after)
- apps/opal_core/test/opal_core/social_flow/orbit_self_mirror_test.exs
  (new - the self-mirror pins, 2 tests)

Records:
- coordination/repair19/orbit-v2-report.md (this file)

No migrations. No frontend files. No other cluster's files.

## 8. Orbit Law 4 - Two True Perspectives (founder, 2026-10-20 10:48 PDT)

Recorded beside Laws 1-3, at the founder's direction, as a clarity
he does not want reworked later:

Orbit is not the asker's echo chamber. The OTHER person's
perspective shines EQUALLY - when the user is in Orbit about
someone, that person's perspective (her truth, where she's coming
from) is held as a true perspective alongside the user's.

Sourcing law (where this must not error): the partner's
perspective comes from the SHARED RECORD - her actual words in
the conversation/calls between them, shared capsules with
consent lineage, what she has expressed to the asker - NEVER from
her private wallet/Soul (the isolation law is untouched) and
NEVER invented: what she has not expressed may be inferred only
as a labeled guess (the trivia doctrine: guesses are labeled,
never overwrite truth).

Consequences: (1) "Where we're at" in conflict shows BOTH truths
and names the actual gap between two real positions; (2)
suggestions remain in the ASKER's voice (Voice Law) but the
UNDERSTANDING behind them is bilateral; (3) Orbit never coaches
the asker around the partner as an obstacle - its work is
alignment between two people whose perspectives both count.

Today's truth status: the v2 projection's where_lines are built
only from the shared record (the shared plan's etiquette state,
the conversation's own next-together, the machinery's window
text) - Law-4-conformant sourcing, no private-wallet material,
nothing invented. The fuller bilateral rendering (both positions
stated side by side with the gap named, from the partner's
expressed words) is intelligence-phase design and is NOT claimed
as built.

## 9. Generality and reciprocity (founder, 2026-10-20 10:54 PDT)

Nothing about Orbit is hardcoded to any person (the founder's
examples were examples, as in R19). One orbit per anchor - every
person the user converses with, every group conversation,
plans/places - generated from the graph. The projection is
anchor-generic by construction (subject = the anchor's next
plan or conversation title; parties from the conversation's own
membership); the acceptance exercise for this cluster exercised
three anchors with no person-specific code path: two distinct
person anchors (two different accounts of the same display name,
kept strictly separate) and one group anchor (Weekend Crew),
each rendered at the glass in both modes.

RECIPROCITY: the other party has their own orbit with the user,
from their seat, in their own Opal - the same shared record,
their own private side sealed from the user. Isolation is
symmetric. Exercised at the glass in this wave: the staged
conversation's orbit was captured from BOTH seats (A's seat
carrying A's limbo; B's seat opening as B's own fresh orbit over
the same shared record).

## 10. R-7 - group membership dynamics (founder, 2026-10-20 11:05 PDT) - model record

(1) MEMBERSHIP IS AN ORBIT EVENT, NOT A RESET: people can be
ADDED to a group conversation (multi-select - more than one
person in a single add) and REMOVED; the orbit is the SAME
orbit, extended or contracted - never refreshed brand-new; the
orbit's record carries membership events ("X joined", "Y was
removed") as part of its understanding and history.
(2) ADMIN RULE: the conversation's creator is its admin (or
creator-designated); only admins remove others - no random
member kicking people out; anyone may leave on their own.
(3) CONSENT EDGES: a removed member keeps their own wallet's
copy of what was shared WITH them during membership and receives
nothing after; a new member starts from the group's current
commons (forward-looking) - history beyond that is an admin
share choice, default forward-only.
(4) NEW CHAT = NEW ORBIT, BORN KNOWING: a brand-new conversation
gets its own orbit, but that orbit inherits the pairwise
relationship context (the existing 1:1 overlaps with each
member) - it is never born ignorant of who these people are to
the user.
(5) Surfaces: the add/remove flows live on the conversation
(group management) with the orbit reflecting changes without
ceremony; placement discipline - the right assets on the right
screens.

Today's machinery truth: conversation membership is real in the
backend (members are added through the product's own add-people
path), and the orbit projection reads membership as it stands -
a membership change reflects in the orbit's parties/subject on
the next read, with no orbit rebuild (the orbit has no separate
store to reset). NOT built, recorded as model: membership events
as first-class entries in the orbit's record/history, the
admin-rule enforcement surface for removals, the consent-edge
semantics on removal (wallet copies), and pairwise-context
inheritance at a new group orbit's birth beyond what the
projection already assembles per member dyad. No membership UI
was faked for this record.

## 11. System model addendum (founder, 2026-10-20 10:59 PDT)

Also recorded in the WALLET_MAP addendum; stated here because
Orbit is where the model is most visible:

(1) CAPSULES AS SETS: a relationship between two people = their
SHARED capsules (the intersection). A group = overlapping
intersections - pairwise shared capsules plus the group commons.
The Venn of touching circles is the canonical picture; the
Scoped Context Builder's intersection ({relevant} intersect
{allowed}) is the same geometry at read time.
(2) LIKES AND DISLIKES ARE BOTH FIRST-CLASS: capsule content
includes aversions - what a person does NOT like shapes the path
to alignment as much as preferences do. Recommendations, orbit
understanding, and trivia scope must treat negative knowledge
with the same care and scope discipline.
(3) NOUNS AND VERBS: anchors are nouns (persons, places,
things/topics); what flows between them (messages, calls, plans,
revisions) are the verbs. Orbits sit on nouns; coordination
happens in the overlaps.
(4) TRUTH-IN-MODEL RULE: the map states plainly what today's
machinery truly holds (shared capsules today = shared plans +
shared conversations + consent lineage on them) vs what the
wallet build adds (the general capsule store) - the orbit
surfaces may only claim what exists. This report follows that
rule throughout.
(5) WHOLE-SYSTEM COHERENCE: at wave close the map-trace pass
verifies this model end to end; any place the built app
contradicts the overlap model is named as a finding, not
smoothed. The wave-close reconciliation in the Repair #20
handoff carries that pass's results.
