/**
 * Holy Shit first-run gate (Moments 1–5).
 * Default founder seed walk stays on Splash → Promise → Auth.
 * Enable: ?opal_holy_shit=1 (sticky for the tab session).
 */

const HOLY_SHIT_SESSION_KEY = "opal_holy_shit";

export function readHolyShitEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const u = new URL(window.location.href);
    if (u.searchParams.get("opal_holy_shit") === "1") {
      window.sessionStorage?.setItem(HOLY_SHIT_SESSION_KEY, "1");
      return true;
    }
    return window.sessionStorage?.getItem(HOLY_SHIT_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearHolyShitEnabled(): void {
  try {
    window.sessionStorage?.removeItem(HOLY_SHIT_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
