/**
 * Repair #27 W27-8 - A MESSAGE RENDERS ONCE.
 *
 * Founder walk #5: in the Chanelle thread, one plan-proposal
 * bubble ("Schedule 7 am church at Awaken") rendered FOUR times.
 * Both thread hosts set the server's message array verbatim, so
 * any repeated record rendered once per copy - the same id
 * re-issued, or one logical message persisted repeatedly by a
 * seed/write batch (same sender, body, type and batch timestamp,
 * fresh ids). These pins cover the dedupe identity at both load
 * seams, and the counter-case: a person's own repeated texts at
 * different times are NOT duplicates and must survive.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { dedupeOpalChatMessages, dedupeProductMessages } from "./C1ShellHosts";
import type { OpalChatMessage, ProductMessage } from "../../api/productClient";

function pm(partial: Partial<ProductMessage>): ProductMessage {
  return {
    id: "m-1",
    body: "Schedule 7 am church at Awaken",
    sender_user_id: "u-chanelle",
    server_seq: 1,
    created_at: "2026-10-21T14:00:00.000000Z",
    client_message_id: "c-1",
    message_type: "plan_proposal",
    ...partial,
  } as ProductMessage;
}

function om(partial: Partial<OpalChatMessage>): OpalChatMessage {
  return {
    id: "s-1",
    conversation_id: "conv-1",
    role: "user",
    body: "Schedule 7 am church at Awaken",
    metadata: { plan_id: "plan-9" },
    inserted_at: "2026-10-21T14:00:00.000000Z",
    ...partial,
  } as OpalChatMessage;
}

describe("W27-12 composer clearance (CSS contract)", () => {
  it("the C1 host ends its column above the floating dock", () => {
    const css = readFileSync(resolve(__dirname, "c2shell.css"), "utf8");
    const hostBlock = css.match(/\.c2s-c1-host\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(hostBlock).toMatch(/padding-bottom:\s*var\(--dock-clearance\)/);
    expect(hostBlock).toMatch(/box-sizing:\s*border-box/);
  });
});

describe("W27-8 dedupeProductMessages (product thread host)", () => {
  it("the founder's case: four batch copies of one proposal render once", () => {
    const batch = [
      pm({ id: "m-1", server_seq: 1 }),
      pm({ id: "m-2", server_seq: 2 }),
      pm({ id: "m-3", server_seq: 3 }),
      pm({ id: "m-4", server_seq: 4 }),
    ];
    expect(dedupeProductMessages(batch)).toHaveLength(1);
  });

  it("the same id re-issued renders once", () => {
    expect(dedupeProductMessages([pm({}), pm({})])).toHaveLength(1);
  });

  it("a person's repeated text at a different time is NOT a duplicate", () => {
    const out = dedupeProductMessages([
      pm({ id: "m-1", body: "ok", message_type: "text", created_at: "2026-10-21T14:00:00.000000Z" }),
      pm({ id: "m-2", body: "ok", message_type: "text", created_at: "2026-10-21T14:02:31.000000Z" }),
    ]);
    expect(out).toHaveLength(2);
  });

  it("same words from a different sender are NOT duplicates", () => {
    const out = dedupeProductMessages([
      pm({ id: "m-1" }),
      pm({ id: "m-2", sender_user_id: "u-sadeil" }),
    ]);
    expect(out).toHaveLength(2);
  });

  it("order is preserved and the first occurrence wins", () => {
    const out = dedupeProductMessages([
      pm({ id: "m-1", body: "first" }),
      pm({ id: "m-2", body: "second", created_at: "2026-10-21T14:01:00.000000Z" }),
      pm({ id: "m-3", body: "first" }),
    ]);
    expect(out.map((m) => m.id)).toEqual(["m-1", "m-2"]);
  });
});

describe("W27-8 dedupeOpalChatMessages (session/orbit host)", () => {
  it("four re-issued copies of one plan proposal render once", () => {
    const batch = [om({ id: "s-1" }), om({ id: "s-2" }), om({ id: "s-3" }), om({ id: "s-4" })];
    expect(dedupeOpalChatMessages(batch)).toHaveLength(1);
  });

  it("proposals for different plans are NOT duplicates", () => {
    const out = dedupeOpalChatMessages([
      om({ id: "s-1" }),
      om({ id: "s-2", metadata: { plan_id: "plan-10" } }),
    ]);
    expect(out).toHaveLength(2);
  });

  it("plain texts (no plan) at different times survive", () => {
    const out = dedupeOpalChatMessages([
      om({ id: "s-1", body: "yes", metadata: null, inserted_at: "2026-10-21T14:00:00.000000Z" }),
      om({ id: "s-2", body: "yes", metadata: null, inserted_at: "2026-10-21T15:00:00.000000Z" }),
    ]);
    expect(out).toHaveLength(2);
  });
});
