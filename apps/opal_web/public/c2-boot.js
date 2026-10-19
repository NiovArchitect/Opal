/*
 * Repair #18 - Division C2 - pre-paint mode boot (track-c2 section 2.7),
 * as amended by Repair #19 W21 (F7).
 *
 * Runs synchronously in <head> before any stylesheet-driven paint of
 * body content. It resolves the mode (persisted opal.c2.mode.v1 ->
 * legacy appearance key -> system preference) and stamps data-mode
 * plus the mode-correct ground color as an inline style on <html>,
 * so the launch path - launch, Splash 1, Splash 2, first member
 * surface - shares one ground and a white or light frame in Dark
 * is impossible. External file (not inline) because the page CSP
 * is script-src 'self'.
 *
 * W21 (F7): this stamping is UNCONDITIONAL. The C2 shell is the
 * only shell the build serves (App.tsx renders it unconditionally
 * since W15), so there is no second path whose appearance this
 * script could disturb. The previous shell-flag gate meant a build
 * produced without VITE_OPAL_SHELL=c2 served the C2 shell with NO
 * pre-paint mode stamp - always-light first paint regardless of
 * stored/system preference (the pack's F7 hazard).
 */
(function () {
  try {
    var pref = "system";
    try {
      pref = window.localStorage.getItem("opal.c2.mode.v1") || "system";
    } catch (e) {}
    if (pref !== "light" && pref !== "dark" && pref !== "system") pref = "system";
    var mode;
    if (pref === "light" || pref === "dark") {
      mode = pref;
    } else {
      var legacy = null;
      try {
        legacy = window.localStorage.getItem("opal.appearance.theme.v1");
      } catch (e) {}
      if (legacy === "light" || legacy === "dark") {
        mode = legacy;
      } else if (typeof window.matchMedia === "function") {
        mode = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      } else {
        mode = "dark";
      }
    }
    var root = document.documentElement;
    root.setAttribute("data-mode", mode);
    root.setAttribute("data-shell", "c2");
    root.style.colorScheme = mode;
    root.style.background = mode === "dark" ? "#0d0b12" : "#fffefb";
  } catch (e) {
    /* Boot must never break the page; c2Mode.ts re-resolves at runtime. */
  }
})();
