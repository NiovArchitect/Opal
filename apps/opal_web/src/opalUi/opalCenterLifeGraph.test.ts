/**
 * Center V2 Behavior Convergence — structural contracts.
 * Not R2/R3. Visual shell remains 1094:161; intelligence is real DI.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(root, "src", rel), "utf8");

describe("Opal Center V2 behavior convergence", () => {
  const center = read("opalUi/OpalCenterLifeGraph.tsx");

  it("calls resolveDecision with idempotency_key", () => {
    expect(center).toMatch(/resolveDecision/);
    expect(center).toMatch(/idempotency_key/);
    expect(center).toMatch(/idempotencyKey/);
  });

  it("guards stale async results with request generation", () => {
    expect(center).toMatch(/requestGen/);
    expect(center).toMatch(/gen !== requestGen\.current/);
  });

  it("accept is idempotent (double-tap safe)", () => {
    expect(center).toMatch(/acceptLock/);
    expect(center).toMatch(/if \(acceptLock\.current\) return/);
  });

  it("keeps claim provenance internal and never paints tech leaks", () => {
    expect(center).toMatch(/provenance/);
    expect(center).toMatch(/decision_intelligence/);
    expect(center).toMatch(/opal-center-provenance/);
    expect(center).toMatch(/data-consumer-visible="0"/);
    expect(center).toMatch(/ARCHITECTURE_STAYS_BEHIND_THE_GLASS|humanResolveNote/);
    // Consumer copy must not paint internal source tokens.
    expect(center).not.toMatch(/Source:\s*\$\{/);
    expect(center).not.toMatch(/Resolving with Decision Intelligence/);
  });

  it("does not reintroduce rejected 1086 neural dashboard", () => {
    expect(center).not.toMatch(/neural-field/);
    expect(center).toMatch(/1094:161/);
  });

  it("OpalApp Solo Center still mounts Life Graph (dock 1114 supersedes embedded 92pt)", () => {
    const app = read("OpalApp.tsx");
    expect(app).toMatch(/OpalCenterLifeGraph/);
    expect(app).toMatch(/data-figma-dock="1114:2"/);
  });

  it("OC-1 adds chat phase + Talk to Opal without touching conversation phase", () => {
    expect(center).toMatch(/"chat"/);
    expect(center).toMatch(/Talk to Opal/);
    expect(center).toMatch(/opal-center-talk-to-opal/);
    expect(center).toMatch(/OpalCenterChat/);
    expect(center).toMatch(/phase === "conversation"/);
    expect(center).toMatch(/opal-center-conversation/);
  });

  it("Repair #4: rest composer + chips use one intelligence path (OC chat), not hardcoded nearby_now", () => {
    expect(center).toMatch(/function openChatWith/);
    expect(center).toMatch(/setChatSeed/);
    expect(center).toMatch(/initialMessage=\{chatSeed\}/);
    // Primary rest entries must route through openChatWith → chat phase.
    expect(center).toMatch(/onClick=\{\(\) => openChatWith\(\)\}/);
    expect(center).toMatch(/openChatWith\("What's nearby in an open window\?"\)/);
    expect(center).toMatch(/openChatWith\("What's next\?"\)/);
    expect(center).toMatch(/openChatWith\("Ideas for tonight nearby"\)/);
    // Free-text composer must not force intent nearby_now on the primary path.
    // (DI nearby_now may remain only for conversation-phase Timing/Budget/Vibe adjustments.)
    const composerSendIdx = center.indexOf('data-testid="opal-center-send"');
    expect(composerSendIdx).toBeGreaterThan(-1);
    const afterSend = center.slice(composerSendIdx, composerSendIdx + 280);
    expect(afterSend).toMatch(/openChatWith/);
    expect(afterSend).not.toMatch(/askAboutDay/);
  });

  it("Paste J Phase 1: Go with this creates durable center plan", () => {
    expect(center).toMatch(/createCenterPlan/);
    expect(center).toMatch(/onPlanCreated/);
    expect(center).not.toMatch(/Opal has the file in this conversation/);
  });

  it("Paste J Phase 1: attach + mic are honest", () => {
    expect(center).toMatch(/I can see .+ here\. I can't read it into the conversation yet/);
    expect(center).toMatch(/listenOnce|OpalLivingCharacter/);
    expect(center).toMatch(/Ideas to try|Sample prompts|opal-center-sample-prompts-note/);
    expect(center).toMatch(/opal-center-week-empty/);
    expect(center).toMatch(/Leave time when location is available/);
  });

  it("W6A1: Center presence is living character voice button", () => {
    expect(center).toMatch(/OpalLivingCharacter/);
    expect(center).toMatch(/opal-center-presence/);
    expect(center).not.toMatch(/OpalPresenceOrb/);
  });

  it("Paste W6 Phase 5: now strip is live + sample vs calendar honesty", () => {
    expect(center).toMatch(/composeNowStrip/);
    expect(center).toMatch(/STRIP_TICK_MS/);
    expect(center).toMatch(/fetchCalendarToday/);
    expect(center).toMatch(/data-strip-source/);
    expect(center).toMatch(/data-sample-day/);
    expect(center).toMatch(/stripAttribution/);
    expect(center).not.toMatch(/REST_NODES/);
  });

  it("Investor honesty: rest lede + nearby chips do not fake free windows or curation", () => {
    expect(center).not.toMatch(/Two open windows before tonight/);
    expect(center).toMatch(/opal-center-rest-lede/);
    // Repair #17 W5 — sample-day lede replaced by the honest empty state:
    // the strip renders live calendar/plans data or nothing fake at all.
    expect(center).toMatch(/Nothing on your day yet/);
    expect(center).not.toMatch(/Sample day below/);
    expect(center).toMatch(/Nearby now/);
    expect(center).toMatch(/Tonight ideas/);
    expect(center).not.toMatch(/Curate my time/);
    expect(center).not.toMatch(/Move something/);
  });
});

describe("Paste J media validation", () => {
  it("blocks executables and oversized files", async () => {
    const { validateAttachmentFile, MAX_ATTACH_BYTES } = await import(
      "../mediaAcquisition"
    );
    expect(validateAttachmentFile({ name: "x.exe", type: "application/x-msdownload", size: 10 }).ok).toBe(
      false,
    );
    expect(
      validateAttachmentFile({ name: "photo.jpg", type: "image/jpeg", size: MAX_ATTACH_BYTES + 1 })
        .ok,
    ).toBe(false);
    expect(validateAttachmentFile({ name: "menu.jpg", type: "image/jpeg", size: 1000 }).ok).toBe(
      true,
    );
  });
});

