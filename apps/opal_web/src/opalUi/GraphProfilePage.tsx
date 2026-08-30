/**
 * PERSON PROFILE - dated 618:1257 (legacy 201:10).
 * Message / Call / Video / Plan for another person.
 * Distinct from You 618:1344 (settings hub).
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
    <div
      className="gprof scroll"
      data-testid="graph-profile-page"
      data-screen="person-profile"
      data-figma-node="618:1257"
      data-legacy-figma-node="201:10"
      data-figma-profile="618:1257"
    >
      <header className="gprof-top social-dest-brand">
        {onBack ? (
          <button
            type="button"
            className="opal-nav-chevron"
            data-testid="profile-person-back"
            aria-label="Back"
            onClick={onBack}
          >
            ‹
          </button>
        ) : null}
        <div className="gprof-brand gsh-brand">
          <OpalMark size="md" title="" />
          <OpalWordmark height={20} title="" compact />
        </div>
      </header>

      <div className="gprof-hero">
        {avatarSrc ? (
          <img className="gprof-avatar" src={avatarSrc} alt="" width={94} height={94} />
        ) : (
          <span className="gprof-avatar gprof-avatar-fallback">{initial}</span>
        )}
        <h1 className="gprof-name">{name}</h1>
        <p className="gprof-conn">{connectionLabel}</p>
        <p className="gprof-shared-lede" data-testid="gprof-shared-history-lens">
          You two have a life together - Graphs and Memories that became real.
        </p>
      </div>

      <div className="gprof-actions" role="group" aria-label="Person actions">
        {onMessage ? (
          <button type="button" className="btn primary" data-testid="gprof-message" onClick={onMessage}>
            Message
          </button>
        ) : null}
        <button
          type="button"
          className="btn ghost"
          data-testid="gprof-call"
          data-mode="conditional"
          disabled
          title="Call capability gated"
        >
          Call
        </button>
        <button
          type="button"
          className="btn ghost"
          data-testid="gprof-video"
          data-mode="conditional"
          disabled
          title="Video capability gated"
        >
          Video
        </button>
        {onPlan ? (
          <button type="button" className="btn" data-testid="gprof-plan" onClick={onPlan}>
            Plan
          </button>
        ) : null}
      </div>
      <p className="gprof-compound gsh-meta">
        Plan keeps WHO as {name}. Message uses the existing conversation relationship. Graphs and
        Memories below are permitted shared history only.
      </p>

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
