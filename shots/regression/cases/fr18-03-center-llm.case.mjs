/**
 * FR-18-03 - Center never actually thought (F18-08).
 *
 * Founder symptom: "what city am I currently in?" got a template
 * deflection; both replies were stored templates with llm_called false;
 * stale entities hijacked the parse.
 *
 * Contract asserted on API output - the STORED reply read back through
 * GET /opal/conversation (the surface renders the stored message):
 *  - For answerable questions, the stored Opal reply's metadata records
 *    real provider engagement: llm_called is true and draft_source is
 *    "llm" (or the turn took a grounded non-template path that records
 *    itself as such - a deflection is neither).
 *  - No stored reply is the literal template deflection.
 *  - With a location grant (POST /opal/location, the real Center
 *    location path), the city question is answered with the granted
 *    city; swapping the grant to a second city changes the answer
 *    (anti-hardcode). Without a grant, the answer honestly says the
 *    location is unknown - never the deflection.
 *
 * Environment note: the engagement assertion is only meaningful when
 * the stack under test has the LLM key configured (OPAL_LLM_API_KEY in
 * the server env). A stack without the key reproduces the founder walk
 * exactly (0 provider calls, template replies) and fails here - that
 * failure is the defect, recorded by name in FIRST_RUN.
 *
 * Expected on the R17 tip: FAIL on every leg.
 */
const DEFLECTIONS = [
  "Tell me more — I can help you plan or check what's coming up.",
  "Tell me more — I can help with plans, people, or what's coming up.",
  "Tell me more - I can help you plan or check what's coming up.",
  "Tell me more - I can help with plans, people, or what's coming up.",
];

const CITIES = [
  { name: "San Diego", lat: 32.716, lng: -117.161 },
  { name: "Los Angeles", lat: 34.052, lng: -118.244 },
];

export default {
  id: "FR-18-03",
  title: "Center never actually thought: template deflection, llm_called false, stale entities",
  theme: "intelligence",
  class: "A",
  surfaces: ["Center", "GET /opal/conversation", "POST /opal/conversation/messages"],
  async run(ctx) {
    const { A, h, assert } = ctx;

    async function askAndReadBack(question) {
      const sent = await h.centerSend(A, question);
      assert.eq(
        "POST /opal/conversation/messages",
        sent.status,
        201,
        `Center send must succeed for: ${question}`,
      );
      const read = await h.centerConversation(A);
      const msgs = read.conversation?.messages || [];
      const stored = [...msgs]
        .reverse()
        .find((m) => m.role === "opal" && m.id === sent.opal?.id) ||
        [...msgs].reverse().find((m) => m.role === "opal");
      return stored || sent.opal;
    }

    function assertEngaged(surface, stored, question) {
      assert.check(
        surface,
        !!stored,
        `a stored Opal reply must exist for: ${question}`,
      );
      if (!stored) return;
      const meta = stored.metadata || {};
      assert.check(
        surface,
        !DEFLECTIONS.includes((stored.body || "").trim()),
        `reply to "${question}" must not be the literal template deflection; got: ${(stored.body || "").slice(0, 120)}`,
      );
      assert.check(
        surface,
        meta.llm_called === true || meta.draft_source === "llm" || meta.draft_source === "grounded",
        `stored reply metadata must record real engagement (llm_called / draft_source); got llm_called=${JSON.stringify(meta.llm_called)} draft_source=${JSON.stringify(meta.draft_source)}`,
      );
    }

    // -- Corpus: factual and personal questions, no location grant yet --
    await h.centerNewChat(A);
    const corpus = [
      "what city am I currently in?",
      "what can you help me with this week?",
      "what is two plus two?",
    ];
    let cityReplyNoGrant = null;
    for (const q of corpus) {
      const stored = await askAndReadBack(q);
      assertEngaged("GET /opal/conversation (stored reply)", stored, q);
      if (q.startsWith("what city")) cityReplyNoGrant = stored;
    }

    // -- Honest unknown without a grant ----------------------------------
    if (cityReplyNoGrant) {
      const body = cityReplyNoGrant.body || "";
      const honestUnknown =
        /don'?t (have|know)|not sure|unknown|no location|location (is )?(off|not|unavailable)|turn on location|share your location|tell me (the|your) city/i.test(
          body,
        ) || /san diego|los angeles|oceanside|coronado/i.test(body);
      assert.check(
        "Center reply (no location grant)",
        honestUnknown,
        `without a location grant the city answer must honestly say location is unknown (or answer from real context); got: ${body.slice(0, 160)}`,
      );
    }

    // -- Grounded answer with a grant, then anti-hardcode swap -----------
    for (const city of CITIES) {
      const grant = await h.grantLocation(A, city.lat, city.lng);
      assert.eq(
        "POST /opal/location",
        grant.status,
        200,
        `location grant must be accepted for ${city.name}`,
      );
      await h.centerNewChat(A);
      const stored = await askAndReadBack("what city am I currently in?");
      const body = stored?.body || "";
      assert.check(
        `Center reply (location grant: ${city.name})`,
        new RegExp(city.name, "i").test(body),
        `with a ${city.name} location grant the answer must name ${city.name}; got: ${body.slice(0, 160)}`,
      );
      assert.check(
        `Center reply (location grant: ${city.name})`,
        !DEFLECTIONS.includes(body.trim()),
        "the granted city answer must not be the template deflection",
      );
    }
  },
};
