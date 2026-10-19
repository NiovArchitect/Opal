/**
 * Bridge so the shell imports adapter helpers from one place, plus
 * the fail-safe Google status read used by the YOU hub summary (a
 * failed read is "unknown", never a guessed Connected).
 */
import { getGoogleCalendarStatus } from "../../api/productClient";

export * from "./shellData";

export async function getGoogleCalendarStatusSafe(
  bearer?: string,
): Promise<boolean | "simulated" | null> {
  try {
    const status = await getGoogleCalendarStatus(bearer);
    // HA-01: a simulated row also reports connected=true on the wire;
    // its provenance wins — the hub must never summarize it as connected.
    if (status.simulated === true || status.status === "connected_simulated") {
      return "simulated";
    }
    return status.connected;
  } catch {
    return null;
  }
}
