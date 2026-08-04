import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  CONTACT_PERMISSION_COPY,
  type ContactMinimizationReport,
  type ContactPermissionStatus,
  type ContactsBridge,
  type DeviceContact,
  type SelectedInvitee,
  buildMinimizationReport,
  canReadContacts,
  createMockContactsBridge,
  filterContacts,
  logMinimizationReport,
  selectedInvitePayload,
} from "./deviceContacts";
import { isProhibitedOnboardingCopy } from "./relationshipOnboarding";

type Props = {
  bridge?: ContactsBridge;
  onInvite: (
    people: { phone: string; label: string; invite_source: "selected_contact" | "manual" }[],
  ) => Promise<void>;
  onSkip: () => void;
  onManual: () => void;
  onMinimizationReport?: (report: ContactMinimizationReport) => void;
};

/**
 * Mobile-first selected-contact invite UI.
 * Permission denial never blocks product use.
 */
export function FindPeopleScreen({
  bridge,
  onInvite,
  onSkip,
  onManual,
  onMinimizationReport,
}: Props) {
  const contactsBridge = useMemo(
    () =>
      bridge ||
      createMockContactsBridge([
        {
          id: "1",
          name: "Jordan Lee",
          phones: [{ id: "p1", number: "+12025550102", label: "mobile" }],
        },
        {
          id: "2",
          name: "Maya Chen",
          phones: [
            { id: "p2a", number: "+12025550103", label: "mobile" },
            { id: "p2b", number: "+12025550113", label: "work" },
          ],
        },
      ]),
    [bridge],
  );

  const [phase, setPhase] = useState<"intro" | "list" | "confirm" | "busy" | "denied">("intro");
  const [contacts, setContacts] = useState<DeviceContact[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SelectedInvitee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<ContactPermissionStatus>("undetermined");

  const visible = useMemo(() => filterContacts(contacts, query), [contacts, query]);

  const requestContacts = useCallback(async () => {
    setError(null);
    const status = await contactsBridge.requestPermission();
    setPermission(status);
    if (!canReadContacts(status)) {
      setPhase("denied");
      return;
    }
    const rows = await contactsBridge.loadContacts();
    setContacts(rows);
    setPhase("list");
  }, [contactsBridge]);

  const toggle = (contact: DeviceContact, phone: string) => {
    setSelected((prev) => {
      const exists = prev.find((p) => p.contactId === contact.id && p.phone === phone);
      if (exists) return prev.filter((p) => p !== exists);
      return [
        ...prev,
        {
          contactId: contact.id,
          displayName: contact.name,
          phone,
        },
      ];
    });
  };

  const confirm = async () => {
    if (!selected.length) return;
    setPhase("busy");
    setError(null);
    try {
      const payload = selectedInvitePayload(selected).map((p) => ({
        ...p,
        invite_source: "selected_contact" as const,
      }));
      const report = buildMinimizationReport({
        permission,
        loaded: contacts,
        displayed: visible,
        selected,
        submittedPhoneCount: payload.length,
      });
      logMinimizationReport(report);
      onMinimizationReport?.(report);
      await onInvite(payload);
      setContacts([]);
      setSelected([]);
      setPhase("intro");
    } catch (e) {
      setError((e as Error).message || "Could not invite this person.");
      setPhase("confirm");
    }
  };

  if (phase === "intro") {
    return (
      <View style={styles.wrap} testID="find-people-intro">
        <Text style={styles.title}>People you know</Text>
        <Text style={styles.lede}>Your people will show up here.</Text>
        <Text style={styles.permission}>{CONTACT_PERMISSION_COPY}</Text>
        <Pressable style={styles.primary} onPress={() => void requestContacts()}>
          <Text style={styles.primaryText}>Select from contacts</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={onManual}>
          <Text style={styles.secondaryText}>Invite manually</Text>
        </Pressable>
        <Pressable style={styles.ghost} onPress={onSkip}>
          <Text style={styles.ghostText}>Skip for now</Text>
        </Pressable>
      </View>
    );
  }

  if (phase === "denied") {
    return (
      <View style={styles.wrap} testID="find-people-denied">
        <Text style={styles.title}>Contacts not available</Text>
        <Text style={styles.lede}>You can still invite someone with their number.</Text>
        <Pressable style={styles.primary} onPress={onManual}>
          <Text style={styles.primaryText}>Invite manually</Text>
        </Pressable>
        <Pressable style={styles.ghost} onPress={onSkip}>
          <Text style={styles.ghostText}>Skip for now</Text>
        </Pressable>
      </View>
    );
  }

  if (phase === "busy") {
    return (
      <View style={styles.wrap}>
        <ActivityIndicator />
        <Text style={styles.lede}>Sending invitation…</Text>
      </View>
    );
  }

  if (phase === "confirm") {
    return (
      <View style={styles.wrap} testID="find-people-confirm">
        <Text style={styles.title}>Confirm who to invite</Text>
        <Text style={styles.lede}>Nothing is sent until you confirm.</Text>
        {selected.map((s) => (
          <Text key={`${s.contactId}-${s.phone}`} style={styles.row}>
            {s.displayName}
          </Text>
        ))}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable style={styles.primary} onPress={() => void confirm()}>
          <Text style={styles.primaryText}>Send invitation</Text>
        </Pressable>
        <Pressable style={styles.ghost} onPress={() => setPhase("list")}>
          <Text style={styles.ghostText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrap} testID="find-people-list">
      <Text style={styles.title}>Choose people</Text>
      <TextInput
        style={styles.search}
        placeholder="Search"
        placeholderTextColor="#6b7a88"
        value={query}
        onChangeText={setQuery}
        accessibilityLabel="Search contacts"
      />
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.lede}>No contacts with phone numbers.</Text>}
        renderItem={({ item }) => (
          <View style={styles.contactCard}>
            <Text style={styles.contactName}>{item.name}</Text>
            {item.phones.map((p) => {
              const on = selected.some((s) => s.contactId === item.id && s.phone === p.number);
              return (
                <Pressable
                  key={p.id}
                  style={[styles.phoneRow, on && styles.phoneRowOn]}
                  onPress={() => toggle(item, p.number)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                >
                  <Text style={styles.phoneText}>{p.number}</Text>
                  <Text style={styles.check}>{on ? "Selected" : "Select"}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      />
      <Pressable
        style={[styles.primary, !selected.length && styles.disabled]}
        disabled={!selected.length}
        onPress={() => setPhase("confirm")}
      >
        <Text style={styles.primaryText}>
          Continue{selected.length ? ` (${selected.length})` : ""}
        </Text>
      </Pressable>
      <Pressable style={styles.ghost} onPress={onSkip}>
        <Text style={styles.ghostText}>Skip for now</Text>
      </Pressable>
      {isProhibitedOnboardingCopy(CONTACT_PERMISSION_COPY) ? (
        <Text style={styles.error}>Copy policy failure</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16, gap: 10, backgroundColor: "#05060A" },
  title: { color: "#F2F7FF", fontSize: 22, fontWeight: "600" },
  lede: { color: "#9FB0C0", fontSize: 15, lineHeight: 22 },
  permission: { color: "#C7D4E0", fontSize: 14, lineHeight: 20, marginVertical: 8 },
  primary: {
    backgroundColor: "#1C8FA3",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryText: { color: "#fff", fontWeight: "600" },
  secondary: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  secondaryText: { color: "#E8F2FA" },
  ghost: { padding: 12, alignItems: "center" },
  ghostText: { color: "#8FA0B0" },
  search: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 12,
    color: "#F2F7FF",
  },
  contactCard: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  contactName: { color: "#F2F7FF", fontSize: 16, marginBottom: 6 },
  phoneRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  phoneRowOn: { backgroundColor: "rgba(28,143,163,0.2)" },
  phoneText: { color: "#C7D4E0" },
  check: { color: "#7ED6E8", fontSize: 12 },
  row: { color: "#E8F2FA", paddingVertical: 6 },
  error: { color: "#F28B82" },
  disabled: { opacity: 0.45 },
});
