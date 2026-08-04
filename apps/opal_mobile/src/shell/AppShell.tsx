import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ConversationScreen } from "../screens/ConversationScreen";
import { ChatsScreen } from "../screens/ChatsScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { PlansScreen } from "../screens/PlansScreen";
import { YouScreen } from "../screens/YouScreen";
import { FindPeopleScreen } from "../socialFlow/FindPeopleScreen";
import { PRIMARY_TABS } from "./navigation";
import type { ComingUpItem, NeedsYouItem, PrimaryTab } from "./types";
import { SYNTHETIC } from "../config";

type Props = {
  displayName?: string;
  userId?: string;
  deviceId?: string;
  peerLabel?: string;
  conversationId?: string;
  initialTab?: PrimaryTab;
  needsYou?: NeedsYouItem[];
  comingUp?: ComingUpItem[];
  /** When true, chats list starts empty to exercise people-first onboarding. */
  emptyPeopleStart?: boolean;
  onInvitePeople?: (
    people: { phone: string; label: string; invite_source: "selected_contact" | "manual" }[],
  ) => Promise<void>;
};

/**
 * Conversation-native product shell: Home · Chats · Plans · You.
 * Conversation remains the primary work surface when opened from lists.
 * SF18: People-first empty state and FindPeople navigation from Chats and You.
 */
export function AppShell({
  displayName = "Alex",
  userId = SYNTHETIC.alexUserId,
  deviceId = "mobile-alex-1",
  peerLabel = "Jordan",
  conversationId = SYNTHETIC.alexJordanConversationId,
  initialTab = "home",
  needsYou = DEMO_NEEDS,
  comingUp = DEMO_COMING_UP,
  emptyPeopleStart = false,
  onInvitePeople,
}: Props) {
  const [tab, setTab] = useState<PrimaryTab>(initialTab);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [findPeopleOpen, setFindPeopleOpen] = useState(false);
  const [hasPeople, setHasPeople] = useState(!emptyPeopleStart);

  if (findPeopleOpen) {
    return (
      <View style={styles.root}>
        <FindPeopleScreen
          onSkip={() => setFindPeopleOpen(false)}
          onManual={() => {
            /* manual path stays inside FindPeopleScreen phases; skip closes to shell */
            setFindPeopleOpen(false);
            setTab("you");
          }}
          onInvite={async (people) => {
            if (onInvitePeople) {
              await onInvitePeople(people);
            }
            setHasPeople(true);
            setFindPeopleOpen(false);
            setTab("chats");
          }}
        />
      </View>
    );
  }

  if (activeConversation) {
    return (
      <View style={styles.root}>
        <Pressable
          onPress={() => setActiveConversation(null)}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Back to chats"
        >
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <ConversationScreen
          userId={userId}
          conversationId={activeConversation}
          deviceId={deviceId}
          peerLabel={peerLabel}
        />
      </View>
    );
  }

  const chatItems = hasPeople
    ? [
        {
          conversationId,
          title: peerLabel,
          subtitle: "Dinner next Thursday may be a plan.",
          safetyState: "ok" as const,
        },
      ]
    : [];

  return (
    <View style={styles.root} accessibilityLabel="Opal">
      <View style={styles.body}>
        {tab === "home" ? (
          <HomeScreen
            displayName={displayName}
            initialNeedsYou={needsYou}
            comingUp={comingUp}
            onOpenChat={(id) => setActiveConversation(id ?? conversationId)}
          />
        ) : null}
        {tab === "chats" ? (
          <ChatsScreen
            chats={chatItems}
            onOpen={(id) => setActiveConversation(id)}
            onFindPeople={() => setFindPeopleOpen(true)}
          />
        ) : null}
        {tab === "plans" ? (
          <PlansScreen
            needsConfirmation={comingUp.filter((c) => c.state === "needs_confirmation")}
            today={comingUp.filter((c) => c.state === "today" || c.state === "live")}
            upcoming={comingUp.filter((c) => c.state === "upcoming")}
            recent={[]}
          />
        ) : null}
        {tab === "you" ? (
          <YouScreen
            displayName={displayName}
            handle="alex"
            deviceCount={1}
            blockCount={0}
            onFindPeople={() => setFindPeopleOpen(true)}
          />
        ) : null}
      </View>
      <View style={styles.tabBar} accessibilityRole="tablist">
        {PRIMARY_TABS.map((t) => {
          const selected = tab === t.id;
          return (
            <Pressable
              key={t.id}
              style={[styles.tab, selected && styles.tabSelected]}
              onPress={() => setTab(t.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={t.a11y}
              hitSlop={6}
            >
              <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const DEMO_NEEDS: NeedsYouItem[] = [
  {
    id: "ny1",
    source_type: "due_reminder",
    title: "Book the restaurant.",
    explanation: "Private reservation reminder is due.",
    primary_action: "Complete",
    privacy_class: "private",
    conversation_id: SYNTHETIC.alexJordanConversationId,
  },
  {
    id: "ny2",
    source_type: "needs_answer",
    title: "Jordan asked which area works best.",
    explanation: "An open question still needs your reply.",
    primary_action: "Reply",
    privacy_class: "private",
    conversation_id: SYNTHETIC.alexJordanConversationId,
  },
];

const DEMO_COMING_UP: ComingUpItem[] = [
  {
    id: "cu1",
    title: "Dinner with Jordan",
    when_label: "Thursday at 7:00 PM",
    who_label: "Jordan",
    state: "upcoming",
    conversation_id: SYNTHETIC.alexJordanConversationId,
  },
];

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0B0F14" },
  body: { flex: 1 },
  back: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#0B0F14",
    minHeight: 44,
    justifyContent: "center",
  },
  backText: { color: "#60A5FA", fontSize: 16, fontWeight: "600" },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
    backgroundColor: "#0B0F14",
    paddingBottom: 8,
    paddingTop: 4,
  },
  tab: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  tabSelected: {
    borderTopWidth: 2,
    borderTopColor: "#2563EB",
  },
  tabLabel: { color: "#64748B", fontSize: 12, fontWeight: "600" },
  tabLabelSelected: { color: "#F8FAFC" },
});
