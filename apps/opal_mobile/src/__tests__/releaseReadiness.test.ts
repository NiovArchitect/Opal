import {
  PROFILES,
  assertProfileSafe,
  resolveProfile,
} from "../release/profiles";
import {
  initialLifecycle,
  mayCompleteHighRiskAction,
  reduceLifecycle,
} from "../release/lifecycle";
import {
  PERFORMANCE_BUDGETS,
  generateChatIds,
  generateMessageBodies,
  measureSync,
  paginate,
  PAGE_SIZE,
  assertWithinBudget,
} from "../release/performanceBudgets";
import {
  ListenerRegistry,
  runAccountSwitchCycles,
  runNavigationCycles,
} from "../release/navigationStability";
import { redactObject, assertNoSensitiveLeak } from "../release/privacyLogs";
import { authorizeDeepLink, parseDeepLink } from "../release/deepLinks";
import {
  checkContrastPair,
  checkLabel,
  checkReducedMotionCopy,
  checkTouchTarget,
  runAccessibilityGate,
} from "../release/accessibilityGate";
import { DEVICE_MATRIX, layoutSafe } from "../release/deviceMatrix";
import { homeTortureScenario } from "../release/homeTorture";
import { conversationTorture } from "../release/conversationTorture";
import { buildHomeSnapshot } from "../shell/homeModel";
import { PRIMARY_TABS } from "../shell/navigation";

describe("release profiles", () => {
  test("internal RC disables DevAuth and localhost", () => {
    const rc = PROFILES.internal_rc;
    expect(rc.devAuthEnabled).toBe(false);
    expect(rc.debugMenu).toBe(false);
    expect(rc.allowsLocalhost).toBe(false);
    expect(assertProfileSafe(rc)).toEqual([]);
    expect(assertProfileSafe(PROFILES.development)).toEqual([]);
  });

  test("resolveProfile defaults", () => {
    expect(resolveProfile(null).id).toBe("development");
    expect(resolveProfile("internal_rc").id).toBe("internal_rc");
  });
});

describe("session lifecycle", () => {
  test("boot to shell without blank or infinite spinner", () => {
    let ctx = initialLifecycle();
    ctx = reduceLifecycle(ctx, { type: "BOOT" });
    expect(ctx.blankScreen).toBe(false);
    expect(ctx.infiniteSpinner).toBe(false);
    ctx = reduceLifecycle(ctx, { type: "SHELL_READY" });
    expect(ctx.state).toBe("signed_out");
    ctx = reduceLifecycle(ctx, { type: "SIGN_IN" });
    expect(ctx.state).toBe("signed_in");
    expect(mayCompleteHighRiskAction(ctx.state)).toBe(true);
  });

  test("expired and revoked block high-risk success", () => {
    let ctx = reduceLifecycle(initialLifecycle(), { type: "SIGN_IN" });
    ctx = reduceLifecycle(ctx, { type: "SESSION_EXPIRED" });
    expect(ctx.state).toBe("session_expired");
    expect(mayCompleteHighRiskAction(ctx.state)).toBe(false);
    expect(ctx.userMessage).toMatch(/session/i);

    ctx = reduceLifecycle(ctx, { type: "DEVICE_REVOKED" });
    expect(mayCompleteHighRiskAction(ctx.state)).toBe(false);
  });

  test("offline cached then restore", () => {
    let ctx = reduceLifecycle(initialLifecycle(), { type: "SIGN_IN" });
    ctx = reduceLifecycle(ctx, { type: "NETWORK_LOST" });
    expect(ctx.state).toBe("offline_cached");
    expect(ctx.infiniteSpinner).toBe(false);
    ctx = reduceLifecycle(ctx, { type: "NETWORK_RESTORED" });
    expect(ctx.state).toBe("signed_in");
  });

  test("corrupt cache is recoverable", () => {
    let ctx = reduceLifecycle(initialLifecycle(), { type: "CACHE_CORRUPT" });
    expect(ctx.state).toBe("corrupted_cache");
    expect(ctx.blankScreen).toBe(false);
    ctx = reduceLifecycle(ctx, { type: "CLEAR_CACHE" });
    expect(ctx.state).toBe("signed_out");
  });
});

