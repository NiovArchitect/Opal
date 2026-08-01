import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type Props = {
  displayName: string;
  handle?: string;
  deviceCount?: number;
  blockCount?: number;
  familyPresent?: boolean;
  onSignOut?: () => void;
};

export function YouScreen({
  displayName,
  handle,
  deviceCount = 1,
  blockCount = 0,
  familyPresent,
  onSignOut,
}: Props) {
  return (
    <ScrollView style={styles.root} accessibilityLabel="You">
      <Text style={styles.header} accessibilityRole="header">
        You
      </Text>
      <View style={styles.card}>
        <Text style={styles.label}>Account</Text>
        <Text style={styles.value}>{displayName}</Text>
        {handle ? <Text style={styles.meta}>@{handle}</Text> : null}
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Devices</Text>
        <Text style={styles.value}>{deviceCount} active session(s)</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Privacy</Text>
        <Text style={styles.value}>Private by default · owner-scoped memory</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Safety</Text>
        <Text style={styles.value}>
          {blockCount > 0 ? `${blockCount} blocked contact(s)` : "No active blocks"}
        </Text>
        <Text style={styles.meta}>No behavior scores</Text>
      </View>
      {familyPresent ? (
        <View style={styles.card}>
          <Text style={styles.label}>Family</Text>
          <Text style={styles.value}>Guardian-managed family available</Text>
          <Text style={styles.meta}>Not a surveillance dashboard</Text>
        </View>
      ) : null}
      <View style={styles.card}>
        <Text style={styles.label}>Accessibility</Text>
        <Text style={styles.value}>Text scaling · reduced motion respected</Text>
      </View>
      <Pressable
        style={styles.signOut}
        onPress={onSignOut}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0B0F14" },
  header: {
    marginTop: 16,
    marginHorizontal: 16,
    fontSize: 24,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  card: {
    marginHorizontal: 12,
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#121A24",
    borderWidth: 1,
    borderColor: "#2A3544",
  },
  label: { color: "#94A3B8", fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  value: { color: "#F8FAFC", fontSize: 16, marginTop: 6 },
  meta: { color: "#64748B", fontSize: 13, marginTop: 4 },
  signOut: {
    margin: 16,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
  },
  signOutText: { color: "#F8FAFC", fontWeight: "600", fontSize: 16 },
});
