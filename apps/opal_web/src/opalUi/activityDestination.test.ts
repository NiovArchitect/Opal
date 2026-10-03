import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname);

describe("ActivityDestination A6.1 Attention Center", () => {
  const src = readFileSync(resolve(root, "ActivityDestination.tsx"), "utf8");
  const client = readFileSync(resolve(root, "../api/productClient.ts"), "utf8");
  const home = readFileSync(resolve(root, "GraphSocialHome.tsx"), "utf8");
  const rt = readFileSync(resolve(root, "../realtime/RealtimeClient.ts"), "utf8");

  it("projects For you / Waiting / Updated — domain needs_you stays internal", () => {
    expect(src).toMatch(/For you/);
    expect(src).toMatch(/Waiting/);
    expect(src).toMatch(/Updated/);
    expect(src).toMatch(/needs_you/);
    expect(src).toMatch(/fetchAttention/);
    expect(src).toMatch(/data-attention-center/);
    expect(src).toMatch(/Review/);
    expect(src).not.toMatch(/>Needs You</);
    expect(src).not.toMatch(/Action Required/);
    expect(src).not.toMatch(/Juniper & Ivy/);
    expect(src).not.toMatch(/Memory ready/);
  });

  it("empty For-you uses calm copy without zero chrome", () => {
    expect(src).toMatch(/Nothing needs your attention right now/);
    expect(src).toMatch(/You're all caught up/);
    expect(src).toMatch(/attention-nothing-needed/);
  });

  it("deep-links to canonical action — no second acceptance path", () => {
    expect(src).toMatch(/onOpenAttentionItem/);
    expect(src).toMatch(/deep_link/);
    expect(src).not.toMatch(/approveProposal|acceptInline/);
  });

  it("product client owns GET /api/v1/product/attention", () => {
    expect(client).toMatch(/\/api\/v1\/product\/attention/);
    expect(client).toMatch(/fetchAttention/);
    expect(client).toMatch(/actionable_count/);
  });

  it("Home Signal badge is separate from chat unread", () => {
    expect(home).toMatch(/gsh-attention-badge/);
    expect(home).toMatch(/attentionBadgeCount/);
    expect(home).toMatch(/data-attention-badge/);
  });

  it("realtime invalidates via inbox:attention", () => {
    expect(rt).toMatch(/inbox:attention/);
    expect(rt).toMatch(/onInboxAttention/);
  });
});
