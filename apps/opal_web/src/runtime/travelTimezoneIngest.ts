/**
 * Phase X — foreground timezone ingest (web).
 *
 * Timezone-only POST is enough. City is never sent here (needs location grant).
 * Native AppState hooks can call the same ingestTravelTimezone helper.
 *
 * Honest gate: this wires document.visibilitychange on web. Expo / native-host
 * foreground can call `ingestDeviceTimezone` from a native bridge later.
 */

import { ingestTravelTimezone } from "../api/productClient";

let started = false;

export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles";
  } catch {
    return "America/Los_Angeles";
  }
}

export async function ingestDeviceTimezone(bearer?: string): Promise<void> {
  const timezone = deviceTimezone();
  try {
    await ingestTravelTimezone({ timezone }, bearer);
  } catch {
    // Soft-fail: travel ingest must never block the shell.
  }
}

/** Start web foreground ingest once. Safe to call repeatedly. */
export function startWebTravelTimezoneIngest(getBearer: () => string | undefined | null): () => void {
  if (typeof document === "undefined" || started) {
    return () => undefined;
  }
  started = true;

  const tick = () => {
    if (document.visibilityState === "visible") {
      void ingestDeviceTimezone(getBearer() || undefined);
    }
  };

  document.addEventListener("visibilitychange", tick);
  // First paint / launch
  tick();

  return () => {
    document.removeEventListener("visibilitychange", tick);
    started = false;
  };
}
