import { describe, expect, it } from "vitest";
import {
  composeChatsList,
  filterLiveChatsForProduct,
  isSeedChatRowId,
} from "./chatsHydration";
import type { ChatsHomeRow } from "./ChatsHome";

const liveFortOak: ChatsHomeRow = {
  id: "ace99adc-db67-4258-9d95-f612246c6c84",
  name: "Walk B",
  kind: "direct",
  preview: "Fort Oak confirmed for 8 PM",
  when: "now",
};

const seedLeakRow: ChatsHomeRow = {
  id: "seed-chat-chanelle",
  name: "Chanelle",
  kind: "direct",
  preview: "Perfect. I'll grab a table.",
  when: "2m",
};

describe("chatsHydration prefer-real / seed-off", () => {
  it("seed on renders the LIVE rows - fixture rows are never painted (Repair #18)", () => {
    // Repair #18: seed mode composes from live rows exactly like
    // production. The live row (with its projection-derived pill, built
    // in OpalApp) is the only thing that can paint.
    const liveChanelle: ChatsHomeRow = {
      id: "b599fcd7-7a97-4736-8221-86e0a6d8dc7a",
      name: "Chanelle",
      kind: "direct",
      preview: "Real backend preview",
      when: "now",
      planConsequence: {
        state: "ready",
        label: "3 of 4 going",
        planId: "plan-live-1",
        tone: "dinner",
      },
    };
    const fix = composeChatsList({
      founderSeedEnabled: true,
      liveRows: [liveChanelle, liveFortOak],
    });
    expect(fix.mode).toBe("FOUNDER_FIXTURE");
    expect(fix.rows.length).toBe(2);
    expect(fix.rows[0]?.name).toBe("Chanelle");
    expect(fix.rows[0]?.id).toBe(liveChanelle.id);
    expect(fix.rows[0]?.planConsequence?.label).toBe("3 of 4 going");
    expect(fix.rows.every((r) => !isSeedChatRowId(r.id))).toBe(true);
    expect(fix.diagnostics?.fixtureRows).toBe(0);
  });

  it("seed on with NO matching live conversation paints NOTHING (Repair #17)", () => {
    // The old law painted ≥5 pure seed-chat-* fixture rows. That put
    // unreachable scripted fixtures on the open path — now forbidden.
    const fix = composeChatsList({
      founderSeedEnabled: true,
      liveRows: [],
    });
    expect(fix.mode).toBe("EMPTY");
    expect(fix.rows).toEqual([]);
    expect(fix.diagnostics?.seedEnabled).toBe(true);
    expect(fix.diagnostics?.paintedRows).toBe(0);
    expect(fix.diagnostics?.hardFallback).toBe(false);
    expect(fix.diagnostics?.path).toBe("physical_compose");
  });

  it("seed on with only non-matching live rows never leaks a seed-chat id", () => {
    const fix = composeChatsList({
      founderSeedEnabled: true,
      liveRows: [liveFortOak],
    });
    expect(fix.rows.every((r) => !isSeedChatRowId(r.id))).toBe(true);
  });

  it("seed off + no live is EMPTY with zero seed-chat rows", () => {
    const empty = composeChatsList({
      founderSeedEnabled: false,
      liveRows: [],
    });
    expect(empty.mode).toBe("EMPTY");
    expect(empty.rows).toEqual([]);
  });

  it("seed off drops seed-chat-* ids even if passed in liveRows", () => {
    const prod = composeChatsList({
      founderSeedEnabled: false,
      liveRows: [seedLeakRow, liveFortOak],
    });
    expect(prod.mode).toBe("PRODUCTION_HYDRATION");
    expect(prod.rows.every((r) => !isSeedChatRowId(r.id))).toBe(true);
    expect(prod.rows.some((r) => r.id === liveFortOak.id)).toBe(true);
  });

  it("filterLiveChatsForProduct removes seed-peer fixtures when seed off", () => {
    const kept = filterLiveChatsForProduct(
      [
        {
          id: "real-1",
          name: "Walk B",
          kind: "direct",
          peers: [{ id: "b599fcd7-7a97-4736-8221-86e0a6d8dc7a" }],
        },
        {
          id: "seed-peer-chat",
          name: "Chanelle",
          kind: "direct",
          peers: [{ id: "f0c4a4e1-1111-4111-8111-c4a4e1100001" }],
        },
      ],
      false,
    );
    expect(kept.map((c) => c.id)).toEqual(["real-1"]);
  });

  it("filterLiveChatsForProduct drops soak residue", () => {
    const kept = filterLiveChatsForProduct(
      [
        {
          id: "soak-1",
          name: "Soak Multi speaker",
          kind: "group",
          preview: "SOAK-run",
        },
        liveFortOak,
      ],
      false,
    );
    expect(kept.map((c) => c.id)).toEqual([liveFortOak.id]);
  });
});
