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

type Props = {
  onAuthenticated: (session: ProductSession) => void;
  deviceLabel?: string;
};

/**
 * R1B activation — same R1A product authority.
 * "Your number is your key" → real Twilio Verify when production_sms.
 * No synthetic fixture defaults. No founder seed.
 */
export function ActivationScreen({
  onAuthenticated,
  deviceLabel = "OpalMobile",
}: Props) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);

  const requestCode = async () => {
    setBusy(true);
    setError(null);
    setStatus("Requesting code…");
    try {
      const res = await startChallenge(phone.trim(), deviceLabel);
      setChallengeId(res.challenge.id);
      setProvider(res.provider || res.challenge.provider || null);
      if (res.development_code) {
        // Only present when server explicitly returns synthetic development code.
        setCode(res.development_code);
        setStatus("Development code available.");
      } else {
        setCode("");
        setStatus("Enter the code from your SMS.");
      }
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
        displayName: name.trim() || "Opal",
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
    <View style={styles.root} testID="activation-screen">
      <Text style={styles.eyebrow}>OPAL GRAPH</Text>
      <Text style={styles.title}>Your number is your key</Text>
      <Text style={styles.sub}>
        Real verification through Opal. No founder seed. No synthetic shortcut on
        production SMS.
      </Text>

      <Text style={styles.label}>Phone (E.164)</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="phone-pad"
        placeholder="+1…"
        placeholderTextColor="#6B7280"
        testID="activation-phone"
      />

      <Pressable
        style={[styles.btn, busy && styles.btnDisabled]}
        disabled={busy || phone.trim().length < 8}
        onPress={() => void requestCode()}
        testID="activation-request-code"
      >
        {busy && !challengeId ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Text me a code</Text>
        )}
      </Pressable>

      {challengeId ? (
        <>
          <Text style={styles.label}>Code</Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            placeholder="••••••"
            placeholderTextColor="#6B7280"
            testID="activation-code"
          />
          <Text style={styles.label}>Display name (optional)</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor="#6B7280"
            testID="activation-name"
          />
          <Pressable
            style={[styles.btn, busy && styles.btnDisabled]}
            disabled={busy || code.trim().length < 4}
            onPress={() => void verify()}
            testID="activation-verify"
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Enter Opal</Text>
            )}
          </Pressable>
        </>
      ) : null}

      {provider ? (
        <Text style={styles.meta} testID="activation-provider">
          Provider: {provider}
        </Text>
      ) : null}
      {status ? <Text style={styles.meta}>{status}</Text> : null}
      {error ? (
        <Text style={styles.error} testID="activation-error">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, justifyContent: "center", backgroundColor: "#05060A" },
  eyebrow: {
    color: "#A78BFA",
    letterSpacing: 2,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 8,
  },
  title: { color: "#F5F3FF", fontSize: 28, fontWeight: "700", marginBottom: 8 },
  sub: { color: "#C4B5FD", fontSize: 14, lineHeight: 20, marginBottom: 24 },
  label: { color: "#9CA3AF", fontSize: 12, marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.4)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#F9FAFB",
    marginBottom: 12,
  },
  btn: {
    backgroundColor: "#7C3AED",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "700" },
  meta: { color: "#9CA3AF", marginTop: 12, fontSize: 12 },
  error: { color: "#FCA5A5", marginTop: 12, fontSize: 13 },
});
