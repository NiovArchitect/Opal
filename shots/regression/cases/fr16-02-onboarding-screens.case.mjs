/**
 * FR-16-02 - Unreachable onboarding screens (fr08-fr10) duplicated
 * live asks; an orphan ActivationFlow duplicated the real one
 * (F16-06, F16-07). Repo-side contract asserted statically (this is
 * the permanent guard form for a dead-code finding): no source in
 * the web app routes to fr08/fr09/fr10 steps or an ActivationFlow
 * component. Runs anywhere; no stack needed for this leg.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
export default {
  id: "FR-16-02",
  title: "Unreachable onboarding screens duplicated live asks; orphan ActivationFlow duplicated the real flow",
  theme: "Onboarding, OTP, permissions",
  class: "A",
  surfaces: ["apps/opal_web/src/onboarding"],
  async run(ctx) {
    const { assert } = ctx;
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
    const dir = path.join(root, "apps/opal_web/src");
    let flowHits = [];
    let routeOrder = "";
    let removedDecl = false;
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.(ts|tsx)$/.test(e.name)) {
          const src = fs.readFileSync(p, "utf8");
          if (/ActivationFlow/.test(src)) flowHits.push(path.relative(root, p));
          const m = src.match(/FIRST_RUN_ROUTE_ORDER[^=]*=\s*\[([\s\S]*?)\]/);
          if (m) routeOrder = m[1];
          if (/REMOVED_FIRST_RUN_STEPS/.test(src)) removedDecl = true;
        }
      }
    };
    walk(dir);
    assert.eq("web source scan (ActivationFlow)", flowHits.length, 0,
      `the deleted orphan ActivationFlow must be referenced nowhere; found: ${flowHits.join(", ")}`);
    assert.check("web source scan (route order)", routeOrder.length > 0 && !/fr08|fr09|fr10/.test(routeOrder),
      `the live first-run route order must not contain the removed fr08-fr10 steps; route order was: ${routeOrder.slice(0, 200)}`);
    assert.check("web source scan (removed-steps sanitizer)", removedDecl,
      "a removed-steps sanitizer must exist so a stale resume value naming fr08-fr10 sanitizes instead of blank-screening");
  },
};
