import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Channel, Socket } from "phoenix";
import {
  ackDelivered,
  connectSocket,
  joinConversation,
  sendText,
  syncHistory,
} from "../realtime/opalSocket";
import { MessageRepository } from "../storage/messageRepository";
import { MemorySqlDriver } from "../storage/sqlDriver";
import { SocialFlowRepository } from "../socialFlow/socialFlowRepository";
import { getCachedCoords } from "../location/deviceLocation";
import { SocialFlowSignalCard } from "../socialFlow/SocialFlowSignalCard";
import type { SocialFlowSignal } from "../socialFlow/types";
import type { ChatMessage, ServerMessage } from "../types";

type Props = {
  userId: string;
  conversationId: string;
  deviceId: string;
  peerLabel: string;
};

type PlanSummary = {
  id: string;
  title: string;
  status: string;
  timeLabel: string | null;
  leadUserId: string | null;
  createdAt: string;
};

function fromServer(m: ServerMessage): ChatMessage {
  return {
    id: m.id,
    clientMessageId: m.client_message_id,
    conversationId: m.conversation_id,
    senderUserId: m.sender_user_id,
    body: m.body,
    serverSeq: m.server_seq,
    deliveryState:
      m.delivery_state === "delivered"
        ? "delivered"
        : m.delivery_state === "persisted"
          ? "persisted"
          : "accepted",
    createdAt: m.created_at,
  };
}

/**
 * Thin conversation shell.
 * Durable messages + outbound queue live in MessageRepository (SQLite schema).
 * MemorySqlDriver used until native expo-sqlite is wired at runtime bootstrap.
 */
