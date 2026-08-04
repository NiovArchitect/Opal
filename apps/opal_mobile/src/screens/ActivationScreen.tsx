import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  startChallenge,
  verifyChallenge,
  type ProductSession,
} from "../api/productSession";

/** Approved synthetic fixtures only — not production SMS. */
const FIXTURE_HINT = "Approved test numbers only. No SMS will be sent.";

type Props = {
  onAuthenticated: (session: ProductSession) => void;
  deviceLabel?: string;
};

export function ActivationScreen({
  onAuthenticated,
  deviceLabel = "OpalMobile",
}: Props) {
  const [phone, setPhone] = useState("+12025550101");
  const [code, setCode] = useState("");
  const [name, setName] = useState("Alex Reed");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const requestCode = async () => {
    setBusy(true);
    setError(null);
    setStatus("Requesting code…");
    try {
      const res = await startChallenge(phone.trim(), deviceLabel);
      setChallengeId(res.challenge.id);
      if (res.development_code) setCode(res.development_code);
      setStatus("Enter the development code.");
    } catch (e) {
      setError((e as Error).message || "Could not start");
      setStatus(null);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!challengeId) return;
    setBusy(true);
    setError(null);
    setStatus("Checking code…");
    try {
      const session = await verifyChallenge({
        challengeId,
        code: code.trim(),
        displayName: name.trim() || "Opal User",
        deviceLabel,
        handleHint: name
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "_")
          .slice(0, 24),
      });
      setStatus("Signed in.");
      onAuthenticated(session);
    } catch (e) {
      setError((e as Error).message || "Could not verify");
      setStatus(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root} accessibilityLabel="Activate Opal">
      <Text style={styles.title} accessibilityRole="header">
        Continue with Opal
      </Text>
      <Text style={styles.hint}>{FIXTURE_HINT}</Text>

      <Text style={styles.label}>Your name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        accessibilityLabel="Your name"
      />

      <Text style={styles.label}>Test number</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        accessibilityLabel="Test number"
      />

      {!challengeId ? (
        <Pressable
          style={styles.primary}
          onPress={() => void requestCode()}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Request code"
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>Request code</Text>
          )}
        </Pressable>
      ) : (
        <>
          <Text style={styles.label}>Development code</Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            accessibilityLabel="Development code"
          />
          <Pressable
            style={styles.primary}
            onPress={() => void verify()}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Verify and enter"
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>Enter Opal</Text>
            )}
          </Pressable>
        </>
      )}

      {status ? (
        <Text style={styles.status} accessibilityLiveRegion="polite">
          {status}
        </Text>
      ) : null}
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="assertive">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#05060A", padding: 20, gap: 10 },
  title: { color: "#F2F7FF", fontSize: 24, fontWeight: "700", marginTop: 24 },
  hint: { color: "#9FB0C0", fontSize: 14, lineHeight: 20, marginBottom: 8 },
  label: { color: "#C7D4E0", fontSize: 13, marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    padding: 12,
    color: "#F2F7FF",
  },
  primary: {
    marginTop: 12,
    backgroundColor: "#1C8FA3",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
  },
  primaryText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  status: { color: "#7ED6E8", marginTop: 8 },
  error: { color: "#F28B82", marginTop: 8 },
});
