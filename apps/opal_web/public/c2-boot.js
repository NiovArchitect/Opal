/*
 * Repair #18 - Division C2 - pre-paint mode boot (track-c2 section 2.7).
 *
 * Runs synchronously in <head> before any stylesheet-driven paint of
 * body content. On the C2 shell path only, it resolves the mode
 * (persisted opal.c2.mode.v1 -> legacy appearance key -> system
 * preference) and stamps data-mode plus the mode-correct ground color
 * as an inline style on <html>, so the launch path - launch, Splash 1,
 * Splash 2, first member surface - shares one ground and a white or
 * light frame in Dark is impossible. External file (not inline)
 * because the page CSP is script-src 'self'.
 *
 * On the R17 fallback path (no shell=c2 anywhere) this script sets
 * nothing: the fallback keeps its own appearance behavior untouched.
 */
(function () {
  try {
    var shell = "";
    try {
      if (new URLSearchParams(window.location.search).get("shell") === "c2") shell = "c2";
    } catch (e) {}
    if (!shell) {
      try {
        if (window.localStorage.getItem("opal.c2.shell.v1") === "c2") shell = "c2";
      } catch (e) {}
    }
    if (shell === "c2") {
      try {
        window.localStorage.setItem("opal.c2.shell.v1", "c2");
      } catch (e) {}
    }
    if (shell !== "c2") return;

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
