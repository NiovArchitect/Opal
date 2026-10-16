import { describe, expect, it } from "vitest";
import {
  founderSeedConversationIdForName,
  resolvePersonChatTarget,
} from "./openPersonChat";
import type { PresenceChat } from "./momentNamedPresence";

const mayaLive: PresenceChat = {
  id: "live-maya-uuid",
  name: "Maya",
  composition: "dyad",
  memberCount: 2,
  peers: [{ id: "peer-maya", display_name: "Maya" }],
};

const chanelleLive: PresenceChat = {
  id: "live-chanelle-uuid",
  name: "Chanelle",
  composition: "dyad",
  memberCount: 2,
  peers: [{ id: "peer-chanelle", display_name: "Chanelle" }],
};

const group: PresenceChat = {
  id: "live-group",
  name: "Juniper crew",
  composition: "group",
  memberCount: 4,
};

describe("resolvePersonChatTarget - ID authority", () => {
  it("uses explicit conversationId over display name", () => {
    const r = resolvePersonChatTarget(
      { conversationId: "live-maya-uuid", displayName: "Chanelle" },
      [mayaLive, chanelleLive],
    );
    expect(r).toEqual({
      ok: true,
      conversationId: "live-maya-uuid",
      via: "conversation_id",
    });
  });

  it("resolves Maya + Chanelle founder seeds to seed-chat ids when no live", () => {
    const maya = resolvePersonChatTarget(
      { displayName: "Maya" },
      [],
      { founderSeedEnabled: true },
    );
    expect(maya).toEqual({
      ok: true,
      conversationId: "seed-chat-maya",
      via: "founder_seed",
    });
    const chanelle = resolvePersonChatTarget(
      { displayName: "Chanelle" },
      [],
      { founderSeedEnabled: true },
    );
    expect(chanelle).toEqual({
      ok: true,
      conversationId: "seed-chat-chanelle",
      via: "founder_seed",
    });
  });

  it("remaps founder seed conversationId onto live UUID when present", () => {
    const r = resolvePersonChatTarget(
      { conversationId: "seed-chat-maya", displayName: "Maya" },
      [mayaLive],
      { founderSeedEnabled: true },
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.conversationId).toBe("live-maya-uuid");
      expect(r.via).toBe("conversation_id");
    }
  });

  it("resolves peerUserId to direct dyad, never group", () => {
    const r = resolvePersonChatTarget(
      { peerUserId: "peer-maya", displayName: "Maya" },
      [mayaLive, group],
    );
    expect(r).toEqual({
      ok: true,
      conversationId: "live-maya-uuid",
      via: "peer_user_id",
    });
  });

  it("does not substring-fuzzy match wrong people", () => {
    const r = resolvePersonChatTarget(
      { displayName: "Ma" },
      [mayaLive, chanelleLive],
      { founderSeedEnabled: false },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("new_chat");
  });

  it("never returns empty Chats-home for a named person - New Chat intent", () => {
    const r = resolvePersonChatTarget(
      { displayName: "LiveContact" },
      [],
      { founderSeedEnabled: false },
    );
    expect(r).toEqual({
      ok: false,
      reason: "new_chat",
      displayName: "LiveContact",
      peerUserId: null,
    });
  });

  it("founderSeedConversationIdForName is stable for Maya/Chanelle", () => {
    expect(founderSeedConversationIdForName("Maya")).toBe("seed-chat-maya");
    expect(founderSeedConversationIdForName("Chanelle")).toBe(
      "seed-chat-chanelle",
    );
  });
});
