/**
 * W4-04-LAYOUT - plan/graph detail surface, layout integrity, BOTH modes.
 *
 * Founder escalation (2026-10-17 23:27 PDT): layout integrity is
 * architectural. For the surface this stage ships (the graph/plan
 * detail with the new W4-04 edit controls), in dark AND light mode:
 *
 *  1. HIT-TESTING: every visible interactive element's center
 *     hit-tests to itself or a descendant (lib/layout-integrity.mjs).
 *  2. CONTAINMENT: no interactive element bleeds outside the viewport
 *     horizontally; card content stays inside its card box.
 *  3. STACKING SANITY: every interactive/intersecting pair is listed
 *     in the manifest as a reviewed item; intersections involving the
 *     detail sheet (a dialog) over outside content auto-FAIL.
 *
 * Plus the W4-04 functional legs on the rendered surface itself:
 * the edit controls are present for the lead, the corrected title is
 * what the detail renders, the editor opens, saves through the real
 * API, and the surface re-renders the returned title in place - in
 * BOTH modes (mode parity is part of the stage's acceptance).
 *
 * This case is driven by run-layout.mjs (Playwright) against a served
 * web app + backend. It is NOT part of the API runner (run.mjs): a
 * rendered-stage case needs a browser, and pretending otherwise is
 * how previous walks died.
 */
export default {
  id: "W4-04-LAYOUT",
  title: "Graph/plan detail layout integrity + edit affordance, dark and light",
  surfaces: ["graph detail (rendered, both modes)"],
  async run(ctx) {
    const { page, assert, apiA, apiB, sessions, tag } = ctx;

    // -- Arrange through the real API path ------------------------------
    const direct = await ctx.h.ensureDirect(apiA, sessions.b.userId);
    if (!direct.conversationId) throw new Error("harness: direct conversation failed");
    const typo = `Diner at Juniper ${tag}`;
    const created = await ctx.h.createConversationPlan(apiA, direct.conversationId, {
      title: typo,
      location: "Juniper & Ivy",
      time_label: "Friday 7:30 PM",
    });
    if (!created.plan) throw new Error("harness: plan creation failed");
    const planId = created.plan.id;

    // -- Drive the rendered surface in each mode -------------------------
    for (const mode of ["dark", "light"]) {
      await ctx.setTheme(mode);
      await page.goto(`${ctx.webBase}/?graph=${planId}&opal_dev=1`, {
        waitUntil: "domcontentloaded",
      });
      const sheet = page.getByTestId("graph-detail-sheet");
      await sheet.waitFor({ state: "visible", timeout: 30000 });

      // The detail opened for THIS plan (addressability is the path).
      assert.eq(
        `${mode} graph detail identity`,
        await sheet.getAttribute("data-plan-id"),
        planId,
        "the detail sheet must be the requested plan's",
      );

      // Layout integrity over the whole rendered surface.
      const manifest = await ctx.audit(`graph-detail-${mode}`);
      assert.check(
        `${mode} layout integrity: enumerated interactive elements`,
        manifest.interactiveCount > 0,
        `the audit must enumerate interactive elements (got ${manifest.interactiveCount})`,
      );
      for (const f of manifest.failures) {
        assert.check(
          `${mode} layout integrity (${f.kind})`,
          false,
          `${f.element}: ${f.detail}`,
        );
      }
      assert.note(
        `${mode}: ${manifest.interactiveCount} interactive elements hit-tested in active layer ` +
          `(${manifest.activeLayer || "document"}); ${manifest.backgroundedCount} backgrounded behind the layer; ` +
          `${manifest.reviewedIntersections.length} intersection(s) in the reviewed manifest`,
      );
      for (const item of manifest.reviewedIntersections) {
        assert.note(`${mode} reviewed intersection: ${item.a} x ${item.b} -> topmost ${item.topmost}`);
      }

      // The edit affordance: present for the lead, showing the stored
      // title; the save flow runs through the real API from the page.
      // The descriptor arrives with the durable-plans fetch, which can
      // settle after the sheet itself renders - poll for it honestly
      // rather than asserting on a mid-load frame.
      const controls = page.getByTestId("plan-edit-controls");
      await controls
        .waitFor({ state: "attached", timeout: 30000 })
        .catch(() => {});
      if ((await controls.count()) === 0) {
        assert.check(
          `${mode} plan edit controls`,
          false,
          "plan-edit-controls not rendered on the detail surface (the durable plan payload must reach the detail: see report gap if the surface opened fixture-side)",
        );
        continue;
      }
      assert.eq(
        `${mode} plan edit title (pre-edit)`,
        (await page.getByTestId("plan-edit-title").textContent())?.trim(),
        typo,
        "the detail must render the plan's stored title",
      );

      const fixed = `Dinner at Juniper ${tag}`;
      await page.getByTestId("plan-edit-open").click();
      await page.getByTestId("plan-edit-title-input").fill(fixed);
      await page.getByTestId("plan-edit-save").click();
      await page.getByTestId("plan-edit-form").waitFor({ state: "detached", timeout: 15000 }).catch(() => {});
      assert.eq(
        `${mode} plan edit title (post-save, in place)`,
        (await page.getByTestId("plan-edit-title").textContent())?.trim(),
        fixed,
        "after saving, the surface must render the returned corrected title without a reload",
      );

      // Read-back through the other party's API session (the rendered
      // save really landed on the shared row).
      const bList = await ctx.h.listPlans(apiB);
      assert.eq(
        `${mode} other party read-back`,
        bList.plans.find((p) => p.id === planId)?.title,
        fixed,
        "participant B's listing must carry the corrected title",
      );

      // Re-audit after the edit (the surface's post-edit geometry is
      // part of the pass, not just its initial paint).
      const after = await ctx.audit(`graph-detail-${mode}-after-edit`);
      for (const f of after.failures) {
        assert.check(`${mode} layout integrity after edit (${f.kind})`, false, `${f.element}: ${f.detail}`);
      }

      // Reset for the next mode's pre-edit assertion.
      const back = await apiA.patch(`/opal/plans/${planId}`, { title: typo });
      if (back.status !== 200) throw new Error(`harness: title reset failed (${back.status})`);
    }
  },
};
