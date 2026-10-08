/**
 * Holy Shit / Meet Opal first-run gate (Moments 1–5).
 * Enable: ?opal_holy_shit=1 OR ?opal_founder_seed=1 (sticky for the tab session).
 * After phone verify, Meet Opal asks Who's someone… (does not disappear).
 *
 * Product law (Paste G D6): first-run terminates at Moment 5 (Trust).
 * Moments 6 / 9 / 10 (post-trust follow-through) are not shipped — there is
 * no CTA that promises them. Later pastes may add them; do not invent UI
 * that claims they already run.
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
    // Founder seed walks also get the Meet Opal contact choreography after phone.
    if (u.searchParams.get("opal_founder_seed") === "1") {
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
