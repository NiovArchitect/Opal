/**
 * OPAL POSSIBILITY — internal primitive (not public terminology).
 *
 * A possibility Opal surfaced. Not a form button. Not a calendar slot.
 * Touch target ≥44px; visible material is spectral contour + luminous text.
 */
import React from "react";

export type PossibilityPhase =
  | "rest"
  | "reveal"
  | "pressed"
  | "chosen"
  | "receding";

type Props = {
  label: string;
  onSelect: () => void;
  phase?: PossibilityPhase;
  /** Stagger index for reveal separation */
  index?: number;
  disabled?: boolean;
};

export function OpalPossibility({
  label,
  onSelect,
  phase = "rest",
  index = 0,
  disabled,
}: Props) {
  const phaseClass =
    phase === "rest" || phase === "reveal"
      ? phase === "reveal"
        ? " is-reveal"
        : ""
      : ` is-${phase}`;

  return (
    <button
      type="button"
      className={`opal-possibility${phaseClass}`}
      data-testid="opal-possibility"
      data-phase={phase}
      style={
        phase === "reveal"
          ? ({ ["--opal-stagger" as string]: `${index * 70}ms` } as React.CSSProperties)
          : undefined
      }
      aria-label={label}
      aria-pressed={phase === "chosen"}
      disabled={disabled || phase === "receding"}
      onPointerDown={(e) => {
        if (disabled || phase === "receding" || phase === "chosen") return;
        e.currentTarget.classList.add("is-pressed");
      }}
      onPointerUp={(e) => {
        e.currentTarget.classList.remove("is-pressed");
      }}
      onPointerLeave={(e) => {
        e.currentTarget.classList.remove("is-pressed");
      }}
      onClick={() => {
        if (disabled || phase === "receding") return;
        onSelect();
      }}
    >
      <span className="opal-possibility-contour" aria-hidden />
      <span className="opal-possibility-field" aria-hidden />
      <span className="opal-possibility-label">{label}</span>
    </button>
  );
}
