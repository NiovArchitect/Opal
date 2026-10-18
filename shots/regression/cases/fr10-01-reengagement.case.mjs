/**
 * FR-10-01 - Center kept re-engaging an old person/topic after a
 * subject change (F06, FL-R10-01, F13-10, F17-08 partial). Contract:
 * capability questions, direct questions and explicit new requests are
 * answered on their own terms; no sticky re-engagement line fires.
 */
export default {
  id: "FR-10-01",
  title: "Center kept re-engaging an old person/topic after he changed subject",
  theme: "Center routing, sticky context, continuity",
  class: "A",
  surfaces: ["Center"],
  async run(ctx) {
    const { A, h, assert } = ctx;
    await h.centerNewChat(A);
    await h.centerSend(A, "Help me plan Maya's birthday dinner");
    const probes = [
      "Remind me what Opal can do",
      "What can you help me with?",
      "Something new - find a coffee place in Oceanside",
    ];
    for (const q of probes) {
      const r = await h.centerSend(A, q);
      const body = r.opal?.body || "";
      assert.check("Center reply", !/you mentioned .* earlier/i.test(body),
        `"${q}" must not be answered with a sticky re-engagement line; got: ${body.slice(0, 200)}`);
      if (/what opal can do|what can you help/i.test(q)) {
        assert.check("Center reply (capability question)", !/maya/i.test(body),
          `a capability question must not be answered with a Maya nudge; got: ${body.slice(0, 200)}`);
        assert.check("Center reply (capability question)", body.length > 20,
          "a capability question must get a real answer, not an empty deflection");
      }
    }
  },
};
