/**
 * Founder Polish Wave (Cluster C, Amendment A1) - the ONE long-press
 * context-menu pattern for cards (Apple Photos pattern).
 *
 * Privacy actions live HERE, never as always-visible rows on cards
 * or sheets: long-press (or right-click / the keyboard context-menu
 * key) opens the menu; the same actions stay reachable without a
 * long-press through the card detail's overflow button, which opens
 * this same menu. Surfaces pass finished items; the menu derives
 * nothing.
 *
 * R20 F-3: the panel is a complete, bordered, finished CARD (full
 * border + surface + card shadow, floating above the scrim's
 * bottom edge, items as full tappable rows, Cancel divided from
 * the actions) carrying the invoking card's state accent - not
 * the borderless bottom sheet it shipped as in the polish wave.
 *
 * Behavior law:
 * - A press that becomes a scroll (pointer moves) never opens it.
 * - A long-press that opens the menu suppresses the click that
 *   follows it, so the card does not also open.
 * - Escape or a backdrop tap closes; focus lands on the first item
 *   and returns to the invoking element on close (the surface's
 *   overflow button keeps a native click path for keyboard users).
 */
import React, { useEffect, useRef } from "react";
import { PlanStatePillC2 } from "./PlanCardC2";

export type CardMenuItem = {
  id: string;
  label: string;
  testId?: string;
  onSelect: () => void;
};

export const LONG_PRESS_MS = 500;

export function useLongPress(onLongPress: () => void, enabled = true) {
  const timer = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  const clear = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    start.current = null;
  };

  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (!enabled) return;
      fired.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      timer.current = window.setTimeout(() => {
        fired.current = true;
        onLongPress();
      }, LONG_PRESS_MS);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!start.current) return;
      if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10) clear();
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onContextMenu: (e: React.MouseEvent) => {
      if (!enabled) return;
      e.preventDefault();
      clear();
      fired.current = true;
      onLongPress();
    },
    /** True (once) when the click that follows a long-press should
     *  be swallowed by the card's own click handler. */
    consumeClickSuppression: () => {
      const was = fired.current;
      fired.current = false;
      return was;
    },
  };
}

/**
 * Wrapper that gives any card region the long-press behavior:
 * spread it around a card and it opens the surface's context menu
 * on a held press or a context-menu request, swallowing the click
 * a held press would otherwise deliver to the card.
 */
export function LongPressRegion({
  onLongPress,
  enabled = true,
  className,
  testId,
  children,
}: {
  onLongPress: () => void;
  enabled?: boolean;
  className?: string;
  testId?: string;
  children: React.ReactNode;
}) {
  const lp = useLongPress(onLongPress, enabled);
  return (
    <div
      className={className}
      data-testid={testId}
      onPointerDown={lp.onPointerDown}
      onPointerMove={lp.onPointerMove}
      onPointerUp={lp.onPointerUp}
      onPointerLeave={lp.onPointerLeave}
      onPointerCancel={lp.onPointerCancel}
      onContextMenu={lp.onContextMenu}
      onClickCapture={(e) => {
        if (lp.consumeClickSuppression()) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      {children}
    </div>
  );
}

export function CardContextMenu({
  title,
  items,
  onClose,
  stateFamily,
  stateLabel,
}: {
  title?: string | null;
  items: CardMenuItem[];
  onClose: () => void;
  /**
   * R20 F-3: the invoking card's plan state, finished by the ONE
   * projection (the same stateFamily/stateLabel the card itself
   * renders). When present, the menu carries the state's accent -
   * the state rule across the panel's top edge and the state pill
   * beside the title (AR-03: glyph + label beside the hue, never
   * color alone) - so the menu reads as a finished card OF that
   * plan, in the Your Move card's grammar, not a hover sheet.
   * Absent = a plain finished card (no state claimed).
   */
  stateFamily?: string | null;
  stateLabel?: string | null;
}) {
  const firstRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const showState = Boolean(stateFamily && stateLabel);

  return (
    <div className="c2s-menu-scrim" data-testid="card-context-menu" onClick={onClose}>
      <div
        className="c2s-menu-panel"
        role="menu"
        aria-label={title ?? "Card options"}
        data-plan-state={showState ? stateFamily! : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {title || showState ? (
          <div className="c2s-menu-head">
            {title ? <p className="c2s-menu-title">{title}</p> : null}
            {showState ? (
              <PlanStatePillC2 stateFamily={stateFamily!} stateLabel={stateLabel!} />
            ) : null}
          </div>
        ) : null}
        {items.map((item, i) => (
          <button
            key={item.id}
            ref={i === 0 ? firstRef : undefined}
            type="button"
            role="menuitem"
            className="c2s-menu-item"
            data-testid={item.testId ?? `card-menu-${item.id}`}
            onClick={() => {
              onClose();
              item.onSelect();
            }}
          >
            {item.label}
          </button>
        ))}
        <div className="c2s-menu-divider" aria-hidden="true" />
        <button
          type="button"
          className="c2s-menu-item c2s-menu-cancel"
          data-testid="card-menu-cancel"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
