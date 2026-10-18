/**
 * FR-12-01 - Fixture rows painted as if real: "Sadeil + 3 are here",
 * "Maya is on the way - 8 min", sample ideas, hollow error states
 * (F12-12, F12-57, F12-09, F17 Home fixtures, F14-17).
 *
 * Genesis: Repair #12/#17 - shells painted fixture presence, ETAs and
 * sample content with no backend record behind them.
 *
 * Guards (API output = what the shells render):
 *  - On a FRESH account with no plans and no relationships, the plan
 *    listing, Chats list, calendar/today and Home feed contain none
 *    of the known fixture strings and no invented presence/ETA copy.
 *  - Every plan row the listing returns carries a real backend id.
 *  - A missing object (journey show for a random id) returns an
 *    honest error body - never raw exception/stack text.
 *
 * Uses a fresh synthetic account when provisioning is available so
 * seed familiarity cannot hide fixtures; falls back to session A
 * with the fixture-string assertions scoped to new content.
 *
 * Pass expectation on the current tip: PASS.
 */
import { allStrings } from "../lib/harness.mjs";

const FIXTURES = [
  "Sadeil + 3 are here",
  "Maya is on the way",
  "on the way - 8 min",
  "on the way — 8 min",
];

export default {
  id: "FR-12-01",
  title: "Fixture rows painted as if real: invented presence, ETAs, sample ideas, hollow errors",
  theme: "No scripted responders, no seed impersonation, no fake success",
  class: "A",
  surfaces: ["Home", "Chats list", "Graphs", "GET /opal/plans", "GET /home/feed", "GET /calendar/today"],
  async run(ctx) {
    const { A, h, assert } = ctx;
    const fresh = await ctx.freshClient("+12025550103", "Regression Fresh");
    const client = fresh || A;
    if (!fresh) assert.note("synthetic provisioning unavailable; running fixture scan on session A (seed content may lawfully name real people)");

    const plans = await h.listPlans(client);
    assert.eq("GET /opal/plans", plans.status, 200, "plan listing must load");
    assert.check(
      "GET /opal/plans (row identity)",
      plans.plans.every((p) => typeof p.id === "string" && p.id.length > 0),
      "every painted plan row must trace to a backend record (carry its id)",
    );
    if (fresh) {
      assert.eq("GET /opal/plans (fresh account)", plans.plans.length, 0, "a fresh account must have zero plans - any row is a fixture");
    }

    const convs = await h.listConversations(client);
    if (fresh) {
      assert.eq("GET /conversations (fresh account)", convs.conversations.length, 0, "a fresh account must have zero chats - any row is a fixture");
    }

    const today = await h.calendarToday(client);
    assert.eq("GET /calendar/today", today.status, 200, "calendar today must load");

    const feed = await client.get("/home/feed");
    assert.check("GET /home/feed", feed.status === 200, `home feed must load (got ${feed.status})`);

    const surfaces = {
      "GET /opal/plans": plans.plans,
      "GET /conversations": convs.conversations,
      "GET /calendar/today": today.json,
      "GET /home/feed": feed.json,
    };
    for (const [surface, payload] of Object.entries(surfaces)) {
      const strings = allStrings(payload);
      for (const fixture of FIXTURES) {
        assert.check(
          surface,
          !strings.some((s) => s.includes(fixture)),
          `fixture copy "${fixture}" must never appear in real surface output`,
        );
      }
      if (fresh) {
        assert.check(
          surface,
          !strings.some((s) => /\bis on the way\b|\b\d+ min away\b|\bare here\b/i.test(s)),
          "a fresh account surface must carry no invented presence/ETA copy",
        );
      }
    }

    // Honest error, never raw exception text.
    const missing = await client.get(`/journeys/00000000-0000-4000-8000-0000000000ab`);
    assert.check(
      "GET /journeys/:id (missing)",
      missing.status === 404 || missing.status === 422 || missing.status === 409,
      `a missing journey must return an honest error status (got ${missing.status})`,
    );
    const errText = JSON.stringify(missing.json || {});
    assert.check(
      "GET /journeys/:id (missing)",
      !/Ecto\.|__STACKTRACE__|FunctionClauseError|ArgumentError|\(exit\)/.test(errText),
      `error output must be human copy, never raw exception text; got: ${errText.slice(0, 160)}`,
    );
  },
};
