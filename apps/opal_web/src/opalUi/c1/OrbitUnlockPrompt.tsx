/**
 * Repair #19 BS-02 — the ORBIT UNLOCK PROMPT. The passcode prompt a
 * locked private orbit opens instead of revealing itself.
 *
 * Same component discipline and same truth as the Graphs Private
 * unlock (C2Graphs): the code is handed to the server verify call
 * and dropped — never stored, never checked client-side. When the
 * account has NO passcode set, there is nothing to verify against:
 * the prompt says so plainly and offers to set one (the Graphs
 * area's own set path) instead of "unlocking" against nothing.
 *
 * Outcomes:
 *  - verify succeeds  -> onUnlocked (the host adds the orbit to its
 *    unlocked set; only then may the orbit reveal anything).
 *  - verify fails     -> the orbit stays locked; one honest line:
 *    "That code did not open it."
 *  - no passcode set -> set-one form; a successful set unlocks
 *    (setting the code IS the authentication act, exactly as in
 *    the Graphs Private area).
 */
import React, { useState } from "react";
import { TopLayer } from "../TopLayer";
import { useDismissableSurface } from "./useDismissable";
import "./OrbitUnlockPrompt.css";

export function OrbitUnlockPrompt({
  orbitLabel,
  passcodeSet,
  onVerify,
  onSetPasscode,
  onUnlocked,
  onClose,
}: {
  orbitLabel: string;
  /** null = not yet known; the prompt then verifies (server truth). */
  passcodeSet: boolean | null;
  onVerify: (code: string) => Promise<boolean>;
  onSetPasscode: (code: string) => Promise<boolean>;
  onUnlocked: () => void;
  onClose: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const panelRef = useDismissableSurface<HTMLDivElement>({ open: true, onClose });
  const setting = passcodeSet === false;

  const submit = async () => {
    const trimmed = code.trim();
    if (busy || !trimmed) return;
    setBusy(true);
    setError(null);
    const ok = setting ? await onSetPasscode(trimmed) : await onVerify(trimmed);
    setBusy(false);
    setCode("");
    if (ok) {
      onUnlocked();
    } else {
      setError(
        setting
          ? "That passcode could not be set. Use at least 4 characters."
          : "That code did not open it.",
      );
    }
  };

  return (
    <TopLayer band="modal">
      {/* W25 (FA-02): the prompt's classes are its OWN (OrbitUnlockPrompt.css,
          unscoped) — it is portaled to body level by TopLayer, outside the
          [data-design="r18"] wrappers the c1-rail-* rules are scoped to, so
          those rules never matched it and it rendered static/under the rail. */}
      <div className="c1-orbit-unlock-scrim" data-testid="orbit-unlock-prompt" onClick={onClose}>
        <div
          ref={panelRef}
          className="c1-orbit-unlock-panel"
          role="dialog"
          aria-modal="true"
          aria-label={`Unlock ${orbitLabel}`}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="c1-display" style={{ fontSize: 20 }}>
            {orbitLabel} - Opal chats hidden
          </p>
          <p className="c1-sublabel">
            {setting
              ? "No passcode is set yet. Set one to open these Opal chats - it is checked by Opal's server, and the code itself is never stored."
              : "Enter your passcode to open the Opal chats in this orbit. It is the same passcode as My private graphs."}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <input
              className="c1-search"
              type="password"
              data-testid="orbit-unlock-code"
              aria-label="Orbit passcode"
              autoComplete="off"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            {error ? (
              <p className="c1-sublabel" role="alert" data-testid="orbit-unlock-error">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              className="c1-primary-btn"
              data-testid="orbit-unlock-submit"
              disabled={busy || !code.trim()}
            >
              {setting ? "Set passcode and open" : "Open this orbit"}
            </button>
            <button type="button" className="c1-orbit-open-sheet" onClick={onClose}>
              Not now
            </button>
          </form>
        </div>
      </div>
    </TopLayer>
  );
}
