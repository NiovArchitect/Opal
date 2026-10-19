# First-look tranche (founder directive, 2026-10-18 03:39 PDT)

Interim direction check — NOT the full pack, NOT a walk.

- **Captured from:** the served integrated build on the separate Mac
  preview worktree (`opal-r18-preview`, founder's `opal-walk` stack
  untouched), GitHub `muse/repair-18` @ **3b34052c** — tree-identical
  to local integrated tip `b095b8b3` (the served pages carry
  `data-git-head-full=3b34052c…` and the badge chip reads
  `seed - 3b34052`). Backend BEAM start 03:52:29 PDT postdates the
  03:48 checkout; migrations additive through 20261027010004; preview
  backend on :4100 in synthetic-session mode, web on :5174 with the C2
  shell flag on.
- **How:** `shots/regression/rendered/firstlook-capture.mjs` +
  `firstlook-splash.mjs` driving the real served app in Chromium at
  390×844 (phone viewport, DSF 2), real session data (synthetic
  sessions + founder seed through the real APIs — no fixture painting;
  the account name in greetings is the harness user's, by design).
- **Surfaces (each dark + light):** splash-1, splash-2 (opening flow),
  center-rest (the shell boots into the Center deck — the opening
  surface), center-rest-scrolled, home, center-chat (Talk to Opal →
  C1 host), chats-list, thread (Saturday Crew).
- **Geometry:** per-surface probes (horizontal overflow, content
  escapees, clipped text, dock hit-tests) in `manifest.json`. All
  tranche surfaces pass. The one flag — a plan card's time line below
  the fold on the Center deck — was adjudicated by measurement: no
  clipping ancestor; at max scroll the last card's full box (bottom
  762px) clears the dock (top 772px) with every text line above it.
- **Known overlay in every capture:** the dev badge chip
  (`seed - 3b34052`, bottom-left) — the mandated build-verification
  instrument, aria-hidden, present in all walk builds by badge law. At
  some scroll positions it overlaps a small bottom-left area of
  scrollable content (never a control; dock hit-tests pass).
- **Gate note:** delivered under the complaint-ledger gate with the
  ledger's declared exceptions listed in the delivery message
  (COMPLAINT_LEDGER.md). Machine-proven, pending the founder.
  FOUNDER_ACCEPTED = NO.
