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

  it("exposes claim provenance (no silent fabrication)", () => {
    expect(center).toMatch(/provenance/);
    expect(center).toMatch(/decision_intelligence/);
    expect(center).toMatch(/opal-center-provenance/);
    expect(center).toMatch(/No fabricated distance or traffic|not invent/);
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

  it("Paste J Phase 1: Go with this creates durable center plan", () => {
    expect(center).toMatch(/createCenterPlan/);
    expect(center).toMatch(/onPlanCreated/);
    expect(center).not.toMatch(/Opal has the file in this conversation/);
  });

  it("Paste J Phase 1: attach + mic are honest", () => {
    expect(center).toMatch(/I can see .+ here\. I can't read it into the conversation yet/);
    expect(center).toMatch(/listenOnce/);
    expect(center).toMatch(/Sample prompts/);
    expect(center).toMatch(/opal-center-week-empty/);
    expect(center).toMatch(/Leave time when location is available/);
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

