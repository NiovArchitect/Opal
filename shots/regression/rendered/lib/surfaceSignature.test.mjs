/**
 * Repair #21 (W-8) - signature-assertion unit tests.
 * Run: node --test shots/regression/rendered/lib/surfaceSignature.test.mjs
 * The pinned species: a Center DOM must FAIL the Flows signature
 * and a Flows DOM must FAIL the Center signature (F-18 reopened -
 * the R20 closure asserted purposes in markup and filed Center
 * frames as Flows anyway).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkSurfaceSignature,
  surfaceClaimedByFrameName,
  SURFACE_SIGNATURES,
} from "./surfaceSignature.mjs";

const CENTER_DOM = [
  '[data-testid="c2-center-opening"]',
  '[data-testid="c2-center-orb"]',
  '[data-testid="c2-opening-create"]',
];
const FLOWS_DOM = [
  '[data-testid="c2-home"]',
  '[data-testid="c2-story-rail"]',
  '[data-testid="c2-home-lead-people"]',
  '[data-testid="c2-feed"]',
];
const CHATS_DOM = ['[data-testid="people-chats-list"]', '[data-testid="chats-row"]'];
const GRAPHS_DOM = ['[data-testid="c2-graphs"]'];
const THREAD_DOM = ['[data-testid="thread-shell"]', '[data-testid="thread-composer"]'];
const PLAN_DETAIL_DOM = [
  '[data-testid="c2-graph-detail"]',
  '[data-testid="c2-detail-back"]',
];

test("a Center DOM fails the Flows signature (the F-18 species)", () => {
  const r = checkSurfaceSignature("flows", CENTER_DOM);
  assert.equal(r.ok, false);
  assert.ok(r.forbidden.length > 0, "center root must be named forbidden");
});

test("a Flows DOM fails the Center signature (vice versa)", () => {
  const r = checkSurfaceSignature("center", FLOWS_DOM);
  assert.equal(r.ok, false);
  assert.ok(r.missing.length > 0);
  assert.ok(r.forbidden.length > 0, "home root must be named forbidden");
});

test("each surface's own DOM passes its own signature", () => {
  assert.equal(checkSurfaceSignature("flows", FLOWS_DOM).ok, true);
  assert.equal(checkSurfaceSignature("center", CENTER_DOM).ok, true);
  assert.equal(checkSurfaceSignature("chats", CHATS_DOM).ok, true);
  assert.equal(checkSurfaceSignature("graphs", GRAPHS_DOM).ok, true);
  assert.equal(checkSurfaceSignature("thread", THREAD_DOM).ok, true);
  assert.equal(checkSurfaceSignature("plan-detail", PLAN_DETAIL_DOM).ok, true);
});

test("cross-surface DOMs fail each other (chats vs graphs vs thread vs plan detail)", () => {
  assert.equal(checkSurfaceSignature("chats", GRAPHS_DOM).ok, false);
  assert.equal(checkSurfaceSignature("graphs", CHATS_DOM).ok, false);
  assert.equal(checkSurfaceSignature("thread", CHATS_DOM).ok, false);
  assert.equal(checkSurfaceSignature("plan-detail", GRAPHS_DOM).ok, false);
  assert.equal(checkSurfaceSignature("graphs", PLAN_DETAIL_DOM).ok, false);
});

test("an empty DOM fails every signature (no silent pass)", () => {
  for (const surface of Object.keys(SURFACE_SIGNATURES)) {
    assert.equal(checkSurfaceSignature(surface, []).ok, false, surface);
  }
});

test("an unknown surface name fails closed", () => {
  assert.equal(checkSurfaceSignature("nope", FLOWS_DOM).ok, false);
});

test("the bond sheet passes over Flows and fails without its root (R21 W-12)", () => {
  const BOND_DOM = ['[data-testid="c2-bond-stone"]', '[data-testid="c2-home"]'];
  assert.equal(checkSurfaceSignature("bond", BOND_DOM).ok, true);
  // The sheet also opens over a thread (profile -> "Our stone"):
  // the stone root over thread-shell passes...
  const BOND_OVER_THREAD = ['[data-testid="c2-bond-stone"]', '[data-testid="thread-shell"]'];
  assert.equal(checkSurfaceSignature("bond", BOND_OVER_THREAD).ok, true);
  // ...but a bare thread without the stone never files as bond.
  assert.equal(checkSurfaceSignature("bond", ['[data-testid="thread-shell"]']).ok, false);
  // Flows alone is not a bond frame.
  assert.equal(checkSurfaceSignature("bond", FLOWS_DOM).ok, false);
  // A bond frame name claims the bond surface.
  assert.equal(surfaceClaimedByFrameName("bond-rich-dark"), "bond");
  assert.equal(surfaceClaimedByFrameName("bond-sparse-light"), "bond");
});

test("creation frames pass on their roots and fail without one (R21 W-17)", () => {
  // The add sheet over Flows files as creation...
  const SHEET_DOM = ['[data-testid="c2-create-sheet"]', '[data-testid="c2-home"]'];
  assert.equal(checkSurfaceSignature("creation", SHEET_DOM).ok, true);
  // ...and so does each option's next step.
  for (const root of ["c2-share-composer", "c2-create-flow", "c2-go-live"]) {
    assert.equal(
      checkSurfaceSignature("creation", [`[data-testid="${root}"]`, '[data-testid="c2-home"]']).ok,
      true,
      root,
    );
  }
  // Flows alone is not a creation frame.
  assert.equal(checkSurfaceSignature("creation", FLOWS_DOM).ok, false);
  // Creation frame names claim the creation surface.
  assert.equal(surfaceClaimedByFrameName("creation-sheet-dark"), "creation");
  assert.equal(surfaceClaimedByFrameName("creation-future-light"), "creation");
  assert.equal(surfaceClaimedByFrameName("creation-live-dark"), "creation");
});

test("story-viewer frames pass on the viewer or its exit return (R21 W-17x)", () => {
  assert.equal(
    checkSurfaceSignature("story-viewer", ['[data-testid="c2-story-viewer"]', '[data-testid="c2-home"]']).ok,
    true,
  );
  // The exit-return frame: the stream it returned to (rail proof).
  assert.equal(
    checkSurfaceSignature("story-viewer", ['[data-testid="c2-stone-self"]', '[data-testid="c2-home"]']).ok,
    true,
  );
  assert.equal(checkSurfaceSignature("story-viewer", FLOWS_DOM).ok, false);
  assert.equal(surfaceClaimedByFrameName("story-viewer-dark"), "story-viewer");
  assert.equal(surfaceClaimedByFrameName("story-viewer-exit-light"), "story-viewer");
});

/**
 * CALL-FAMILY RULE (Repair #21, W-16): the quarantined offender
 * was a call-log DOM filed as incall. CALL_LOG_DOM below is that
 * species (PeopleCallsList root + rows, exactly what the
 * mislabeled frame showed); INCALL_DOM is the live CallSurface
 * (call-surface root + orbit stage + graphing light + assist).
 */
