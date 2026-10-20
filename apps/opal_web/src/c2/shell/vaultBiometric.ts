/**
 * Repair #20 F-4 — the Private graphs biometric unlock (WebAuthn
 * platform authenticator).
 *
 * WHAT THIS IS, plainly: a DEVICE-LOCAL user-verification gesture.
 * Settings registers a platform credential on THIS device
 * (Face ID / fingerprint / device PIN, whatever the platform offers)
 * and keeps only its credential id in this device's local storage.
 * The gate's unlock calls `navigator.credentials.get` with
 * `userVerification: "required"` for that credential; the platform
 * returning a credential IS the proof the device's owner verified.
 *
 * WHAT THIS IS NOT: it is not server-verified WebAuthn (no public
 * key or assertion ever reaches Opal's server), and it is not
 * account security. That matches the graph lock's own stated threat
 * model (GraphLock moduledoc): the gate unlocks no server data —
 * the owner's plan list already travels under their authenticated
 * session — it only keeps a person holding the owner's unlocked
 * phone from casually opening the Private area. The PIN stays the
 * server-verified credential and the always-available fallback;
 * the account-level `biometric_enabled` preference (the server's
 * one projection) must ALSO be on before the gate offers this.
 */

const CRED_ID_KEY = "opal.vault.webauthn.credentialId";
const USER_ID_KEY = "opal.vault.webauthn.userId";

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  crypto.getRandomValues(out);
  return out;
}

/** True only when this device actually carries a registered vault
 *  credential (Settings registered it here). */
export function hasVaultBiometricCredential(): boolean {
  return Boolean(storage()?.getItem(CRED_ID_KEY));
}

/** True when the platform offers a user-verifying platform
 *  authenticator at all. Resolves false wherever WebAuthn is absent
 *  (insecure context, older browser, capture rigs) — callers must
 *  treat false as "the biometric affordance does not render". */
export async function vaultBiometricPlatformAvailable(): Promise<boolean> {
  try {
    if (
      typeof window === "undefined" ||
      !window.PublicKeyCredential ||
      !navigator.credentials?.create ||
      !navigator.credentials?.get
    ) {
      return false;
    }
    if (
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable ===
      "function"
    ) {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
    return true;
  } catch {
    return false;
  }
}

/** The gate offers biometric unlock only when ALL THREE truths hold:
 *  the account preference is on, this device registered a credential,
 *  and the platform authenticator is available here. */
export async function vaultBiometricOfferable(
  accountEnabled: boolean,
): Promise<boolean> {
  if (!accountEnabled || !hasVaultBiometricCredential()) return false;
  return vaultBiometricPlatformAvailable();
}

/**
 * Register a platform credential on this device (Settings, turning
 * the toggle ON). Resolves true only when the platform created the
 * credential with user verification; any refusal/cancel resolves
 * false and stores nothing.
 */
export async function registerVaultBiometric(): Promise<boolean> {
  const store = storage();
  if (!store || !(await vaultBiometricPlatformAvailable())) return false;
  try {
    let userId = store.getItem(USER_ID_KEY);
    if (!userId) {
      userId = toBase64Url(randomBytes(16));
      store.setItem(USER_ID_KEY, userId);
    }
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: randomBytes(32),
        rp: { name: "Opal", id: window.location.hostname },
        user: {
          id: fromBase64Url(userId),
          name: "opal-private-graphs",
          displayName: "Opal Private graphs",
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60_000,
      },
    })) as PublicKeyCredential | null;
    if (!credential) return false;
    store.setItem(CRED_ID_KEY, toBase64Url(new Uint8Array(credential.rawId)));
    return true;
  } catch {
    return false;
  }
}

/** Remove this device's vault credential registration (Settings,
 *  turning the toggle OFF). The platform credential itself cannot be
 *  deleted from JS — forgetting its id here is what retires it: the
 *  gate can no longer request it, so it can never unlock. */
export function clearVaultBiometric(): void {
  storage()?.removeItem(CRED_ID_KEY);
}

/**
 * The gate's biometric unlock: one platform user-verification
 * assertion for the credential registered on this device. Resolves
 * true only when the platform returns the credential (verification
 * happened); cancel/refusal/absence resolves false and the PIN pad
 * remains the way in.
 */
export async function assertVaultBiometric(): Promise<boolean> {
  const store = storage();
  const credId = store?.getItem(CRED_ID_KEY);
  if (!credId || !(await vaultBiometricPlatformAvailable())) return false;
  try {
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: randomBytes(32),
        allowCredentials: [
          { type: "public-key", id: fromBase64Url(credId) as BufferSource },
        ],
        userVerification: "required",
        timeout: 60_000,
      },
    });
    return Boolean(credential);
  } catch {
    return false;
  }
}
