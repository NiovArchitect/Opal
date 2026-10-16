/**
 * Device location acquisition for Opal Center (Repair #12 F12-11a).
 *
 * Coarse, user-granted coords for venue ranking / near-me. This is a
 * different purpose from precise travel sharing (which needs a time-bounded
 * session and is gated server-side by the travel 422).
 *
 * - Permission is requested explicitly via requestDeviceLocationPermission().
 *   No per-send prompt: senders attach the last cached fix best-effort.
 * - Coords are coarse (3 decimals, ~100m) — the server re-coarsens anyway.
 * - Every failure mode returns null honestly; callers must handle null.
 */

import * as Location from "expo-location";

export interface DeviceCoords {
  lat: number;
  lon: number;
}

let cached: DeviceCoords | null = null;
let permissionAsked = false;

/**
 * Ask the user for foreground location permission. Call this from an
 * explicit UI surface (R3's prompt), never silently on launch.
 * Returns true when granted.
 */
export async function requestDeviceLocationPermission(): Promise<boolean> {
  permissionAsked = true;
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      cached = null;
      return false;
    }
    await refreshCachedFix();
    return true;
  } catch {
    cached = null;
    return false;
  }
}

/**
 * Refresh the cached fix. Best-effort; leaves the previous fix (or null)
 * in place on failure.
 */
export async function refreshCachedFix(): Promise<DeviceCoords | null> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") {
      cached = null;
      return null;
    }
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    cached = {
      lat: round3(pos.coords.latitude),
      lon: round3(pos.coords.longitude),
    };
    return cached;
  } catch {
    return cached;
  }
}

/**
 * The last known coarse fix, or null when permission was denied/unasked or
 * acquisition failed. Synchronous — safe to call on every send.
 */
export function getCachedCoords(): DeviceCoords | null {
  return cached;
}

/** True once the permission prompt has been shown (granted or denied). */
export function wasPermissionAsked(): boolean {
  return permissionAsked;
}

/** Clear the cached fix (e.g. on sign-out). */
export function clearCachedCoords(): void {
  cached = null;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
