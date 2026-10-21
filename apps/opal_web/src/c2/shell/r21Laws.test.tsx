/**
 * @vitest-environment jsdom
 *
 * Repair #21 - Cluster L-LAWS, law L-1 (web leg): THE GREETING IS
 * TRUE (founder law, 2026-10-20 13:23 PDT).
 *
 * On Center, the greeting is dynamic and personal: the time-of-day
 * word follows the VIEWER's own timezone at the moment of viewing,
 * and the name is the SIGNED-IN USER's own name - no one else's.
 *
 * Pins in this file (Center, via shellData.openingFromPlans - the
 * one composition C2Shell feeds C2CenterOpening, with the viewer's
 * session display_name):
 * - the SAME pinned instant renders the evening word under
 *   America/Los_Angeles, the morning word under Asia/Tokyo, and the
 *   afternoon word under Pacific/Auckland (pinned clock + explicit
 *   viewer timezone, the web stack's TZ seam);
 * - with no explicit timezone, the hour is the browser-local hour
 *   (Date.getHours), never the UTC hour by construction;
 * - two distinct signed-in viewers are each greeted by their OWN
 *   name, and a plan that names a counterparty (Ethan Walker) never
 *   leaks that name into the viewer's greeting;
 * - the rendered Center surface shows exactly that greeting.
 *
 * The Flows legs of the same law are pinned where Flows composes
 * its greeting: apps/opal_mobile/src/__tests__/r21Laws.test.ts
 * (buildHomeSnapshot) and the backend ProductShell cases in
 * apps/opal_core/test/opal_core/social_flow/r21_greeting_law_test.exs.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { C2CenterOpening } from "./C2CenterOpening";
import { greetingWordForViewer, hourInViewerTimeZone, openingFromPlans } from "./shellData";
import type { OpalPlanContract } from "../../api/productClient";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;
let root: Root | null = null;

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  host?.remove();
  host = null;
  document.body.innerHTML = "";
});

// One fixed instant: 2026-10-20T02:00:00Z is 19:00 on Oct 19 in
// Los Angeles (evening), 11:00 on Oct 20 in Tokyo (morning), and
// 15:00 on Oct 20 in Auckland (afternoon).
const INSTANT = new Date("2026-10-20T02:00:00Z");

const plan = (extra: Partial<OpalPlanContract>): OpalPlanContract => ({
  id: "p1",
  title: "Dinner with Ethan Walker",
  status: "agreed",
  time_label: "Saturday 7 PM",
  location: "Juniper & Ivy",
  ...extra,
});

describe("R21 L-1 Center - the greeting word follows the viewer's timezone", () => {
  it("the same instant renders evening / morning / afternoon under three viewer timezones", () => {
    expect(openingFromPlans([], "Sadeil", { now: INSTANT, timeZone: "America/Los_Angeles" }).greeting).toBe(
      "Good evening, Sadeil.",
    );
    expect(openingFromPlans([], "Sadeil", { now: INSTANT, timeZone: "Asia/Tokyo" }).greeting).toBe(
      "Good morning, Sadeil.",
    );
    expect(openingFromPlans([], "Sadeil", { now: INSTANT, timeZone: "Pacific/Auckland" }).greeting).toBe(
      "Good afternoon, Sadeil.",
    );
    expect(greetingWordForViewer(INSTANT, "America/Los_Angeles")).toBe("Good evening.");
    expect(greetingWordForViewer(INSTANT, "Asia/Tokyo")).toBe("Good morning.");
  });

  it("the viewer hour is read in the named timezone, not UTC", () => {
    // The UTC hour of the instant is 2 - a UTC greeting would say
    // morning for everyone. The Los Angeles viewer hour is 19.
    expect(INSTANT.getUTCHours()).toBe(2);
    expect(hourInViewerTimeZone(INSTANT, "America/Los_Angeles")).toBe(19);
    expect(hourInViewerTimeZone(INSTANT, "Asia/Tokyo")).toBe(11);
  });

  it("with no explicit timezone, the hour falls back to the browser-local hour", () => {
    expect(hourInViewerTimeZone(INSTANT)).toBe(INSTANT.getHours());
    // An invalid timezone takes the same browser-local fallback,
    // never a server or seed timezone.
    expect(hourInViewerTimeZone(INSTANT, "Not/AZone")).toBe(INSTANT.getHours());
  });
});

describe("R21 L-1 Center - the greeting name is the signed-in viewer's own", () => {
  it("two distinct viewers are each greeted by their own name, at the same instant and timezone", () => {
    const opts = { now: INSTANT, timeZone: "America/Los_Angeles" };
    const sadeil = openingFromPlans([], "Sadeil Reyes", opts).greeting;
    const ethan = openingFromPlans([], "Ethan Walker", opts).greeting;
    expect(sadeil).toBe("Good evening, Sadeil.");
    expect(ethan).toBe("Good evening, Ethan.");
    expect(sadeil).not.toContain("Ethan");
    expect(ethan).not.toContain("Sadeil");
  });

  it("a plan naming a counterparty never leaks that name into the viewer's greeting", () => {
    const opening = openingFromPlans([plan({})], "Sadeil Reyes", {
      now: INSTANT,
      timeZone: "America/Los_Angeles",
    });
    expect(opening.greeting).toBe("Good evening, Sadeil.");
    expect(opening.greeting).not.toContain("Ethan");
  });

  it("the rendered Center surface shows exactly the viewer's greeting", async () => {
    const opening = openingFromPlans([plan({})], "Sadeil Reyes", {
      now: INSTANT,
      timeZone: "Asia/Tokyo",
    });
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => {
      root!.render(
        <C2CenterOpening
          projection={opening}
          events={{ openGraph: () => undefined, makeSomethingHappen: () => undefined, completeSlot: () => undefined }}
        />,
      );
    });
    const h1 = host.querySelector("h1");
    expect(h1?.textContent).toBe("Good morning, Sadeil.");
    expect(host.textContent).not.toContain("Good morning, Ethan");
  });
});
