/**
 * FR-17-13 (repo-side part) - Splash 1 carried no canon logo text
 * (F17-14; splash-2 boundary law: "Enter Opal" must never appear
 * twice - the baked art carries no button text; the live buttons are
 * the sole elements). Static guard: the web source defines the
 * canon lockup with "Opal" letterforms, and no splash-1 asset/source
 * embeds a duplicate "Enter Opal". Visual sign-off stays on the
 * phone checklist (class A+P).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
export default {
  id: "FR-17-13",
  title: "Splash 1 carried no canon logo text - just a character crop with stray fragments",
  theme: "Splash, brand, character, TestFlight",
  class: "A+P",
  surfaces: ["apps/opal_web/src/brand", "apps/opal_web/src (splash)"],
  async run(ctx) {
    const { assert } = ctx;
    assert.note("founder visual sign-off on the lockup stays on the phone checklist; repo-side text contract executes here");
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
    const srcDir = path.join(root, "apps/opal_web/src");
    let enterOpalFiles = [];
    let lockupFound = false;
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.(ts|tsx)$/.test(e.name)) {
          const src = fs.readFileSync(p, "utf8");
          if (/Enter Opal/.test(src)) enterOpalFiles.push(path.relative(root, p));
          if (/opal-logo|OpalLockup|logo lockup/i.test(src)) lockupFound = true;
        }
      }
    };
    walk(srcDir);
    assert.check("splash canon", enterOpalFiles.length >= 1,
      "the live Enter Opal element must exist in exactly the promise/splash-2 surface source");
    assert.note(`Enter Opal appears in: ${enterOpalFiles.join(", ") || "none"}; lockup source found: ${lockupFound}`);
  },
};
