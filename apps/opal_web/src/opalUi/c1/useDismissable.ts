/**
 * Repair #19 BS-08 — the ONE dismissal + focus hook for the new
 * chrome surfaces (conversation rail, orbit sheet, conversation
 * overflow menu). Before this hook those surfaces closed only via
 * scrim click or their own buttons: no Escape, no initial focus,
 * no focus return — a keyboard user could open each of them and
 * dismiss none of them the standard way.
 *
 * Behavior, identical on every surface that uses it:
 *  - Escape (anywhere in the document while the surface is open)
 *    closes the surface.
 *  - On open, focus moves INTO the surface (its first focusable
 *    control), so keyboard and screen-reader users land where the
 *    surface is.
 *  - On close, focus RETURNS to the invoking control: the element
 *    passed as `triggerRef` when the caller owns it, else the
 *    element that held focus when the surface opened.
 *  - Optionally (`closeOnOutsidePointer`), a pointer-down outside
 *    both the surface and its trigger closes it — the overflow
 *    menu's dismissal. Pointer-downs on the trigger itself are
 *    left to the trigger's own toggle, never double-handled.
 *
 * The hook follows the codebase's existing Escape pattern
 * (document-level keydown listeners, e.g. ContactProfileSheet,
 * GraphDetailSheet) and extends it with the focus legs those
 * surfaces never had.
 */
import { useEffect, useRef, type RefObject } from "react";

export function useDismissableSurface<T extends HTMLElement>({
  open,
  onClose,
  closeOnOutsidePointer = false,
  triggerRef,
}: {
  open: boolean;
  onClose: () => void;
  closeOnOutsidePointer?: boolean;
  /** The invoking control, when the caller renders it. */
  triggerRef?: RefObject<HTMLElement | null>;
}): RefObject<T | null> {
  const surfaceRef = useRef<T | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const returnTarget =
      triggerRef?.current ??
      (document.activeElement instanceof HTMLElement ? document.activeElement : null);

    const surface = surfaceRef.current;
    const firstControl = surface?.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    (firstControl ?? surface)?.focus?.();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      }
    };
    document.addEventListener("keydown", onKey);

    let onPointer: ((e: PointerEvent) => void) | null = null;
    if (closeOnOutsidePointer) {
      onPointer = (e: PointerEvent) => {
        const target = e.target as Node | null;
        if (!target) return;
        if (surfaceRef.current?.contains(target)) return;
        if (triggerRef?.current?.contains(target)) return;
        onCloseRef.current();
      };
      document.addEventListener("pointerdown", onPointer);
    }

    return () => {
      document.removeEventListener("keydown", onKey);
      if (onPointer) document.removeEventListener("pointerdown", onPointer);
      if (returnTarget && document.contains(returnTarget)) returnTarget.focus?.();
    };
    // triggerRef is a stable ref object; closeOnOutsidePointer is a
    // per-surface constant. onClose flows through onCloseRef so a
    // re-rendered callback never re-runs (and re-focuses) the surface.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, closeOnOutsidePointer]);

  return surfaceRef;
}
