import { describe, expect, it } from "vitest";
import {
  applyInboxMessage,
  dockUnreadCount,
  mergeConversationList,
  planWhoLine,
  type InboxChatRow,
} from "./inboxState";

const formatTime = (iso?: string | null) => iso || "";

function row(partial: Partial<InboxChatRow> & Pick<InboxChatRow, "id">): InboxChatRow {
  return {
    preview: "Change time to 7 p.m.",
    time: "old",
    unread: 0,
    updatedAt: "2026-09-27T18:00:00Z",
    latestServerSeq: 4,
    name: "Walk B",
    ...partial,
  };
}

describe("inbox list updates", () => {
  it("updates preview, time, unread, and order while the thread is closed", () => {
    const seen = new Set<string>();
    const result = applyInboxMessage(
      [row({ id: "other", latestServerSeq: 9, updatedAt: "2026-09-27T19:00:00Z" }), row({ id: "ace" })],
      {
        conversation_id: "ace",
        message_id: "m1",
        server_seq: 5,
        sender_user_id: "b",
        preview: "Good afternoon",
        last_message_at: "2026-09-27T19:31:00Z",
        unread_count: 1,
        in_app: true,
      },
      { viewingId: null, selfId: "a", formatTime, seenMessageIds: seen },
    );

    expect(result.missing).toBe(false);
    expect(result.notify).toBe(true);
    expect(result.chats[0]).toMatchObject({
      id: "ace",
      preview: "Good afternoon",
      unread: 1,
      latestServerSeq: 5,
    });
  });

  it("does not badge or banner the open thread", () => {
    const result = applyInboxMessage(
      [row({ id: "ace" })],
      {
        conversation_id: "ace",
        message_id: "m2",
        server_seq: 6,
        sender_user_id: "b",
        preview: "Good afternoon",
        last_message_at: "2026-09-27T19:31:00Z",
        unread_count: 1,
        in_app: true,
      },
      { viewingId: "ace", selfId: "a", formatTime },
    );

    expect(result.chats[0].unread).toBe(0);
    expect(result.notify).toBe(false);
  });

  it("dedupes a recovered message against the realtime event", () => {
    const seen = new Set<string>();
    const event = {
      conversation_id: "ace",
      message_id: "m3",
      server_seq: 7,
      sender_user_id: "b",
      preview: "Unread durability test",
      last_message_at: "2026-09-27T19:40:00Z",
      unread_count: 1,
    };
    const first = applyInboxMessage([row({ id: "ace" })], event, {
      viewingId: null,
      selfId: "a",
      formatTime,
      seenMessageIds: seen,
    });
    const second = applyInboxMessage(first.chats, event, {
      viewingId: null,
      selfId: "a",
      formatTime,
      seenMessageIds: seen,
    });
    expect(second.duplicate).toBe(true);
    expect(second.chats).toEqual(first.chats);
  });

  it("ignores a stale sequence and refetches a missing row", () => {
    const stale = applyInboxMessage([row({ id: "ace", latestServerSeq: 8 })], {
      conversation_id: "ace",
      message_id: "old",
      server_seq: 3,
      sender_user_id: "b",
      preview: "older",
      unread_count: 4,
    }, { viewingId: null, selfId: "a", formatTime });
    expect(stale.chats[0].preview).toBe("Change time to 7 p.m.");

    const missing = applyInboxMessage([row({ id: "ace" })], {
      conversation_id: "missing",
      message_id: "m4",
      server_seq: 1,
      sender_user_id: "b",
      preview: "hello",
      unread_count: 1,
    }, { viewingId: null, selfId: "a", formatTime });
    expect(missing.missing).toBe(true);
  });

  it("keeps a newer local preview when a list refetch is older", () => {
    const merged = mergeConversationList(
      [row({ id: "ace", preview: "Good afternoon", latestServerSeq: 8, updatedAt: "2026-09-27T19:31:00Z" })],
      [row({ id: "ace", preview: "Change time to 7 p.m.", latestServerSeq: 4, updatedAt: "2026-09-27T18:00:00Z" })],
    );
    expect(merged[0].preview).toBe("Good afternoon");
  });

  it("keeps preview and unread for a muted chat and skips the banner", () => {
    const result = applyInboxMessage(
      [row({ id: "ace", muted: true, unread: 1 })],
      {
        conversation_id: "ace",
        message_id: "m-muted",
        server_seq: 9,
        sender_user_id: "b",
        preview: "Hello",
        last_message_at: "2026-09-27T20:00:00Z",
        unread_count: 2,
        in_app: false,
      },
      { viewingId: null, selfId: "a", formatTime },
    );
    expect(result.chats[0]).toMatchObject({ preview: "Hello", unread: 2, muted: true });
    expect(result.notify).toBe(false);
  });

  it("counts muted unread in the dock badge", () => {
    expect(
      dockUnreadCount(
        [
          { id: "open", unread: 4 },
          { id: "muted", unread: 2, muted: true },
          { id: "clear", unread: 0 },
        ],
        "open",
      ),
    ).toBe(2);
  });

  it("names solo and dyad plans differently", () => {
    expect(planWhoLine("dyad", "Walk B")).toBe("You + Walk B");
    expect(planWhoLine("solo", "Walk B")).toBe("Your plan");
  });
});
