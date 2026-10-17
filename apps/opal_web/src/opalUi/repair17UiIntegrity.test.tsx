/**
 * @vitest-environment jsdom
 *
 * Repair #17 (W3) — walk-surface UI integrity:
 * 1. Story composer mounts in the top layer (portal), above Home/social.
 * 2. Chat-list pill text is contained by its pill (own truncating element).
 * 3. Chat list + thread resolve plan status/color from ONE shared
 *    projection derivation (planProjectionSurfaceState -> planStateColors).
 * 4. Composer integrity: no stray chevron glyph, KEYBOARD_SAFE contract
 *    intact, typed text clears the voice/send controls, and the plan
 *    (alignment) card is fully opaque so bubbles never ghost through it.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { StoryCreateFlow } from "./StoryCreateFlow";
import { ChatsHome, type ChatsHomeRow } from "./ChatsHome";
import { planProjectionSurfaceState } from "./nextPlan";
import { planStateColor, PLAN_STATE_HEX } from "../theme/planStateColors";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const root = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(root, "src", rel), "utf8");

describe("Repair #17 W3 — story composer top layer", () => {
  it("StoryCreateFlow portals to document.body, not inside the app shell", async () => {
    const host = document.createElement("div");
    host.setAttribute("data-testid", "fake-app-shell");
    document.body.appendChild(host);
    const reactRoot = createRoot(host);
    await act(async () => {
      reactRoot.render(<StoryCreateFlow onClose={() => {}} />);
    });
    const flow = document.querySelector('[data-testid="story-create-flow"]');
    expect(flow).not.toBeNull();
    // Portal contract (Repair #18): the composer mounts through the ONE
    // TopLayer portal - the TopLayer host is a direct child of <body>, so
    // the flow cannot be trapped under the Home/social stacking context.
    const topLayer = flow?.parentElement;
    expect(topLayer?.getAttribute("data-top-layer")).toBe("portal-body");
    expect(topLayer?.parentElement).toBe(document.body);
    expect(topLayer?.getAttribute("data-top-layer-band")).toBe("flow");
    expect(host.contains(flow)).toBe(false);
    expect(flow?.getAttribute("data-top-layer")).toBe("portal-body");
    await act(async () => reactRoot.unmount());
    host.remove();
  });

  it("story-create CSS uses the layer registry token, never a literal", () => {
    const css = read("styles.css");
    expect(css).toMatch(/\.story-create-flow \{[^}]*z-index: var\(--layer-flow\)/);
    // The native-host 10060 magic number is gone - the registry token
    // already sits in the flow band above the dock.
    expect(css).not.toMatch(/z-index: 10060/);
  });
});

describe("Repair #17 W3 — chat-list pill containment", () => {
  it("pill label renders inside its own truncating element", async () => {
    const longLabel =
      "Farmers market + coast with an extremely long unbroken suffix word";
    const rows: ChatsHomeRow[] = [
      {
        id: "chat-maya",
        name: "Maya",
        kind: "direct",
        preview: "Saturday?",
        when: "9:41 AM",
        planConsequence: { state: "forming", label: longLabel, planId: "p1" },
      },
    ];
    const host = document.createElement("div");
    document.body.appendChild(host);
    const reactRoot = createRoot(host);
    await act(async () => {
      reactRoot.render(<ChatsHome rows={rows} onOpenChat={() => {}} />);
    });
    const pill = host.querySelector('[data-testid="chat-plan-pill"]');
    expect(pill).not.toBeNull();
    const label = pill?.querySelector(".chats-plan-pill-label");
    expect(label).not.toBeNull();
    expect(label?.textContent).toBe(longLabel);
    // No bare text node directly under the pill (the old overflow source).
    const bareText = [...(pill?.childNodes || [])].filter(
      (n) => n.nodeType === Node.TEXT_NODE && (n.textContent || "").trim(),
    );
    expect(bareText).toEqual([]);
    await act(async () => reactRoot.unmount());
    host.remove();
  });

  it("CSS: pill can shrink and its label ellipsizes inside the pill bounds", () => {
    const css = read("styles.css");
    const pillBlock = css.match(/\.chats-plan-pill \{([^}]*)\}/)?.[1] || "";
    expect(pillBlock).toMatch(/flex: 0 1 auto/);
    expect(pillBlock).toMatch(/min-width: 0/);
    expect(pillBlock).not.toMatch(/flex-shrink: 0/);
    const labelBlock =
      css.match(/\.chats-plan-pill-label \{([^}]*)\}/)?.[1] || "";
    expect(labelBlock).toMatch(/overflow: hidden/);
    expect(labelBlock).toMatch(/text-overflow: ellipsis/);
    expect(labelBlock).toMatch(/white-space: nowrap/);
    // Calls-surface audit sibling: long signal words wrap inside the row.
    const signalBlock =
      css.match(/\.calls-signal-label,\s*\.calls-signal-action \{([^}]*)\}/)?.[1] ||
      "";
    expect(signalBlock).toMatch(/overflow-wrap: anywhere/);
  });
});

describe("Repair #17 W3 — one status source for list and thread", () => {
  const base = {
    execution_label: "Reservation approved",
    upcoming_ready: true,
    temporal_state: "future",
    canonical_start_at: "2999-09-29T19:30:00Z",
    timezone: "America/Los_Angeles",
  };

  it("a change proposed by the OTHER person resolves to action everywhere", () => {
    const state = planProjectionSurfaceState(
      { ...base, pending_change: true, pending_proposal_by_user_id: "user-maya" },
      "user-me",
    );
    expect(state).toBe("action");
    expect(planStateColor(state)).toBe(PLAN_STATE_HEX.action);
    expect(PLAN_STATE_HEX.action).toBe("#FF4D5E");
  });

  it("a change proposed by the VIEWER stays forming (same as the thread)", () => {
    const state = planProjectionSurfaceState(
      { ...base, pending_change: true, pending_proposal_by_user_id: "user-me" },
      "user-me",
    );
    expect(state).toBe("forming");
    expect(planStateColor(state)).toBe(PLAN_STATE_HEX.forming);
  });

  it("ready / past resolve through the same function and canonical colors", () => {
    expect(planProjectionSurfaceState({ ...base }, "user-me")).toBe("ready");
    expect(planStateColor("ready")).toBe("#FFC86B");
    expect(
      planProjectionSurfaceState(
        { ...base, temporal_state: "past" },
        "user-me",
      ),
    ).toBe("past");
    expect(planStateColor("past")).toBe("#FFFFFF");
    expect(planStateColor("happening")).toBe("#00E5FF");
  });

  it("OpalApp list + Graphs call sites use the shared derivation only", () => {
    const app = read("OpalApp.tsx");
    expect(app).toMatch(/planProjectionSurfaceState\(\s*c\.planProjection,\s*session\?\.user_id/);
    expect(app).toMatch(/planProjectionSurfaceState\(plan, session\?\.user_id\)/);
    // The old list-local re-derivation (no needsViewer term) is gone.
    expect(app).not.toMatch(/commitment: c\.planProjection\.execution_label/);
    expect(app).not.toMatch(/commitment: plan\.execution_label \? "execution_ready" : "aligned",\s*\n\s*pendingChange: plan\.pending_change/);
  });

  it("projection plumbing carries the proposer end to end", () => {
    const data = read("data.ts");
    expect(data).toMatch(/pending_proposal_by_user_id\?: string \| null/);
    const reality = read("opalUi/graphReality.ts");
    expect(reality).toMatch(
      /pending_proposal_by_user_id: text\(raw\.pending_proposal_by_user_id\)/,
    );
    // Repair #18: canonicalGraphFromChat calls the derivation WITH the
    // viewer id - the R17 viewer-less call (asserted here before) could
    // never resolve someone else's proposal to action on this surface.
    expect(reality).toMatch(/planProjectionSurfaceState\(plan, viewerUserId\)/);
    expect(reality).not.toMatch(/planProjectionSurfaceState\(plan\)/);
    const app = read("OpalApp.tsx");
    expect(app).toMatch(
      /canonicalGraphFromChat\(chat, session\?\.display_name \|\| null, session\?\.user_id\)/,
    );
  });

  it("canonicalGraphFromChat resolves action for the viewer from the same projection", async () => {
    const { canonicalGraphFromChat } = await import("./graphReality");
    const { clientPlanFields } = await import("./graphReality");
    const projection = clientPlanFields(
      {
        lineage_id: "plan-1",
        conversation_id: "conv-1",
        when_label: "Thursday - 7:30 PM",
        place: "Juniper & Ivy",
        execution_label: "Reservation approved",
        upcoming_ready: true,
        temporal_state: "future",
        canonical_start_at: "2999-09-29T19:30:00Z",
        timezone: "America/Los_Angeles",
        pending_change: true,
        pending_proposal_by_user_id: "user-maya",
        going_count: 3,
        total_count: 4,
        viewer_state: "pending",
      },
      "conv-1",
    );
    const chat = {
      id: "conv-1",
      name: "Chanelle",
      preview: "",
      time: "",
      planProjection: projection,
      peers: [{ id: "user-maya", display_name: "Maya" }],
    } as never;
    const graph = canonicalGraphFromChat(chat, "Me", "user-me");
    expect(graph?.state).toBe("action");
    expect(graph?.goingCount).toBe(3);
    expect(graph?.totalCount).toBe(4);
    expect(graph?.viewerState).toBe("pending");
    // The proposer's own view of the same projection stays forming.
    const proposerGraph = canonicalGraphFromChat(chat, "Maya", "user-maya");
    expect(proposerGraph?.state).toBe("forming");
  });
});

describe("Repair #17 W3 — composer integrity", () => {
  it("composer markup contains no stray chevron glyph; voice is a mic icon", () => {
    const app = read("OpalApp.tsx");
    // The chevron character must not exist anywhere in the app source.
    expect(app.includes("〉")).toBe(false);
    const composerStart = app.indexOf('data-testid="composer"');
    const composerEnd = app.indexOf("</form>", composerStart);
    const composer = app.slice(composerStart, composerEnd);
    expect(composer).not.toMatch(/›|〉/);
    expect(composer).toMatch(/<VoiceMicIcon \/>/);
    expect(composer).toMatch(/data-testid="composer-voice"/);
    expect(composer).toMatch(/data-testid="composer-send"/);
  });

  it("KEYBOARD_SAFE contract still matches the current composer markup", () => {
    const css = read("styles.css");
    const app = read("OpalApp.tsx");
    // Markup side of the contract: the form carries composer-618 and the
    // dock carries tabbar-option-b in the conversation branch.
    expect(app).toMatch(/composer glass composer-618/);
    expect(app).toMatch(/className="tabbar tabbar-option-b"/);
    // CSS side: keyboard-open moves the composer to the visual viewport and
    // hides the dock (phone media query + native-host rule).
    expect(css).toMatch(
      /:has\(\.composer-618:focus-within\)[^{]*\.composer-618 \{[^}]*position: fixed !important/,
    );
    expect(css).toMatch(
      /:has\(\.composer-618:focus-within\)[^{]*\.tabbar\.tabbar-option-b \{[^}]*opacity: 0 !important/,
    );
    // Typed text clears the voice/send controls (input right padding).
    const inputBlock =
      css.match(
        /\.app\[data-testid="member-conversation"\] \.composer-618 \.composer-input \{([^}]*)\}/,
      )?.[1] || "";
    expect(inputBlock).toMatch(/padding: 0 36px 0 8px/);
  });

  it("the plan (alignment) card is fully opaque — no ghosting over bubbles", () => {
    const css = read("styles.css");
    const cardBlock = css.match(/^\.alignment-card \{([^}]*)\}/m)?.[1] || "";
    expect(cardBlock).toMatch(/background: rgb\(11, 18, 38\)/);
    expect(cardBlock).not.toMatch(/rgba\(11, 18, 38, 0\.94\)/);
    expect(cardBlock).not.toMatch(/opacity:/);
  });
});
