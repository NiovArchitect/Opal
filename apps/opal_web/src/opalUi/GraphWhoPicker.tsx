/**
 * FINAL WHO — Figma 201:6 people picker presentation.
 * Preserves WHO-FAST-PATH / dyad / group intelligence via props.
 */
import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { OpalMark, OpalWordmark } from "../brand/OpalLogo";

const EASE = [0.16, 1, 0.3, 1] as const;

export type WhoPerson = {
  id: string;
  name: string;
  initial?: string;
  avatarSrc?: string;
};

type Props = {
  people: WhoPerson[];
  selectedIds: string[];
  together: boolean;
  onToggle: (id: string) => void;
  onTogetherChange: (together: boolean) => void;
  onContinue: () => void;
  onClose?: () => void;
  title?: string;
  body?: string;
  mode?: "pick" | "add";
  showSolo?: boolean;
  onSolo?: () => void;
};

export function GraphWhoPicker({
  people,
  selectedIds,
  together,
  onToggle,
  onTogetherChange,
  onContinue,
  onClose,
  title = "Who with?",
  body = "Keep it private or bring people together.",
  mode = "pick",
  showSolo,
  onSolo,
}: Props) {
  const reduce = !!useReducedMotion();
  const selected = new Set(selectedIds);

  return (
    <div
      className="gwho"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gwho-title"
      data-testid="graph-who-picker"
      data-figma-who="201:6"
      data-mode={mode}
    >
      <header className="gwho-top">
        <div className="gwho-brand">
          <OpalMark size="sm" title="" />
          <OpalWordmark height={18} title="" compact />
        </div>
        {onClose ? (
          <button type="button" className="btn ghost" onClick={onClose} aria-label="Close">
            Close
          </button>
        ) : null}
      </header>

      <motion.h2
        id="gwho-title"
        className="gwho-title"
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduce ? { duration: 0 } : { duration: 0.35, ease: EASE }}
      >
        {title}
      </motion.h2>
      <p className="gwho-body">{body}</p>

      <div className="gwho-grid" role="group" aria-label="People">
        {people.map((p, i) => {
          const isOn = selected.has(p.id);
          const initial = p.initial || p.name.slice(0, 1).toUpperCase();
          return (
            <motion.button
              key={p.id}
              type="button"
              className={`gwho-cell ${isOn ? "is-selected" : ""}`}
              aria-pressed={isOn}
              data-testid={`gwho-person-${p.id}`}
              onClick={() => onToggle(p.id)}
              initial={reduce ? false : { opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={
                reduce ? { duration: 0 } : { delay: 0.04 * i, duration: 0.3, ease: EASE }
              }
            >
              <span className="gwho-avatar-wrap">
                {p.avatarSrc ? (
                  <img className="gwho-avatar" src={p.avatarSrc} alt="" width={78} height={78} />
                ) : (
                  <span className="gwho-avatar gwho-avatar-fallback">{initial}</span>
                )}
                {isOn ? (
                  <span className="gwho-check" aria-hidden>
                    ✓
                  </span>
                ) : null}
              </span>
              <span className="gwho-name">{p.name}</span>
            </motion.button>
          );
        })}
      </div>

      <motion.div
        className="gwho-segment"
        role="group"
        aria-label="How to send"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={reduce ? { duration: 0 } : { delay: 0.35, duration: 0.3 }}
      >
        <button
          type="button"
          className={`gwho-seg-btn ${!together ? "is-active" : ""}`}
          aria-pressed={!together}
          onClick={() => onTogetherChange(false)}
        >
          Send separately
        </button>
        <button
          type="button"
          className={`gwho-seg-btn ${together ? "is-active" : ""}`}
          aria-pressed={together}
          onClick={() => onTogetherChange(true)}
        >
          Together
        </button>
      </motion.div>

      {showSolo && onSolo ? (
        <button type="button" className="btn ghost gwho-solo" onClick={onSolo} data-testid="gwho-solo">
          Solo
        </button>
      ) : null}

      <motion.button
        type="button"
        className="btn primary gwho-continue"
        data-testid="gwho-continue"
        disabled={selectedIds.length === 0 && !showSolo}
        onClick={onContinue}
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduce ? { duration: 0 } : { delay: 0.45, duration: 0.3 }}
      >
        Continue
      </motion.button>
    </div>
  );
}
