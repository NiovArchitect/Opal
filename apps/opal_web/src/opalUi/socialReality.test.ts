import { describe, expect, it } from "vitest";
import {
  assertPlaceSharePayload,
  assertRealityConsistency,
  assertTimeSharePayload,
  buildPlaceShareDraft,
  buildTimeShareDraft,
  deriveNextMeaningfulGap,
  deriveSocialReality,
  formatDistanceMinutes,
  formatLeaveAround,
} from "./socialReality";
import { resolvePrimaryOpalSurface } from "./grammar";
import type { ProductSignal } from "../api/productClient";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function sig(partial: Partial<ProductSignal>): ProductSignal {
  return {
    kind: "open_loop",
    label: "",
    status: "forming",
    ...partial,
  };
}

describe("social reality next-gap engine", () => {
  it("time then place: when known + place open → place gap", () => {
    const r = deriveSocialReality(
      sig({
        kind: "set",
        lifecycle_stage: "set",
        label: "Dinner with Jordan",
        shared_reality: {
          what: "Dinner",
          when: "Thursday · 6:30 PM",
          where: null,
          gaps: ["where"],
          place_gap_label: "Place still open",
          headline: "Dinner with Jordan",
        },
      }),
    );
    expect(r.next_gap).toBe("place");
    expect(r.primary_action?.share_kind).toBe("place");
    expect(r.primary_action?.label).toMatch(/place/i);
  });

  it("place then time: where known + when open → time gap", () => {
    const gap = deriveNextMeaningfulGap({
      gaps: ["when"],
      what: "Dinner",
      when: null,
      where: "Juniper & Ivy",
      where_matters: true,
    });
    expect(gap).toBe("time");
  });

  it("remote activity does not force place", () => {
    const gap = deriveNextMeaningfulGap({
      gaps: [],
      what: "FaceTime",
      when: "Thursday · 7 PM",
      where: null,
      where_matters: false,
    });
    expect(gap).toBe("none");
  });

  it("fixed event with both settled → none (no find-a-time)", () => {
    const r = deriveSocialReality(
      sig({
        kind: "set",
        lifecycle_stage: "set",
        label: "Concert Saturday 8 PM",
        shared_reality: {
          what: "Concert",
          when: "Saturday · 8 PM",
          where: "The Rady Shell",
          gaps: [],
        },
      }),
    );
    expect(r.next_gap).toBe("none");
  });

  it("server next_gap wins over client inference (H-24-02)", () => {
    const r = deriveSocialReality(
      sig({
        kind: "set",
        lifecycle_stage: "set",
        label: "Coffee this morning · place still open",
        shared_reality: {
          what: "Coffee",
          when: "Saturday · 9 AM",
          where: null,
          gaps: ["where"],
          next_gap: "place",
        },
      }),
    );
    expect(r.next_gap).toBe("place");
    expect(r.what).toBe("Coffee");
  });

  it("continuation is daypart-aware — not always Extend the night", () => {
    const morning = deriveSocialReality(
      sig({
        kind: "set",
        lifecycle_stage: "set",
        label: "Coffee 9 AM",
        shared_reality: {
          what: "Coffee",
          when: "Saturday · 9 AM",
          where: "Little Italy",
          gaps: [],
          next_gap: "none",
        },
      }),
    );
    expect(morning.next_gap).toBe("none");
    expect(morning.primary_action?.label || "").not.toMatch(/extend the night/i);
    expect(morning.primary_action?.label || "").toMatch(/morning|continue|day/i);

    const night = deriveSocialReality(
      sig({
        kind: "set",
        lifecycle_stage: "set",
        label: "Jazz night",
        shared_reality: {
          what: "Jazz",
          when: "Friday · 11 PM",
          where: "Club",
          gaps: [],
          next_gap: "none",
        },
      }),
    );
    expect(night.primary_action?.label || "").toMatch(/night|evening|continue/i);
  });

  it("remote settled does not invent place CTA", () => {
    const r = deriveSocialReality(
      sig({
        kind: "set",
        lifecycle_stage: "set",
        shared_reality: {
          what: "FaceTime",
          when: "Tonight · 7",
          where: null,
          gaps: [],
          next_gap: "none",
          remote: true,
        },
      }),
    );
    expect(r.next_gap).toBe("none");
    expect(r.remote).toBe(true);
    expect(r.primary_action?.opens).not.toBe("place_sheet");
  });


  it("chip uses Choose a place not Find a time when place is gap", () => {
    const primary = resolvePrimaryOpalSurface({
      signalKind: "open_loop",
      signal: sig({
        kind: "open_loop",
        lifecycle_stage: "still_open",
        label: "Dinner Thursday · place still open",
        shared_reality: {
          what: "Dinner",
          when: "Thursday · 6:30 PM",
          gaps: ["where"],
          place_gap_label: "Place still open",
        },
      }),
    });
    expect(primary.kind).toBe("chip");
    if (primary.kind === "chip") {
      expect(primary.gap).toBe("place");
      expect(primary.label).not.toMatch(/time/i);
      expect(primary.share_kind).toBe("place");
    }
  });

  it("PLACE_SHARE_NEVER_SERIALIZES_TIME_ONLY_PAYLOAD", () => {
    const d = buildPlaceShareDraft({ name: "Juniper & Ivy", area: "Little Italy" });
    expect(d.share_kind).toBe("place");
    expect(d.text).toMatch(/Juniper/);
    assertPlaceSharePayload(d as unknown as Record<string, unknown>);
    expect(() =>
      assertPlaceSharePayload({
        share_kind: "place",
        windows: [{ start: "x" }],
      }),
    ).toThrow(/PLACE_SHARE/);
  });

  it("time share stays time-shaped", () => {
    const d = buildTimeShareDraft("Thursday · 7:00 PM");
    expect(d.share_kind).toBe("time");
    assertTimeSharePayload(d as unknown as Record<string, unknown>);
  });

  it("Home/Chat/SR/Plans agree on same signal truth", () => {
    const signal = sig({
      kind: "set",
      lifecycle_stage: "set",
      conversation_id: "c1",
      label: "Dinner with Jordan",
      shared_reality: {
        what: "Dinner",
        when: "Thursday · 6:30 PM",
        where: null,
        gaps: ["where"],
        place_gap_label: "Place still open",
        headline: "Dinner with Jordan",
      },
    });
    const r = deriveSocialReality(signal);
    assertRealityConsistency([
      { source: "home", reality: r },
      { source: "chat", reality: deriveSocialReality(signal) },
      { source: "sr", reality: deriveSocialReality(signal) },
      { source: "plans", reality: deriveSocialReality(signal) },
    ]);
    expect(r.next_gap).toBe("place");
  });

  it("leave-around and distance only with travel truth", () => {
    expect(formatLeaveAround(null, 18)).toBeNull();
    expect(formatDistanceMinutes(null)).toBeNull();
    expect(formatDistanceMinutes(18)).toBe("18 min from you");
    const line = formatLeaveAround("2026-08-13T19:30:00.000Z", 18);
    expect(line).toMatch(/^Leave around /);
    expect(line).toMatch(/\b(AM|PM)\b/);
  });

  it("OpalApp place sheet and gap chip are wired", () => {
    const app = readFileSync(resolve(root, "src/OpalApp.tsx"), "utf8");
    expect(app).toMatch(/data-testid="place-sheet"/);
    expect(app).toMatch(/data-share-kind="place"/);
    expect(app).toMatch(/openGapSurface/);
    expect(app).toMatch(/buildPlaceShareDraft/);
    expect(app).toMatch(/data-next-gap/);
    // Founder bug: place path must not only setFindTimeOpen
    const placeClick = app.slice(
      app.indexOf("data-testid={`place-option-${opt.id}`}"),
      app.indexOf('data-testid="place-sheet-close"'),
    );
    expect(placeClick).toMatch(/buildPlaceShareDraft/);
    expect(placeClick).not.toMatch(/shareAvailabilityWindows/);
    expect(placeClick).not.toMatch(/setFindTimeOpen\(true\)/);
  });
});
