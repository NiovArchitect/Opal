/**
 * Repair #18 - Division C2 - shell flag (track-c2 section 3.1).
 *
 * The C2 shell renders only when the build flag shell=c2 is present in
 * the served build config. Absence renders the R17 shell exactly as
 * today. The flag is a build and serve choice, never a user setting
 * and never stored on the account. Recognized sources, in order:
 *   1. Vite build env VITE_OPAL_SHELL=c2 (served build config)
 *   2. URL query ?shell=c2 (walk / QA override; also persists the
 *      device-local shell marker so later navigations keep the shell)
 *   3. Device-local marker opal.c2.shell.v1=c2 (set by source 2 or by
 *      public/c2-boot.js, which runs before first paint)
 * The R17 fallback build never sets any of these.
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
    if (q.get("shell") === "r17") {
      try {
        localStorage.removeItem(C2_SHELL_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      return false;
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
