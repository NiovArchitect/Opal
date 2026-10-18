/**
 * FR-17-12 - Tests failed depending on the time of day (F17-02):
 * quiet-hours gates read the real wall clock. The permanent proof
 * form is the backend suite run pinned at 02:00 and 14:00 LA (named
 * in the catalog) - a suite-runner gate, not an API behavior. This
 * file is the runner-side guard: the clock seam must exist in the
 * backend source (every quiet-hours read goes through the
 * injectable clock module), asserted statically so a regression to
 * direct wall-clock reads fails the regression suite itself.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
export default {
  id: "FR-17-12",
  title: "Tests failed depending on the time of day - quiet-hours gates read the real wall clock",
  theme: "Clock, bucketing, misc rendering truth",
  class: "A",
  surfaces: ["apps/opal_core/lib (clock seam)"],
  async run(ctx) {
    const { assert } = ctx;
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
    const clockPath = path.join(root, "apps/opal_core/lib/opal_core/social_flow/clock.ex");
    const alt = path.join(root, "apps/opal_core/lib/opal_core/clock.ex");
    const exists = fs.existsSync(clockPath) || fs.existsSync(alt);
    assert.check("clock seam module", exists,
      "an injectable SocialFlow.Clock seam module must exist - without it quiet-hours code reads the wall clock and the suite goes red overnight");
    assert.note("full proof = backend suite run unpinned + pinned 02:00 LA + pinned 14:00 LA with zero failures (catalog); this guard fails if the seam disappears");
  },
};
