import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("Home social action destinations (Figma exist → implementation)", () => {
  it("Memory detail is 437:3 SOCIAL-01 with identity markers", () => {
    const src = readFileSync(resolve(root, "opalUi/MemoryDetailSheet.tsx"), "utf8");
    expect(src).toMatch(/data-figma-node="437:3"/);
    expect(src).toMatch(/data-screen="social-memory-detail"/);
    expect(src).toMatch(/memory-detail-sheet/);
    expect(src).toMatch(/memory-detail-like/);
    expect(src).toMatch(/memory-detail-comment/);
    expect(src).not.toMatch(/social-sheet-close/);
  });

  it("Comments is 437:69 SOCIAL-02 with sheet-local Close", () => {
    const src = readFileSync(resolve(root, "opalUi/MemoryCommentsSheet.tsx"), "utf8");
    expect(src).toMatch(/data-figma-node="437:69"/);
    expect(src).toMatch(/data-screen="social-comments"/);
    expect(src).toMatch(/comments-modal-sheet/);
    expect(src).toMatch(/do not create a Connection/i);
  });

  it("Forward picker is 437:133 Send to with Separately/Together", () => {
    const src = readFileSync(resolve(root, "opalUi/ForwardSharePicker.tsx"), "utf8");
    expect(src).toMatch(/data-figma-node="437:133"/);
    expect(src).toMatch(/data-screen="social-forward"/);
    expect(src).toMatch(/Send to/);
    expect(src).toMatch(/forward-send-separately/);
    expect(src).toMatch(/forward-send-together/);
    expect(src).toMatch(/does not create a Connection/i);
  });

  it("Story viewer 357:418 and create 476:92", () => {
    const viewer = readFileSync(resolve(root, "opalUi/StoryViewer.tsx"), "utf8");
    const create = readFileSync(resolve(root, "opalUi/StoryCreateFlow.tsx"), "utf8");
    expect(viewer).toMatch(/data-figma-node="357:418"/);
    // P0: no customer-facing "Temporary Story" label
    expect(viewer).not.toMatch(/>Temporary story</);
    expect(viewer).toMatch(/IMAGE_STORY_MS|7000/);
    expect(viewer).toMatch(/story-viewer-357-418/);
    expect(viewer).toMatch(/story-viewer-nav/);
    expect(create).toMatch(/476:92/);
    expect(create).toMatch(/story-create-share/);
  });

  it("Discovery detail 437:200 Follow ≠ Connection", () => {
    const src = readFileSync(resolve(root, "opalUi/DiscoveryDetailSheet.tsx"), "utf8");
    expect(src).toMatch(/data-figma-node="437:200"/);
    expect(src).toMatch(/data-screen="social-discovery-detail"/);
    expect(src).toMatch(/Follow ≠ Connection/);
    expect(src).toMatch(/Graph this/);
  });

  it("interest_state remains distinct from going/committed", () => {
    const eng = readFileSync(resolve(root, "opalUi/homeEngagementStore.ts"), "utf8");
    expect(eng).toMatch(/graphInterest/);
    expect(eng).toMatch(/graphGoing/);
    expect(eng).toMatch(/Soft interest/);
  });
});
