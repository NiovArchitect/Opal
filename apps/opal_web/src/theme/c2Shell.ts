/**
 * Repair #18 - Division C2 - shell flag (track-c2 section 3.1),
 * as amended by Repair #19 W15 (the deletion sweep).
 *
 * The C2 shell is the only shell this build serves. Recognized
 * sources for the C2 path, in order:
 *   1. Vite build env VITE_OPAL_SHELL=c2 (served build config)
 *   2. URL query ?shell=c2 (walk / QA override; also persists the
 *      device-local shell marker so later navigations keep the shell)
 *   3. Device-local marker opal.c2.shell.v1=c2 (set by source 2 or by
 *      public/c2-boot.js, which runs before first paint)
 * The flag is a build and serve choice, never a user setting
 * and never stored on the account. It now gates only the C2
 * pre-paint mode/icon setup in main.tsx; App.tsx renders C2Shell
 * unconditionally.
 *
 * RETIRED in R19 W15: the ?shell=r17 QA/walk override. It forced
 * the ENTIRE R17 legacy shell inside the served build - legacy
 * surviving by a side door. The drill-tested R17 fallback lives
 * at branch level (muse/repair-17, deliberately untouched, plus
 * its preview worktree); there is no in-app legacy flag anymore.
 * A ?shell=r17 query is now inert: it neither clears the C2
 * marker nor selects any other shell.
 */

import { C2_SHELL_STORAGE_KEY } from "./c2Mode";

declare const __OPAL_SHELL__: string | undefined;

export function buildShellFlag(): string {
  try {
    if (typeof __OPAL_SHELL__ !== "undefined") return __OPAL_SHELL__;
  } catch {
    /* not defined outside the C2 vite define */
  }
  try {
    const env = (import.meta as unknown as { env?: Record<string, string> }).env;
    if (env && typeof env.VITE_OPAL_SHELL === "string") return env.VITE_OPAL_SHELL;
  } catch {
    /* ignore */
  }
  return "";
}

export function isC2ShellEnabled(
  search: string = typeof window !== "undefined" ? window.location.search : "",
): boolean {
  if (buildShellFlag() === "c2") return true;
  try {
    const q = new URLSearchParams(search);
    if (q.get("shell") === "c2") {
      try {
        localStorage.setItem(C2_SHELL_STORAGE_KEY, "c2");
      } catch {
        /* ignore */
      }
      return true;
    }
  } catch {
    /* ignore */
  }
  try {
    return localStorage.getItem(C2_SHELL_STORAGE_KEY) === "c2";
  } catch {
    return false;
  }
}
