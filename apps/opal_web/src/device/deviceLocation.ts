/**
 * W8 Phase 4 — shared device geolocation.
 * Persist last good coords so Meet Allow → Center nearby can reuse them.
 */

export type DeviceCoords = {
  lat: number;
  lng: number;
  accuracy?: number;
  at: number;
};

const STORAGE_KEY = "opal.device.coords.v1";
const MAX_AGE_MS = 30 * 60_000;

let memory: DeviceCoords | null = null;

export function saveDeviceCoords(coords: DeviceCoords): void {
  memory = coords;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(coords));
  } catch {
    /* private mode */
  }
}

export function readCachedDeviceCoords(maxAgeMs = MAX_AGE_MS): DeviceCoords | null {
  const now = Date.now();
  if (memory && now - memory.at <= maxAgeMs) return memory;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DeviceCoords;
    if (
      typeof parsed?.lat === "number" &&
      typeof parsed?.lng === "number" &&
      typeof parsed?.at === "number" &&
      now - parsed.at <= maxAgeMs
    ) {
      memory = parsed;
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Read browser geolocation and cache. Returns null when denied or unavailable. */
export async function getDeviceCoords(opts?: {
  timeoutMs?: number;
  maximumAgeMs?: number;
  forceRefresh?: boolean;
}): Promise<DeviceCoords | null> {
  const timeoutMs = opts?.timeoutMs ?? 8000;
  const maximumAgeMs = opts?.maximumAgeMs ?? 60_000;
  if (!opts?.forceRefresh) {
    const cached = readCachedDeviceCoords(Math.max(maximumAgeMs, MAX_AGE_MS));
    if (cached) return cached;
  }
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: timeoutMs,
        maximumAge: maximumAgeMs,
      });
    });
    const coords: DeviceCoords = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      at: Date.now(),
    };
    saveDeviceCoords(coords);
    return coords;
  } catch {
    return null;
  }
}
