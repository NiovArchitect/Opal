import { describe, expect, it } from "vitest";
import { resolvePersonChatTarget } from "./openPersonChat";
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

  it("resolves an exact display-name dyad to the REAL conversation", () => {
    const r = resolvePersonChatTarget({ displayName: "Maya" }, [mayaLive]);
    expect(r).toEqual({
      ok: true,
      conversationId: "live-maya-uuid",
      via: "exact_name_dyad",
    });
  });

  it("does not substring-fuzzy match wrong people", () => {
    const r = resolvePersonChatTarget({ displayName: "Ma" }, [
      mayaLive,
      chanelleLive,
    ]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("new_chat");
  });

  it("never returns empty Chats-home for a named person - New Chat intent", () => {
    const r = resolvePersonChatTarget({ displayName: "LiveContact" }, []);
    expect(r).toEqual({
      ok: false,
      reason: "new_chat",
      displayName: "LiveContact",
      peerUserId: null,
    });
  });
});

/**
 * Repair #17 — seed ids are never minted and never returned.
 * The old contract resolved seed people to `seed-chat-*` fixture ids
 * (via: "founder_seed") and dropped the founder into a scripted universe.
 * The new contract: a person resolves to a REAL backend conversation or
 * to the caller's ensure/new-chat path — under every input, seed flag
 * concepts no longer exist in this resolver at all.
 */
describe("resolvePersonChatTarget - Repair #17 seed-kill contract", () => {
  it("a named seed person with NO live conversation is a new_chat, never a seed id", () => {
    for (const name of ["Maya", "Chanelle", "Alex", "Sabrina", "Juniper Crew"]) {
      const r = resolvePersonChatTarget({ displayName: name }, []);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("new_chat");
    }
  });

  it("an explicit seed-chat-* id is ignored and falls through to the real dyad", () => {
    const r = resolvePersonChatTarget(
      { conversationId: "seed-chat-maya", displayName: "Maya" },
      [mayaLive],
    );
    expect(r).toEqual({
      ok: true,
      conversationId: "live-maya-uuid",
      via: "exact_name_dyad",
    });
  });

  it("an explicit seed-chat-* id with a peerUserId resolves via the peer dyad", () => {
    const r = resolvePersonChatTarget(
      {
        conversationId: "seed-chat-chanelle",
        peerUserId: "peer-chanelle",
        displayName: "Chanelle",
      },
      [chanelleLive],
    );
    expect(r).toEqual({
      ok: true,
      conversationId: "live-chanelle-uuid",
      via: "peer_user_id",
    });
  });

  it("an explicit seed-chat-* id alone resolves to nothing openable", () => {
    const r = resolvePersonChatTarget({ conversationId: "seed-chat-maya" }, [
      mayaLive,
    ]);
    // No name, no peer: the seed id itself must not become the target.
    expect(r).toEqual({ ok: false, reason: "empty" });
  });

  it("a chat row that itself carries a seed-chat-* id is never name-matched", () => {
    const seedRow: PresenceChat = {
      id: "seed-chat-maya",
      name: "Maya",
      composition: "dyad",
      memberCount: 2,
      peers: [{ id: "seed-peer-maya", display_name: "Maya" }],
    };
    const r = resolvePersonChatTarget({ displayName: "Maya" }, [seedRow]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("new_chat");
  });

  it("adversarial matrix: no input combination ever yields a seed-chat-* id", () => {
    const targets = [
      { displayName: "Maya" },
      { displayName: "Chanelle" },
      { conversationId: "seed-chat-alex" },
      { conversationId: "SEED-CHAT-SABRINA", displayName: "Sabrina" },
      { conversationId: "seed-chat-juniper-crew", displayName: "Juniper crew" },
      { peerUserId: "peer-maya", displayName: "seed-chat-maya" },
      { conversationId: "  seed-chat-maya  ", peerUserId: "peer-maya" },
    ];
    const chatSets = [[], [mayaLive, chanelleLive, group]];
    for (const t of targets) {
      for (const chats of chatSets) {
        const r = resolvePersonChatTarget(t, chats);
        if (r.ok) {
          expect(r.conversationId).not.toMatch(/^seed-chat-/i);
          expect(chats.some((c) => c.id === r.conversationId)).toBe(true);
        }
      }
    }
  });
});
