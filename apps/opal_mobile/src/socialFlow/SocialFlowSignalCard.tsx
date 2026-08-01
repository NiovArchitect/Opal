import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { SocialFlowSignal } from "./types";

type Props = {
  signal: SocialFlowSignal;
  onAction?: (actionId: string, signal: SocialFlowSignal) => void;
};

/**
 * Inline conversation Social Flow signal — not a dashboard card wall.
 * Visibility and private copy must be explicit in text (not color-only).
 */
export function SocialFlowSignalCard({ signal, onAction }: Props) {
  const privateLabel =
    signal.visibility === "private" ? "Private — only you can see this." : null;

  const a11yLabel = [
    "Opal suggestion",
    signal.kind.replace(/_/g, " "),
    signal.copy,
    privateLabel,
    `Status ${signal.status}`,
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <View
      style={styles.card}
      accessibilityRole="summary"
      accessibilityLabel={a11yLabel}
      testID={`sf-signal-${signal.kind}`}
    >
      <Text style={styles.kind}>{labelForKind(signal.kind)}</Text>
      <Text style={styles.copy}>{signal.copy}</Text>
      {privateLabel ? (
        <Text style={styles.private} accessibilityLabel={privateLabel}>
          {privateLabel}
        </Text>
      ) : null}
      <View style={styles.actions}>
        {(signal.actions || []).map((a) => (
          <Pressable
            key={a.id}
            style={styles.button}
            onPress={() => onAction?.(a.id, signal)}
            accessibilityRole="button"
            accessibilityLabel={a.label}
            hitSlop={8}
          >
            <Text style={styles.buttonText}>{a.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function labelForKind(kind: string): string {
  switch (kind) {
    case "possible_plan":
      return "Possible plan";
    case "missing_detail":
      return "Needs a detail";
    case "agreement":
      return "Agreed plan";
    case "commitment":
      return "Commitment";
    case "private_reminder":
      return "Private reminder";
    case "revision":
      return "Plan change";
    case "reconnect_summary":
      return "While you were away";
    default:
      return "Opal";
  }
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 6,
    marginHorizontal: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#C5CDD8",
    backgroundColor: "#F4F7FB",
    minHeight: 44,
  },
  kind: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 4,
  },
  copy: {
    fontSize: 15,
    color: "#0F172A",
    lineHeight: 20,
  },
  private: {
    marginTop: 6,
    fontSize: 12,
    color: "#475569",
    fontStyle: "italic",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  button: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#1D4ED8",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
