import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { ComingUpItem } from "../shell/types";

type Props = {
  needsConfirmation: ComingUpItem[];
  today: ComingUpItem[];
  upcoming: ComingUpItem[];
  recent: ComingUpItem[];
};

function Section({ title, items }: { title: string; items: ComingUpItem[] }) {
  if (items.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((p) => (
        <View key={p.id} style={styles.card} accessibilityLabel={`${p.title}. ${p.when_label ?? ""}`}>
          <Text style={styles.title}>{p.title}</Text>
          {p.when_label ? <Text style={styles.meta}>{p.when_label}</Text> : null}
          {p.who_label ? <Text style={styles.meta}>With {p.who_label}</Text> : null}
          {p.where_label ? <Text style={styles.meta}>{p.where_label}</Text> : null}
          <Text style={styles.state}>{p.state.replace(/_/g, " ")}</Text>
        </View>
      ))}
    </View>
  );
}

export function PlansScreen({ needsConfirmation, today, upcoming, recent }: Props) {
  const empty =
    needsConfirmation.length + today.length + upcoming.length + recent.length === 0;

  return (
    <ScrollView style={styles.root} accessibilityLabel="Plans">
      <Text style={styles.header} accessibilityRole="header">
        Plans
      </Text>
      {empty ? (
        <Text style={styles.empty}>Plans from your conversations appear here.</Text>
      ) : (
        <>
          <Section title="Needs confirmation" items={needsConfirmation} />
          <Section title="Today" items={today} />
          <Section title="Upcoming" items={upcoming} />
          <Section title="Recently completed" items={recent} />
        </>
      )}
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
  empty: { margin: 16, color: "#CBD5E1", fontSize: 15 },
  section: { marginTop: 20 },
  sectionTitle: {
    marginHorizontal: 16,
    marginBottom: 8,
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  card: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#121A24",
    borderColor: "#2A3544",
    borderWidth: 1,
  },
  title: { color: "#F8FAFC", fontSize: 16, fontWeight: "600" },
  meta: { color: "#94A3B8", marginTop: 4, fontSize: 14 },
  state: { color: "#64748B", marginTop: 8, fontSize: 12, textTransform: "capitalize" },
});
