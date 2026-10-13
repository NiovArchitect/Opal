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
  it("seed on remaps founder plan-pill rows", () => {
    const fix = composeChatsList({
      founderSeedEnabled: true,
      liveRows: [liveFortOak],
    });
    expect(fix.mode).toBe("FOUNDER_FIXTURE");
    expect(fix.rows.length).toBeGreaterThanOrEqual(1);
    expect(fix.rows.some((r) => r.name === "Chanelle" || r.id.includes("seed-chat"))).toBe(
      true,
    );
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
