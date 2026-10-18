/**
 * Bridge so the shell imports adapter helpers from one place, plus
 * the fail-safe Google status read used by the YOU hub summary (a
 * failed read is "unknown", never a guessed Connected).
 */
import { getGoogleCalendarStatus } from "../../api/productClient";

export * from "./shellData";

export async function getGoogleCalendarStatusSafe(
  bearer?: string,
): Promise<boolean | null> {
  try {
    const status = await getGoogleCalendarStatus(bearer);
    return status.connected;
  } catch {
    return null;
  }
}
