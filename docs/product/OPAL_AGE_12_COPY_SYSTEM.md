# Opal — Copy That a 12-Year-Old Can Follow

**Status:** Copy standard — governs all public-facing text
**Authority:** Applies to every screen, button, and message a real person sees; does not apply to internal docs, code, or logs
**Last updated:** 2026-08-05

---

## 1. The rule

If a socially active seventh grader couldn't follow it in one read, rewrite it. This doesn't mean the product feels young. Signal and WhatsApp both pass this test and neither reads as a kids' app. Simple words said with confidence read as premium. Complicated words said with confidence just read as confusing.

## 2. The test, in three questions

Before any line ships, ask:
1. Would a 12-year-old know what just happened?
2. Could an adult repeat it back to a friend without re-reading it?
3. Does it say who did what — a person, or Opal?

If the answer to any of these is no, the line isn't ready.

## 3. Five words we don't use, and why

| Don't say | Why not | Say instead |
|---|---|---|
| "AI-powered" | Nobody outside a pitch deck talks like this | Just describe what happened: "Opal noticed..." |
| "Optimize" | Sounds like a spreadsheet, not a friend | "Help," "make easier," "get you there faster" |
| "Engagement" | This is a word for advertisers, not people | Don't say it at all — describe the actual thing |
| "Synthetic" / "demo" | Never let a user see the seams of how it's built | If it's a test, say "test" plainly, or say nothing |
| "Session," "token," "cookie" | These are engineering words, not people words | Just don't mention them |

This list already exists in code as `FORBIDDEN_COPY` in `apps/opal_web/src/designTokens.ts`, and is enforced by tests. This document is the reasoning behind that list, written out so future copy decisions can extend it consistently instead of by instinct.

## 4. Say what actually happened — the six-state rule

`OPAL_HUMAN_AND_AI_STATE_MATRIX.md` names six things a line of text can be: something a person said, something Opal noticed, something Opal is offering, something Opal is doing, something a real business confirmed, or something that's finished. A 12-year-old should be able to point at any line and say which of those six it is, without being told.

**Before (live today, and wrong):**
> "After 6:30 works for me." — "I'll book Harbor Table." — *(gold chip)* "Thursday · 7:00 PM"

A 12-year-old reading this would think dinner is booked. It isn't. Nobody booked anything — Opal made this scene up to show what the app *could* do. That's two problems at once: it looks finished when it's fake, and even in the real product, this exact pattern would look finished when it's only proposed.

**After (same idea, honest):**
> "After 6:30 works for me." — "Want Opal to check if Harbor Table has a table Thursday at 7?" — *(chip)* "Asking Harbor Table…"

Now a reader knows: two people are talking, one of them is asking Opal to try something, and Opal hasn't heard back yet. Nothing claims to be done that isn't done.

## 5. Premium doesn't mean formal

"Life starts in conversation" passes the test — five words, no jargon, and it still sounds like something worth paying attention to. That's the target: short sentences, real verbs, no throat-clearing. Compare:

- Not premium, not clear: *"Opal leverages relationship intelligence to surface contextually relevant social signals."*
- Clear, and reads as premium: *"Opal notices what's forming in your conversation, and helps you follow through."*

The second one is the actual line already in the product (`Opal_PRODUCT_TRUTH.md`'s compounding promise, tightened). It's proof the standard and the existing product voice already agree — this document is naming what's already working, not inventing a new voice.

## 6. What never belongs in public copy

Architecture and engineering words: Elixir, Phoenix, session token, socket, consent gate, job queue, schema, contract, pipeline. If a word only makes sense to someone who has read `docs/architecture/`, it does not belong on a screen. This is already tested in the codebase (walkthrough copy is checked against a pattern that rejects `session|cookie|csrf|phoenix|elixir|bearer|synthetic provider`) — this document is the standing reason that test exists, so it isn't treated as an arbitrary lint rule the next time someone is tempted to loosen it.

## 7. Where this applies, and where it doesn't

Applies: onboarding, walkthrough, buttons, chat labels, notifications, error messages, anything a real person reads.
Doesn't apply: this document, other `docs/` files, code comments, log messages, internal coordination files. Those are allowed to say "consent gate" and "Oban worker" freely — that's exactly where those words belong.