describe("performance budgets", () => {
  test("home and list work within synthetic budgets", () => {
    const chats = generateChatIds(500);
    const page = measureSync("chats_list_ms", () => paginate(chats, 0, PAGE_SIZE));
    assertWithinBudget(page.sample);
    expect(page.result).toHaveLength(PAGE_SIZE);

    const msgs = generateMessageBodies(1000);
    const page2 = measureSync("conversation_open_ms", () => paginate(msgs, 0, PAGE_SIZE));
    assertWithinBudget(page2.sample);

    const home = measureSync("home_cached_ms", () =>
      buildHomeSnapshot({
        displayName: "Alex",
        needsYou: [],
        comingUp: [],
      }),
    );
    assertWithinBudget(home.sample);
    expect(PERFORMANCE_BUDGETS.snapshot_bytes).toBeGreaterThan(0);
  });
});

describe("navigation stability", () => {
  test("100 nav cycles leave zero listeners", () => {
    const reg = new ListenerRegistry();
    const { finalListeners, maxListeners } = runNavigationCycles(reg, 100);
    expect(finalListeners).toBe(0);
    expect(maxListeners).toBeGreaterThan(0);
  });

  test("50 account switches clear listeners", () => {
    const reg = new ListenerRegistry();
    const { finalListeners } = runAccountSwitchCycles(reg, 50);
    expect(finalListeners).toBe(0);
  });
});

describe("privacy logs", () => {
  test("redacts phone token and body", () => {
    const red = redactObject({
      phone: "+12025550101",
      note: "ok",
      authorization: "Bearer abcdef123",
      nested: { otp: "123456", safe: true },
    });
    expect(red.phone).toBe("[REDACTED]");
    expect(red.authorization).toBe("[REDACTED]");
    expect((red.nested as { otp: string }).otp).toBe("[REDACTED]");
    expect(red.note).toBe("ok");
    assertNoSensitiveLeak(JSON.stringify(red));
  });
});

describe("deep links", () => {
  const ctx = {
    userId: "u1",
    memberships: new Set(["conv-1"]),
    blockedConversations: new Set(["conv-blocked"]),
    ownedNeedsYou: new Set(["ny-1"]),
    sessionValid: true,
  };

  test("authorizes membership and denies outsiders", () => {
    const t = parseDeepLink("opal://app/c/conv-1");
    expect(authorizeDeepLink(t, ctx).ok).toBe(true);
    const denied = authorizeDeepLink(parseDeepLink("opal://app/c/conv-x"), ctx);
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.reason).toBe("not_member");
  });

  test("blocked and invalid session", () => {
    const blocked = authorizeDeepLink(parseDeepLink("opal://app/c/conv-blocked"), ctx);
    expect(blocked.ok).toBe(false);
    const expired = authorizeDeepLink(parseDeepLink("opal://app/home"), {
      ...ctx,
      sessionValid: false,
    });
    expect(expired.ok).toBe(false);
  });
});

describe("accessibility gate", () => {
  test("touch targets, labels, contrast, reduced motion", () => {
    const result = runAccessibilityGate([
      checkTouchTarget(44, 48),
      checkTouchTarget(40, 40),
      checkLabel("Home, social orientation"),
      checkLabel(""),
      checkContrastPair("light", "dark_shell"),
      checkReducedMotionCopy(true, false),
    ]);
    expect(result.failures.map((f) => f.id).sort()).toEqual([
      "accessible_label",
      "touch_target",
    ]);
  });
});

describe("device matrix layout", () => {
  test("all matrix profiles have reachable primary actions", () => {
    expect(DEVICE_MATRIX.length).toBeGreaterThanOrEqual(8);
    for (const p of DEVICE_MATRIX) {
      const layout = layoutSafe(p);
      expect(layout.primaryActionsReachable).toBe(true);
      expect(layout.noHorizontalScrollForNormalCopy).toBe(true);
    }
  });
});

describe("torture: home and conversation", () => {
  test("home caps and quiet success", () => {
    const r = homeTortureScenario();
    expect(r.capped).toBeLessThanOrEqual(3);
    expect(r.quiet).toBe(true);
  });

  test("conversation order and no duplicates under chaos", () => {
    const r = conversationTorture();
    expect(r.messageCount).toBe(20);
    expect(r.ordered).toBe(true);
    expect(r.noDuplicates).toBe(true);
  });
});

describe("shell integrity", () => {
  test("still four primary tabs", () => {
    expect(PRIMARY_TABS).toHaveLength(4);
  });
});
