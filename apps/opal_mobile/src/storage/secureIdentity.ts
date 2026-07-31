/**
 * Development synthetic identity storage.
 * Uses expo-secure-store on device; falls back to memory in pure Node tests.
 */

export type DevIdentity = {
  userId: string;
  deviceId: string;
};

const MEMORY = new Map<string, string>();

export async function saveDevIdentity(identity: DevIdentity): Promise<void> {
  try {
    // Dynamic import keeps Node unit tests free of native modules.
    const SecureStore = await import("expo-secure-store");
    await SecureStore.setItemAsync("opal.dev.userId", identity.userId);
    await SecureStore.setItemAsync("opal.dev.deviceId", identity.deviceId);
  } catch {
    MEMORY.set("opal.dev.userId", identity.userId);
    MEMORY.set("opal.dev.deviceId", identity.deviceId);
  }
}

export async function loadDevIdentity(): Promise<DevIdentity | null> {
  try {
    const SecureStore = await import("expo-secure-store");
    const userId = await SecureStore.getItemAsync("opal.dev.userId");
    const deviceId = await SecureStore.getItemAsync("opal.dev.deviceId");
    if (userId && deviceId) return { userId, deviceId };
    return null;
  } catch {
    const userId = MEMORY.get("opal.dev.userId");
    const deviceId = MEMORY.get("opal.dev.deviceId");
    if (userId && deviceId) return { userId, deviceId };
    return null;
  }
}
