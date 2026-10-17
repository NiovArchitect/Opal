/**
 * Repair #17 — seed-kill guards (replaces seedThreadIntelligence.test.ts).
 *
 * The old suite tested the scripted seed layer's quarantine contract.
 * Repair #17 deletes the layer itself, so the contract is now structural:
 *
 *  (a) The scripted-responder module is GONE and nothing on the send/open
 *      paths imports or references a responder symbol.
 *  (b) The send path in OpalApp is a single real network path: with a
 *      session, `send()` calls the product client's `sendMessage` — with
 *      the founder seed flag ON or OFF. No seed gate, no local-only paint
 *      branch, no scripted reply hook exists in the function.
 *  (c) Opening a person can only yield a real backend conversation id
 *      (behavioral matrix lives in openPersonChat.test.ts; the source
 *      guard for the resolver lives here).
 *
 * These are source-structure assertions because OpalApp is a 12k-line
 * shell that cannot be mounted in isolation; the repo's established
 * pattern for shell contracts is exactly this (see
 * founderCommunicationSeed.test.ts). The pure functions the shell routes
 * through (resolvePersonChatTarget, composeChatsList) carry the
 * behavioral proofs in their own suites.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ALEX_MEXICO_TRIP_MEMORIES,
  isAlexTripGraphTarget,
} from "./alexTripMemories";

const here = dirname(fileURLToPath(import.meta.url));
const readSrc = (rel: string) => readFileSync(resolve(here, rel), "utf8");

const app = readSrc("../OpalApp.tsx");
const openPerson = readSrc("./openPersonChat.ts");
const centerChat = readSrc("./OpalCenterChat.tsx");
const interop = readSrc("./graphSurfaceInterop.ts");
const pills = readSrc("./founderChatsPlanPills.ts");

const RESPONDER_SYMBOLS = [
  "interpretSeedThreadReply",
  "applySeedThreadIntelligence",
  "isSeedDemoChatTarget",
  "seedChatKeyFrom",
  "seedChatIdForPersonName",
  "seedPeerAttribution",
  "SeedSimulatedBanner",
  "resolveFounderSeedThread",
  "founderSeedThreadMessages",
  "founderSeedConversationIdForName",
  "collectSeedLocalExtras",
  "planFromLocalConfirm",
] as const;

function sliceBetween(src: string, start: string, end: string): string {
  const a = src.indexOf(start);
  expect(a, `start marker missing: ${start}`).toBeGreaterThanOrEqual(0);
  const b = src.indexOf(end, a);
  expect(b, `end marker missing: ${end}`).toBeGreaterThan(a);
  return src.slice(a, b);
}

describe("Repair #17 (a) — scripted seed layer is deleted and unreferenced", () => {
  it("seedThreadIntelligence.ts no longer exists", () => {
    expect(existsSync(resolve(here, "seedThreadIntelligence.ts"))).toBe(false);
    expect(existsSync(resolve(here, "seedThreadIntelligence.test.ts"))).toBe(
      false,
    );
  });

  it("OpalApp imports no scripted-responder module and references no responder symbol", () => {
    expect(app).not.toMatch(/from\s+["'][^"']*seedThreadIntelligence["']/);
    for (const sym of RESPONDER_SYMBOLS) {
      expect(app, `OpalApp must not reference ${sym}`).not.toContain(sym);
    }
  });

  it("openPersonChat references no seed minting and has no founder_seed via", () => {
    for (const sym of RESPONDER_SYMBOLS) {
      expect(openPerson, `openPersonChat must not reference ${sym}`).not.toContain(sym);
    }
    expect(openPerson).not.toContain("founder_seed");
    expect(openPerson).not.toContain("founderSeedEnabled");
  });

  it("OpalCenterChat has no local plan fabrication and no seed gate", () => {
    expect(centerChat).not.toContain("planFromLocalConfirm");
    expect(centerChat).not.toContain("isFounderSeedEnabled");
    expect(centerChat).not.toContain("lastUserPlanAsk");
    expect(centerChat).not.toMatch(/is on your Graph/);
  });

  it("graphSurfaceInterop no longer exports a local-confirm fabricator", () => {
    expect(interop).not.toMatch(/export function planFromLocalConfirm/);
  });

  it("founderChatsPlanPills carries DATA only — no scripted thread content", () => {
    expect(pills).not.toContain("SEED_THREADS_BY_KEY");
    expect(pills).not.toContain("resolveFounderSeedThread");
    expect(pills).not.toContain("founderSeedThreadMessages");
    // Thread-only fixture bodies that used to be painted as conversations
    // (row preview strings are list DATA and lawfully remain):
    expect(pills).not.toContain("Dinner might work Saturday");
    expect(pills).not.toContain("Opal lined this up");
    expect(pills).not.toContain("Still waiting on Chanelle");
  });
});

describe("Repair #17 (b) — send path is the real network path, seed flag or not", () => {
  const sendSrc = sliceBetween(
    app,
    "const send = async () => {",
    "Brand V4 / Direct open",
  );

  it("send() calls the product client sendMessage boundary exactly once", () => {
    expect(sendSrc).toContain(
      "await sendMessage(activeChatId, body, session.access_token)",
    );
    expect(sendSrc.match(/sendMessage\(/g)?.length).toBe(1);
  });

  it("send() contains no seed gate, no demo shim, no scripted-reply hook", () => {
    expect(sendSrc).not.toContain("isFounderSeedEnabled");
    expect(sendSrc).not.toContain("isSeedDemoChatTarget");
    expect(sendSrc).not.toContain("DEMO SHIM");
    expect(sendSrc).not.toContain("seed-chat");
    expect(sendSrc).not.toContain("applySeedThreadIntelligence");
  });

  it("the authenticated branch paints ONLY from the network result or an honest failure", () => {
    const sessionBranch = sendSrc.slice(
      sendSrc.indexOf("if (session) {"),
      sendSrc.indexOf("// Unauthenticated preview path"),
    );
    // Local-bubble paint (id: `local-…`) is forbidden in the session branch:
    // the success paint is keyed by the server message id / clientMessageId.
    expect(sessionBranch).not.toContain("local-${Date.now()}");
    expect(sessionBranch).toContain("deliveryState: \"sent\"");
    expect(sessionBranch).toContain("deliveryState: \"failed\"");
  });

  it("openChat hydrates ONLY via the real listMessages path", () => {
    const openSrc = sliceBetween(
      app,
      "const openChat = async (id: string) => {",
      "const openAlexTripMemories",
    );
    expect(openSrc).toContain("await listMessages(id, session.access_token)");
    expect(openSrc).toContain("productRealtime.joinConversation(id)");
    expect(openSrc).not.toContain("resolveFounderSeedThread");
    expect(openSrc).not.toContain("mapSeedTurns");
    expect(openSrc).not.toContain("matchedSeedRow");
    expect(openSrc).not.toContain("founderSeedThreadMessages");
  });

  it("the chats list has NO hard fallback that paints fixture rows", () => {
    expect(app).not.toContain("chats-list-hard-fallback");
    expect(app).not.toMatch(
      /return applyTravelToChatRows\(FOUNDER_CHATS_PLAN_PILL_ROWS/,
    );
  });

  it("the founder walk still seeds REAL backend data (bootstrap kept)", () => {
    // Seed is DATA: with the flag on, refreshLive asks the backend to
    // create the real founder conversations/plans, then reads them back
    // through the same listConversations authority as production.
    expect(app).toContain("ensureFounderCommunicationSeed");
    expect(app).toContain("ensureFounderGraphCommitmentSeed");
    expect(app).toContain("await listConversations(s.access_token)");
  });
});

describe("Repair #17 (c) — person-open wiring in the shell", () => {
  it("openChatForPerson routes through the seedless resolver", () => {
    const src = sliceBetween(
      app,
      "const openChatForPerson = async",
      "if (resolved.ok) {",
    );
    expect(src).toContain("resolvePersonChatTarget(target, chats)");
    expect(src).not.toContain("founderSeedEnabled");
  });

  it("the profile effect never mints a seed conversation id or handle", () => {
    const src = sliceBetween(
      app,
      "setProfileConversationId(fromChat?.id || peer?.conversationId || null);",
      "const peerHandle = fromChat?.peers?.[0]?.handle || null;",
    );
    expect(src).not.toContain("seed");
  });
});

describe("seed DATA that lawfully remains (not behavior)", () => {
  it("exposes exactly 14 Alex Mexico memories as trip data", () => {
    expect(ALEX_MEXICO_TRIP_MEMORIES).toHaveLength(14);
    expect(ALEX_MEXICO_TRIP_MEMORIES.every((m) => m.person === "Alex")).toBe(true);
    expect(isAlexTripGraphTarget("seed-alex-graph-gallery")).toBe(true);
    expect(isAlexTripGraphTarget("Trip Graph · Mexico City - 14 memories")).toBe(true);
  });
});
