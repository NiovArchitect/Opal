/**
 * FINAL PROFILE — Figma 201:10 Graph + Memories social page.
 * Distinct from conversation 201:7.
 */
import React from "react";
import { OpalMark, OpalWordmark } from "../brand/OpalLogo";

export type ProfileGraphItem = {
  id: string;
  title: string;
  detail: string;
  mediaSrc?: string;
  when?: string;
};

export type ProfileMemoryItem = {
  id: string;
  title: string;
  when: string;
  mediaSrc?: string;
};

type Props = {
  name: string;
  connectionLabel?: string;
  avatarSrc?: string;
  onMessage?: () => void;
  onPlan?: () => void;
  onBack?: () => void;
  graphs?: ProfileGraphItem[];
  memories?: ProfileMemoryItem[];
  onOpenGraph?: (id: string) => void;
  onOpenMemory?: (id: string) => void;
};

export function GraphProfilePage({
  name,
  connectionLabel = "Direct connection",
  avatarSrc,
  onMessage,
  onPlan,
  onBack,
  graphs = [],
  memories = [],
  onOpenGraph,
  onOpenMemory,
}: Props) {
  const initial = name.slice(0, 1).toUpperCase();
  return (
    <div className="gprof scroll" data-testid="graph-profile-page" data-figma-profile="201:10">
      <header className="gprof-top">
        <div className="gprof-brand">
          <OpalMark size="sm" title="" />
          <OpalWordmark height={18} title="" compact />
        </div>
        {onBack ? (
          <button type="button" className="btn ghost" onClick={onBack}>
            Back
          </button>
        ) : null}
      </header>

      <div className="gprof-hero">
        {avatarSrc ? (
          <img className="gprof-avatar" src={avatarSrc} alt="" width={94} height={94} />
        ) : (
          <span className="gprof-avatar gprof-avatar-fallback">{initial}</span>
        )}
        <h1 className="gprof-name">{name}</h1>
        <p className="gprof-conn">{connectionLabel}</p>
      </div>

      <div className="gprof-actions">
        {onMessage ? (
          <button type="button" className="btn primary" data-testid="gprof-message" onClick={onMessage}>
            Message
          </button>
        ) : null}
        {onPlan ? (
          <button type="button" className="btn" data-testid="gprof-plan" onClick={onPlan}>
            Plan
          </button>
        ) : null}
      </div>

      <section className="gprof-section" aria-label="Graph">
        <h2 className="gprof-section-title">Graph</h2>
        {graphs.length === 0 ? (
          <p className="gprof-empty">Nothing forming yet.</p>
        ) : (
          graphs.map((g) => (
            <button
              key={g.id}
              type="button"
              className="gprof-graph-card"
              data-testid={`gprof-graph-${g.id}`}
              onClick={() => onOpenGraph?.(g.id)}
            >
              {g.mediaSrc ? <img src={g.mediaSrc} alt="" /> : null}
              <div>
                <strong>{g.title}</strong>
                <p>{g.detail}</p>
                {g.when ? <span className="gprof-when">{g.when}</span> : null}
              </div>
            </button>
          ))
        )}
      </section>

      <section className="gprof-section" aria-label="Memories">
        <h2 className="gprof-section-title">Memories</h2>
        <div className="gprof-mem-grid">
          {memories.map((m) => (
            <button
              key={m.id}
              type="button"
              className="gprof-mem"
              data-testid={`gprof-mem-${m.id}`}
              onClick={() => onOpenMemory?.(m.id)}
            >
              {m.mediaSrc ? <img src={m.mediaSrc} alt="" /> : <span className="gprof-mem-ph" />}
              <span className="gprof-mem-meta">{m.when}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
