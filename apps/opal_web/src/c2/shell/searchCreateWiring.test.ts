/**
 * P8 (founder polish wave) - search + create wiring pins, source level:
 *  - the SERVED search is the C2 shell's SearchDestination: App.tsx
 *    renders C2Shell unconditionally and never mounts the legacy
 *    OpalApp fixture SearchDestination (opalUi/SearchDestination.tsx);
 *  - the shell passes the real intentions it already loads
 *    (adopt1Data, from listIntentions) into SearchDestination, so the
 *    intentions group the placeholder promises can actually render;
 *  - the create flow's real writes stay the named client calls.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(resolve(here, rel), "utf8");

describe("P8 served search wiring", () => {
  it("App renders C2Shell; the legacy fixture search is not the served one", () => {
    const app = read("../../App.tsx");
    expect(app).toMatch(/return <C2Shell \/>/);
    // OpalApp is never imported or mounted by the entry (its name
    // appears only in the W15 comment explaining that retirement).
    expect(app).not.toMatch(/from "\.\/OpalApp"/);
    expect(app).not.toMatch(/<OpalApp/);
    const shell = read("./C2Shell.tsx");
    // The SearchDestination the shell mounts is its own export.
    expect(shell).toMatch(/export function SearchDestination\(/);
    expect(shell).not.toMatch(/opalUi\/SearchDestination/);
  });

  it("the shell passes its loaded intentions into SearchDestination", () => {
    const shell = read("./C2Shell.tsx");
    const mount = shell.slice(shell.indexOf("<SearchDestination"));
    const mountEnd = mount.indexOf("/>");
    const mountBlock = mount.slice(0, mountEnd);
    expect(mountBlock).toMatch(/intentions=\{\(adopt1Data\?\.intentions/);
    expect(mountBlock).toMatch(/personName: intention\.subject_name/);
    // And adopt1Data itself comes from the real intentions read.
    expect(shell).toMatch(/listIntentions\(bearer\)/);
  });

  it("external invite landing (P9): the served shell captures ?invite= into the store verifyChallenge reads", () => {
    const shell = read("./C2Shell.tsx");
    expect(shell).toMatch(/get\("invite"\)/);
    expect(shell).toMatch(/isProductInviteCode\(token\)\) storeProductInviteCode\(token\)/);
    // The activation path the C2 onboarding uses consumes the store.
    const client = read("../../api/productClient.ts");
    expect(client).toMatch(/readStoredProductInviteCode\(\)/);
    expect(client).toMatch(/invite: inviteCode, invite_code: inviteCode/);
  });

  it("create flow writes stay real: plan/idea via createGraphPlan, trip via createTrip", () => {
    const shell = read("./C2Shell.tsx");
    expect(shell).toMatch(/await createTrip\(/);
    expect(shell).toMatch(/await createGraphPlan\(/);
    expect(shell).toMatch(/data-testid="c2-create-flow"/);
  });
});
