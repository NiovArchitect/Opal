/**
 * Repair #21 - Cluster L-LAWS, law L-1 (Flows leg): THE GREETING IS
 * TRUE (founder law, 2026-10-20 13:23 PDT).
 *
 * Flows (the mobile Home surface, accessibilityLabel "Flows")
 * composes its greeting in buildHomeSnapshot. Pre-L-1 it read the
 * UTC hour (`hourUTC` / getUTCHours) - the same instant greeted a
 * Los Angeles viewer "Good morning" at 7 PM their time. These pins
 * hold the fixed law:
 * - the SAME pinned instant renders the evening word under
 *   America/Los_Angeles and the morning word under Asia/Tokyo;
 * - with no explicit timezone, the hour is the device-local hour;
 * - two distinct signed-in viewers are each greeted by their OWN
 *   name (the snapshot's displayName is the viewer's own, passed by
 *   HomeScreen from the signed-in session - never a counterparty).
 *
 * The Center leg is pinned in apps/opal_web (r21Laws.test.tsx) and
 * the server Flows leg (ProductShell.home_snapshot) in
 * apps/opal_core/test/opal_core/social_flow/r21_greeting_law_test.exs.
 */
import { buildHomeSnapshot, hourInViewerTimeZone } from "../shell/homeModel";

// One fixed instant: 2026-10-20T02:00:00Z is 19:00 on Oct 19 in
// Los Angeles (evening) and 11:00 on Oct 20 in Tokyo (morning).
const INSTANT = new Date("2026-10-20T02:00:00Z");

describe("R21 L-1 Flows - the greeting word follows the viewer's timezone", () => {
  test("the same instant renders evening in Los Angeles and morning in Tokyo", () => {
    const la = buildHomeSnapshot({
      displayName: "Alex",
      needsYou: [],
      comingUp: [],
      now: INSTANT,
      timeZone: "America/Los_Angeles",
    });
    const tokyo = buildHomeSnapshot({
      displayName: "Alex",
      needsYou: [],
      comingUp: [],
      now: INSTANT,
      timeZone: "Asia/Tokyo",
    });
    expect(la.greeting).toBe("Good evening, Alex.");
    expect(tokyo.greeting).toBe("Good morning, Alex.");
  });

  test("the viewer hour is not the UTC hour", () => {
    expect(INSTANT.getUTCHours()).toBe(2);
    expect(hourInViewerTimeZone(INSTANT, "America/Los_Angeles")).toBe(19);
    expect(hourInViewerTimeZone(INSTANT, "Asia/Tokyo")).toBe(11);
    // No explicit timezone: the device-local hour, by construction.
    expect(hourInViewerTimeZone(INSTANT)).toBe(INSTANT.getHours());
    expect(hourInViewerTimeZone(INSTANT, "Not/AZone")).toBe(INSTANT.getHours());
  });

  test("the viewerHour pinned-clock override still names the viewer's hour", () => {
    const home = buildHomeSnapshot({
      displayName: "Alex",
      needsYou: [],
      comingUp: [],
      viewerHour: 9,
    });
    expect(home.greeting).toBe("Good morning, Alex.");
  });
});

describe("R21 L-1 Flows - the greeting name is the signed-in viewer's own", () => {
  test("two distinct viewers are each greeted by their own name", () => {
    const opts = { needsYou: [], comingUp: [], now: INSTANT, timeZone: "America/Los_Angeles" };
    const a = buildHomeSnapshot({ displayName: "Sadeil Reyes", ...opts });
    const b = buildHomeSnapshot({ displayName: "Ethan Walker", ...opts });
    expect(a.greeting).toBe("Good evening, Sadeil Reyes.");
    expect(b.greeting).toBe("Good evening, Ethan Walker.");
    expect(a.greeting).not.toContain("Ethan");
    expect(b.greeting).not.toContain("Sadeil");
  });
});
