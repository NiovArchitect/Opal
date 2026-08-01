/**
 * Accessibility gate helpers for SF12 release readiness.
 */

export const MIN_TOUCH_TARGET = 44;

export type A11yCheck = {
  id: string;
  pass: boolean;
  detail: string;
};

export function checkTouchTarget(width: number, height: number): A11yCheck {
  const pass = width >= MIN_TOUCH_TARGET && height >= MIN_TOUCH_TARGET;
  return {
    id: "touch_target",
    pass,
    detail: pass
      ? `Target ${width}x${height} meets ${MIN_TOUCH_TARGET}px`
      : `Target ${width}x${height} below ${MIN_TOUCH_TARGET}px`,
  };
}

export function checkContrastPair(
  foreground: "light" | "dark" | "muted",
  background: "dark_shell" | "light_card",
): A11yCheck {
  // Shell uses light text on dark shell or dark text on light cards — known good pairs.
  const ok =
    (background === "dark_shell" && (foreground === "light" || foreground === "muted")) ||
    (background === "light_card" && foreground === "dark");
  return {
    id: "contrast",
    pass: ok,
    detail: ok ? "Approved shell contrast pair" : "Disallowed contrast pair",
  };
}

export function checkLabel(label: string | null | undefined): A11yCheck {
  const pass = typeof label === "string" && label.trim().length > 0;
  return {
    id: "accessible_label",
    pass,
    detail: pass ? "Label present" : "Missing accessibility label",
  };
}

export function checkReducedMotionCopy(prefersReducedMotion: boolean, usesSpinningOnly: boolean): A11yCheck {
  const pass = !(prefersReducedMotion && usesSpinningOnly);
  return {
    id: "reduced_motion",
    pass,
    detail: pass
      ? "Loading state has non-motion alternative"
      : "Spinner-only loading with reduced motion",
  };
}

export function runAccessibilityGate(checks: A11yCheck[]): {
  pass: boolean;
  failures: A11yCheck[];
} {
  const failures = checks.filter((c) => !c.pass);
  return { pass: failures.length === 0, failures };
}