const CALL_LOG_DOM = [
  '[data-testid="people-calls-list"]',
  '[data-testid="calls-row"]',
];
const INCALL_DOM = [
  '[data-testid="call-surface"]',
  '[data-testid="call-stage"]',
  '[data-testid="call-orbit"]',
  '[data-testid="graphing-light"]',
  '[data-testid="call-assist"]',
  '[data-testid="call-end"]',
];

test("call-family: a call-log DOM fails the incall signature (the quarantined species)", () => {
  const r = checkSurfaceSignature("incall", CALL_LOG_DOM);
  assert.equal(r.ok, false);
  assert.ok(r.missing.length > 0, "call-surface root must be named missing");
  assert.ok(r.forbidden.length > 0, "call-log rows must be named forbidden");
});

test("call-family: an in-call DOM fails the call-log signature (reverse filing refused)", () => {
  const r = checkSurfaceSignature("call-log", INCALL_DOM);
  assert.equal(r.ok, false);
  assert.ok(r.forbidden.length > 0, "call-surface root must be named forbidden");
});

test("call-family: each call surface's own DOM passes its own signature", () => {
  assert.equal(checkSurfaceSignature("incall", INCALL_DOM).ok, true);
  assert.equal(checkSurfaceSignature("call-log", CALL_LOG_DOM).ok, true);
});

test("call-family: a call-surface root alone, without any in-call presence element, fails incall", () => {
  const r = checkSurfaceSignature("incall", ['[data-testid="call-surface"]']);
  assert.equal(r.ok, false);
  assert.equal(r.matchedAny, false);
});

test("call-family: an in-call DOM with a stray log row fails incall", () => {
  const r = checkSurfaceSignature("incall", [...INCALL_DOM, '[data-testid="calls-row"]']);
  assert.equal(r.ok, false);
  assert.ok(r.forbidden.length > 0);
});

test("call-family: frame-name claims map incall-* to incall and calls-log/callog to call-log", () => {
  assert.equal(surfaceClaimedByFrameName("incall-ringing-outgoing-dark"), "incall");
  assert.equal(surfaceClaimedByFrameName("incall-voice-graphing-light"), "incall");
  assert.equal(surfaceClaimedByFrameName("incall-voice-paused-dark"), "incall");
  assert.equal(surfaceClaimedByFrameName("incall-video-dark"), "incall");
  assert.equal(surfaceClaimedByFrameName("incall-live-light"), "incall");
  assert.equal(surfaceClaimedByFrameName("calls-log-dark"), "call-log");
  assert.equal(surfaceClaimedByFrameName("calls-log-after-callback-light"), "call-log");
  assert.equal(surfaceClaimedByFrameName("callog-closeup-dark"), "call-log");
  // No call-family claim: the picker and the settings room keep null.
  assert.equal(surfaceClaimedByFrameName("create-call-picker-dark"), null);
  assert.equal(surfaceClaimedByFrameName("settings-calls-assist-dark"), null);
});

test("frame-name claims map to the surfaces the audit checks", () => {
  assert.equal(surfaceClaimedByFrameName("pad-dissolve-flows-light"), "flows");
  assert.equal(surfaceClaimedByFrameName("pad-rest-plan-detail-dark"), "plan-detail");
  assert.equal(surfaceClaimedByFrameName("flows-rest-light"), "flows");
  assert.equal(surfaceClaimedByFrameName("home-vs-center-home-light"), "flows");
  assert.equal(surfaceClaimedByFrameName("home-vs-center-center-light"), "center");
  assert.equal(surfaceClaimedByFrameName("chats-list-dark"), "chats");
  assert.equal(surfaceClaimedByFrameName("graph-detail-light"), "plan-detail");
  assert.equal(surfaceClaimedByFrameName("center-deck-rest-dark"), "center");
  assert.equal(surfaceClaimedByFrameName("orbit-v4-group-dark"), null);
});
