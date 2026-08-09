/**
 * Thread-native free-field insight — not a panel/module/card.
 * Conversation remains primary; Opal opens slightly, then closes.
 */
import React, { useEffect, useState } from "react";
import {
  OpalPossibility,
  type PossibilityPhase,
} from "./OpalPossibility";

export type InsightOption = {
  id: string;
  label: string;
};

type Props = {
  /** e.g. "A couple times could work" / "Thursday could work" */
  insight: string;
  options: InsightOption[];
  groupLine?: string | null;
  onChoose: (option: InsightOption) => void;
  /** Single strong discovery — not a one-item list */
  discovery?: boolean;
  ambient?: boolean;
};

export function OpalInsightField({
  insight,
  options,
  groupLine,
  onChoose,
  discovery,
  ambient = true,
}: Props) {
  const [phases, setPhases] = useState<Record<string, PossibilityPhase>>(() =>
    Object.fromEntries(options.map((o) => [o.id, "reveal" as PossibilityPhase])),
  );
  const [resolved, setResolved] = useState(false);
  const [settling, setSettling] = useState(false);

  useEffect(() => {
    // After reveal stagger, settle to rest.
    const t = window.setTimeout(() => {
      setPhases((prev) => {
        const next = { ...prev };
        for (const id of Object.keys(next)) {
          if (next[id] === "reveal") next[id] = "rest";
        }
        return next;
      });
    }, 80 + options.length * 70 + 420);
    return () => window.clearTimeout(t);
  }, [options.length]);

  function choose(opt: InsightOption) {
    if (resolved || settling) return;
    setSettling(true);
    setPhases((prev) => {
      const next: Record<string, PossibilityPhase> = {};
      for (const o of options) {
        next[o.id] = o.id === opt.id ? "chosen" : "receding";
      }
      return next;
    });
    // Physical consequence, then hand off to human draft.
    window.setTimeout(() => {
      setResolved(true);
      onChoose(opt);
    }, 420);
  }

  const multi = options.length >= 2 && !discovery;

  return (
    <div
      className={`opal-insight-field${ambient ? " has-ambient" : ""}${
        settling ? " is-converging" : ""
      }${resolved ? " is-resolved" : ""}${discovery ? " is-discovery" : ""}`}
      data-testid="opal-insight-field"
      data-multi={multi ? "true" : "false"}
      role="group"
      aria-label={insight}
    >
      <div className="opal-insight-ambient" aria-hidden />
      <div className="opal-insight-header">
        <span className="opal-moment-mark" aria-hidden>
          ◈
        </span>
        <span className="opal-insight-phrase">{insight}</span>
      </div>
      {groupLine ? (
        <span className="opal-group-share-count">{groupLine}</span>
      ) : null}
      <div
        className={`opal-possibility-cluster${multi ? " is-multi" : " is-single"}`}
        data-testid="opal-possibility-cluster"
      >
        {options.map((o, i) => (
          <OpalPossibility
            key={o.id}
            label={o.label}
            index={i}
            phase={phases[o.id] ?? "rest"}
            disabled={settling || resolved}
            onSelect={() => choose(o)}
          />
        ))}
      </div>
    </div>
  );
}