export function ConversationScreen({
  userId,
  conversationId,
  deviceId,
  peerLabel,
}: Props) {
  const driverRef = useRef(new MemorySqlDriver());
  const repoRef = useRef(new MessageRepository(driverRef.current));
  const sfRepoRef = useRef(new SocialFlowRepository(driverRef.current));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [signals, setSignals] = useState<SocialFlowSignal[]>([]);
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [text, setText] = useState("");
  const [status, setStatus] = useState("connecting");
  // Repair #11 B3: inline schedule editor shown only to the plan lead/organizer.
  const [editingSchedule, setEditingSchedule] = useState<{
    mode: "time" | "date";
    value: string;
  } | null>(null);
  const channelRef = useRef<Channel | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const refresh = useCallback(() => {
    setMessages(repoRef.current.list(conversationId));
    setSignals(sfRepoRef.current.listSignals(conversationId, userId));
  }, [conversationId, userId]);

  useEffect(() => {
    repoRef.current.migrate();
    sfRepoRef.current.migrate();
    refresh();

    let cancelled = false;
    const socket = connectSocket({ userId, deviceId });
    socketRef.current = socket;
    const channel = joinConversation(socket, conversationId);
    channelRef.current = channel;

    channel.on("message:new", async (payload: { message: ServerMessage }) => {
      const msg = fromServer(payload.message);
      repoRef.current.reconcileFromServer(msg);
      if (!cancelled) refresh();
      if (msg.senderUserId !== userId) {
        try {
          await ackDelivered(channel, msg.id, `trace-ack-${Date.now()}`);
        } catch {
          // non-fatal
        }
      }
    });

    channel.on("message:delivered", (payload: { message_id: string }) => {
      repoRef.current.setDeliveryState(payload.message_id, "delivered");
      if (!cancelled) refresh();
    });

    channel.on("message:failed", () => {
      if (!cancelled) setStatus("send_failed");
    });

    channel.on("presence:state", () => setStatus("connected"));
    channel.on("presence:diff", () => {
      /* lifecycle observed; UI status remains connected while channel open */
    });

    const onSocialFlowEnvelope = (envelope: {
      payload?: {
        signal?: Record<string, unknown>;
        plan?: Record<string, unknown>;
        reminder?: Record<string, unknown>;
        audience_user_id?: string;
      };
    }) => {
      const p = envelope.payload || {};
      if (p.signal) {
        const s = p.signal;
        const visibility = String(s.visibility || "shared");
        const audience = s.audience_user_id == null ? null : String(s.audience_user_id);
        if (visibility === "private" && audience !== userId) return;
        sfRepoRef.current.upsertSignal({
          id: String(s.id),
          conversationId: String(s.conversation_id || conversationId),
          kind: String(s.kind) as SocialFlowSignal["kind"],
          status: String(s.status),
          copy: String(s.copy),
          visibility: visibility as "private" | "shared",
          actions: Array.isArray(s.actions)
            ? (s.actions as { id: string; label: string }[])
            : [],
          audienceUserId: audience,
          proposalId: s.proposal_id == null ? null : String(s.proposal_id),
          planId: s.plan_id == null ? null : String(s.plan_id),
          commitmentId: s.commitment_id == null ? null : String(s.commitment_id),
          reminderId: s.reminder_id == null ? null : String(s.reminder_id),
          revisionId: s.revision_id == null ? null : String(s.revision_id),
          createdAt: String(s.created_at || new Date().toISOString()),
        });
      }
      if (p.plan) {
        const plan = p.plan;
        sfRepoRef.current.upsertPlan({
          id: String(plan.id),
          conversationId: String(plan.conversation_id || conversationId),
          title: String(plan.title || "Plan"),
          status: String(plan.status),
          timeLabel: plan.time_label == null ? null : String(plan.time_label),
          createdAt: String(plan.created_at || new Date().toISOString()),
        });
        // Repair #11 B3: keep the lead/organizer identity for the plan card.
        const summary: PlanSummary = {
          id: String(plan.id),
          title: String(plan.title || "Plan"),
          status: String(plan.status),
          timeLabel: plan.time_label == null ? null : String(plan.time_label),
          leadUserId:
            plan.lead_user_id == null ? null : String(plan.lead_user_id),
          createdAt: String(plan.created_at || new Date().toISOString()),
        };
        setPlans((prev) => [
          ...prev.filter((x) => x.id !== summary.id),
          summary,
        ]);
      }
      if (p.reminder) {
        const rem = p.reminder;
        sfRepoRef.current.upsertReminder(
          {
            id: String(rem.id),
            planId: rem.plan_id == null ? null : String(rem.plan_id),
            ownerUserId: String(rem.owner_user_id),
            visibility: String(rem.visibility || "private") as "private" | "shared",
            contentSummary: String(rem.content_summary || ""),
            status: String(rem.status || "active"),
          },
          userId,
        );
      }
      if (!cancelled) refresh();
    };

    for (const evt of [
      "social_flow:signal",
      "social_flow:plan",
      "social_flow:reminder",
      "social_flow:revision",
      "social_flow:proposal_updated",
      "social_flow:commitment",
    ]) {
      channel.on(evt, onSocialFlowEnvelope);
    }

    channel
      .join()
      .receive("ok", async () => {
        setStatus("connected");
        const maxSeq = repoRef.current
          .list(conversationId)
          .reduce((acc, m) => Math.max(acc, m.serverSeq ?? 0), 0);
        try {
          const history = await syncHistory(channel, maxSeq);
          for (const m of history) repoRef.current.reconcileFromServer(fromServer(m));
          // Reconcile Social Flow state (private filtered server-side)
          channel
            .push("social_flow:sync", {})
            .receive("ok", (state: {
              signals?: Array<Record<string, unknown>>;
              plans?: Array<Record<string, unknown>>;
              reminders?: Array<Record<string, unknown>>;
            }) => {
              for (const s of state.signals || []) {
                onSocialFlowEnvelope({ payload: { signal: s } });
              }
              for (const plan of state.plans || []) {
                onSocialFlowEnvelope({ payload: { plan } });
              }
              for (const reminder of state.reminders || []) {
                onSocialFlowEnvelope({ payload: { reminder } });
              }
            });
          if (!cancelled) refresh();
        } catch {
          // ignore
        }
        // Drain outbound queue
        for (const item of repoRef.current.listOutbound()) {
          try {
            const { message } = await sendText(channel, {
              clientMessageId: item.clientMessageId,
              conversationId: item.conversationId,
              body: item.body,
              traceId: `trace-retry-${Date.now()}`,
              // Repair #12 (F12-11b): best-effort cached fix; null when denied.
              coords: getCachedCoords(),
            });
            repoRef.current.reconcileFromServer(fromServer(message));
          } catch {
            repoRef.current.bumpOutboundAttempt(
              item.clientMessageId,
              item.attempts + 1,
              new Date(Date.now() + 5000).toISOString(),
            );
          }
        }
        if (!cancelled) refresh();
      })
      .receive("error", () => setStatus("error"))
      .receive("timeout", () => setStatus("timeout"));

    return () => {
      cancelled = true;
      channelRef.current?.leave();
      socketRef.current?.disconnect();
    };
  }, [conversationId, deviceId, refresh, userId]);

  const sendChatText = useCallback(
    async (body: string) => {
      const channel = channelRef.current;
      const trimmed = body.trim();
      if (!trimmed || !channel) return;
      const clientMessageId = `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const pending: ChatMessage = {
        id: clientMessageId,
        clientMessageId,
        conversationId,
        senderUserId: userId,
        body: trimmed,
        serverSeq: null,
        deliveryState: "locally_pending",
        createdAt: new Date().toISOString(),
      };
      repoRef.current.upsert(pending);
      repoRef.current.enqueueOutbound({
        id: `q-${clientMessageId}`,
        conversationId,
        clientMessageId,
        body: trimmed,
      });
      refresh();

      try {
        const { message } = await sendText(channel, {
          clientMessageId,
          conversationId,
          body: trimmed,
          traceId: `trace-mobile-${Date.now()}`,
          // Repair #12 (F12-11b): best-effort cached fix; null when denied.
          coords: getCachedCoords(),
        });
        repoRef.current.reconcileFromServer(fromServer(message));
        refresh();
      } catch {
        repoRef.current.setDeliveryState(clientMessageId, "failed");
        refresh();
      }
    },
    [conversationId, refresh, userId],
  );

  const onSend = async () => {
    const body = text.trim();
    if (!body) return;
    setText("");
    await sendChatText(body);
  };

  /**
   * Repair #11 task 1 — wire signal-card actions to the conversation channel.
   * Revision cards: "accept_revision" -> accept, "keep_current" -> reject,
   * pushed as social_flow:respond_revision with {revision_id, decision, trace_id}.
   * Option cards: "accept_option:<id>" -> social_flow:respond_option.
   * ok -> re-render; error/timeout -> status (never a silent no-op).
   */
  const onSignalAction = useCallback(
    (actionId: string, signal: SocialFlowSignal) => {
      const channel = channelRef.current;
      if (!channel) return;
      const traceId = `trace-mobile-sf-${Date.now()}`;

      if (
        (actionId === "accept_revision" || actionId === "keep_current") &&
        signal.revisionId
      ) {
        const decision = actionId === "accept_revision" ? "accept" : "reject";
        channel
          .push("social_flow:respond_revision", {
            revision_id: signal.revisionId,
            decision,
            trace_id: traceId,
          })
          .receive("ok", () => {
            refresh();
          })
          .receive("error", () => setStatus("revision_failed"))
          .receive("timeout", () => setStatus("revision_failed"));
        return;
      }

      if (actionId.startsWith("accept_option:")) {
        const optionId = actionId.slice("accept_option:".length);
        channel
          .push("social_flow:respond_option", {
            option_id: optionId,
            response: "accept",
            trace_id: traceId,
          })
          .receive("ok", () => {
            refresh();
          })
          .receive("error", () => setStatus("option_failed"))
          .receive("timeout", () => setStatus("option_failed"));
      }
    },
    [refresh],
  );

  const activePlan = useMemo(() => {
    const actives = plans.filter((p) =>
      ["agreed", "changed", "tentative"].includes(p.status),
    );
    actives.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return actives[0] ?? null;
  }, [plans]);

  const isPlanLead = activePlan != null && activePlan.leadUserId === userId;

  /**
   * Repair #11 B3 — lead-only direct schedule edit. Pushes
   * social_flow:change_plan_time / social_flow:change_plan_date; the server
   * half (handle_in in conversation_channel.ex) is owned by the channel
   * agent — until it lands, error/timeout surfaces honestly in status and the
   * UI never claims a change that did not happen.
   */
  const submitScheduleChange = useCallback(() => {
    const channel = channelRef.current;
    if (!channel || !activePlan || !editingSchedule) return;
    const value = editingSchedule.value.trim();
    if (!value) return;
    const event =
      editingSchedule.mode === "time"
        ? "social_flow:change_plan_time"
        : "social_flow:change_plan_date";
    const payload =
      editingSchedule.mode === "time"
        ? {
            plan_id: activePlan.id,
            new_time_label: value,
            trace_id: `trace-mobile-sched-${Date.now()}`,
          }
        : {
            plan_id: activePlan.id,
            new_date_label: value,
            trace_id: `trace-mobile-sched-${Date.now()}`,
          };
    channel
      .push(event, payload)
      .receive("ok", () => {
        setEditingSchedule(null);
        refresh();
      })
      .receive("error", () => setStatus("change_failed"))
      .receive("timeout", () => setStatus("change_failed"));
  }, [activePlan, editingSchedule, refresh]);

  /**
   * Repair #11 B3 — non-lead change-request path: a plain chat message, which
   * routes through the normal conversation -> routing-agent path where the
   * lead can approve. Never a dead control.
   */
  const requestPlanChange = useCallback(() => {
    if (!activePlan) return;
    void sendChatText(`Could we change the time for "${activePlan.title}"?`);
  }, [activePlan, sendChatText]);

  const data = useMemo(() => messages, [messages]);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Opal · {peerLabel}</Text>
      <Text style={styles.meta}>status: {status} · sqlite-schema store</Text>
      <FlatList
        data={data}
        keyExtractor={(item) => item.clientMessageId}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.senderUserId === userId ? styles.mine : styles.theirs,
            ]}
          >
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.meta}>
              {item.deliveryState}
              {item.serverSeq != null ? ` · #${item.serverSeq}` : ""}
            </Text>
          </View>
        )}
      />
      {activePlan ? (
        <View style={styles.planCard} testID="sf-plan-card">
          <Text style={styles.planTitle}>{activePlan.title}</Text>
          {activePlan.timeLabel ? (
            <Text style={styles.planMeta}>{activePlan.timeLabel}</Text>
          ) : null}
          <Text style={styles.planMeta}>
            {activePlan.leadUserId === userId
              ? "Organized by you"
              : `Organized by ${peerLabel}`}
          </Text>
          {isPlanLead ? (
            editingSchedule ? (
              <View style={styles.planActions}>
                <TextInput
                  style={styles.planInput}
                  value={editingSchedule.value}
                  onChangeText={(value) =>
                    setEditingSchedule({ ...editingSchedule, value })
                  }
                  placeholder={
                    editingSchedule.mode === "time"
                      ? "New time, e.g. Friday at 7:30 PM"
                      : "New date, e.g. Saturday"
                  }
                  placeholderTextColor="#6B7280"
                />
                <Pressable
                  style={styles.smallButton}
                  onPress={submitScheduleChange}
                  accessibilityRole="button"
                  accessibilityLabel="Save schedule change"
                >
                  <Text style={styles.smallButtonText}>Save</Text>
                </Pressable>
                <Pressable
                  style={styles.smallButtonSecondary}
                  onPress={() => setEditingSchedule(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel schedule change"
                >
                  <Text style={styles.smallButtonTextSecondary}>Cancel</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.planActions}>
                <Pressable
                  style={styles.smallButton}
                  onPress={() =>
                    setEditingSchedule({ mode: "time", value: "" })
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Change plan time"
                >
                  <Text style={styles.smallButtonText}>Change time</Text>
                </Pressable>
                <Pressable
                  style={styles.smallButton}
                  onPress={() =>
                    setEditingSchedule({ mode: "date", value: "" })
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Change plan date"
                >
                  <Text style={styles.smallButtonText}>Change date</Text>
                </Pressable>
              </View>
            )
          ) : (
            <View style={styles.planActions}>
              <Pressable
                style={styles.smallButton}
                onPress={requestPlanChange}
                accessibilityRole="button"
                accessibilityLabel="Request a schedule change from the organizer"
              >
                <Text style={styles.smallButtonText}>Request change</Text>
              </Pressable>
            </View>
          )}
        </View>
      ) : null}
      {signals.slice(0, 3).map((signal) => (
        <SocialFlowSignalCard
          key={signal.id}
          signal={signal}
          onAction={onSignalAction}
        />
      ))}
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Message"
          placeholderTextColor="#6B7280"
        />
        <Pressable style={styles.send} onPress={onSend}>
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, backgroundColor: "#0B0F14" },
  title: { color: "#F9FAFB", fontSize: 18, fontWeight: "600", marginBottom: 4 },
  meta: { color: "#9CA3AF", fontSize: 12 },
  list: { paddingVertical: 12, gap: 8 },
  bubble: { padding: 12, borderRadius: 12, maxWidth: "85%", marginBottom: 8 },
  mine: { alignSelf: "flex-end", backgroundColor: "#1D4ED8" },
  theirs: { alignSelf: "flex-start", backgroundColor: "#1F2937" },
  body: { color: "#F9FAFB", fontSize: 16 },
  composer: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#F9FAFB",
  },
  send: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  sendText: { color: "#fff", fontWeight: "600" },
  planCard: {
    marginVertical: 6,
    marginHorizontal: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#C5CDD8",
    backgroundColor: "#F4F7FB",
  },
  planTitle: { color: "#0F172A", fontSize: 16, fontWeight: "600", marginBottom: 2 },
  planMeta: { color: "#475569", fontSize: 13, marginTop: 2 },
  planActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  planInput: {
    flex: 1,
    minWidth: 160,
    borderWidth: 1,
    borderColor: "#94A3B8",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },
  smallButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#1D4ED8",
    justifyContent: "center",
  },
  smallButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  smallButtonSecondary: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
  },
  smallButtonTextSecondary: { color: "#0F172A", fontSize: 14, fontWeight: "600" },
});
