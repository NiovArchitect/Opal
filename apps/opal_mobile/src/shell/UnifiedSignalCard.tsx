import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { familyLabel, signalFamily } from "./signals";

type Props = {
  sourceType: string;
  title: string;
  explanation: string;
  primaryAction?: string;
  privacyClass?: string;
  onPrimary?: () => void;
  testID?: string;
};

/**
 * One signal component with bounded variants — not a card per backend feature.
 */
export function UnifiedSignalCard({
  sourceType,
  title,
  explanation,
  primaryAction,
  privacyClass,
  onPrimary,
  testID,
}: Props) {
  const family = signalFamily(sourceType);
  const privateLabel =
    privacyClass === "private" ? "Private — only you can see this." : null;
  const a11y = ["Opal update", familyLabel(family), title, explanation, privateLabel]
    .filter(Boolean)
    .join(". ");

  return (
    <View
      style={styles.card}
      accessibilityRole="summary"
      accessibilityLabel={a11y}
      testID={testID ?? `signal-${family}`}
    >
      <Text style={styles.kind}>{familyLabel(family)}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.explanation}>{explanation}</Text>
      {privateLabel ? <Text style={styles.private}>{privateLabel}</Text> : null}
      {primaryAction ? (
        <Pressable
          style={styles.button}
          onPress={onPrimary}
          accessibilityRole="button"
          accessibilityLabel={primaryAction}
          hitSlop={8}
        >
          <Text style={styles.buttonText}>{primaryAction}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 6,
    marginHorizontal: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2A3544",
    backgroundColor: "#121A24",
    minHeight: 44,
  },
  kind: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F8FAFC",
    lineHeight: 22,
  },
  explanation: {
    marginTop: 4,
    fontSize: 14,
    color: "#CBD5E1",
    lineHeight: 20,
  },
  private: {
    marginTop: 8,
    fontSize: 12,
    color: "#94A3B8",
    fontStyle: "italic",
  },
  button: {
    marginTop: 12,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    alignSelf: "flex-start",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
