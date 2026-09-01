/**
 * PERSON PROFILE CURRENT 618:1257 (legacy 201:10).
 * Message / Call / Video / Plan for another person.
 * Distinct from You 618:1344 (settings hub).
 * Home-active dock. Brand V4 absolute geometry.
 */
import React from "react";

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
  onCall?: () => void;
  onVideo?: () => void;
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
  onCall,
  onVideo,
  onPlan,
  onBack,
  graphs = [],
  memories = [],
  onOpenGraph,
  onOpenMemory,
}: Props) {
  const initial = name.slice(0, 1).toUpperCase();
  const primaryGraph = graphs[0];

  return (
    <div
      className="gprof"
      data-testid="graph-profile-page"
      data-screen="person-profile"
      data-figma-node="618:1257"
      data-legacy-figma-node="201:10"
      data-figma-profile="618:1257"
      data-nav-active="home"
    >
      {/* Brand V4 ambient spectral depth  -  exact 618:1258 / 618:1259 */}
      <img
        className="gprof-ambient gprof-ambient-lived"
        src="/figma-v2/person/ambient-lived-memory.svg"
        alt=""
        aria-hidden
        data-figma-node="618:1258"
      />
      <img
        className="gprof-ambient gprof-ambient-future"
        src="/figma-v2/person/ambient-relationship-future.svg"
        alt=""
        aria-hidden
        data-figma-node="618:1259"
      />

      {onBack ? (
        <button
          type="button"
          className="gprof-back"
          data-testid="profile-person-back"
          aria-label="Back"
          onClick={onBack}
        >
          ‹
        </button>
      ) : null}

      <div className="gprof-hero">
        {avatarSrc ? (
          <img className="gprof-avatar" src={avatarSrc} alt="" width={94} height={94} />
        ) : (
          <span className="gprof-avatar gprof-avatar-fallback">{initial}</span>
        )}
        <h1 className="gprof-name">{name}</h1>
        <p className="gprof-conn">{connectionLabel}</p>
      </div>

      <div className="gprof-actions" role="group" aria-label="Person actions">
        <button
          type="button"
          className="gprof-action gprof-action-message"
          data-testid="gprof-message"
          disabled={!onMessage}
          onClick={onMessage}
        >
          <img className="gprof-action-icon" src="/figma-v2/person/icon-message.svg" alt="" width={18} height={18} aria-hidden />
          <span className="gprof-action-label">Message</span>
        </button>
        <button
          type="button"
          className="gprof-action gprof-action-call"
          data-testid="gprof-call"
          data-mode={onCall ? "active" : "conditional"}
          disabled={!onCall}
          title={onCall ? "Call" : "Call capability gated"}
          onClick={onCall}
        >
          <img className="gprof-action-icon" src="/figma-v2/person/icon-call.svg" alt="" width={18} height={18} aria-hidden />
          <span className="gprof-action-label">Call</span>
        </button>
        <button
          type="button"
          className="gprof-action gprof-action-video"
          data-testid="gprof-video"
          data-mode={onVideo ? "active" : "conditional"}
          disabled={!onVideo}
          title={onVideo ? "Video" : "Video capability gated"}
          onClick={onVideo}
        >
          <img className="gprof-action-icon" src="/figma-v2/person/icon-video.svg" alt="" width={18} height={18} aria-hidden />
          <span className="gprof-action-label">Video</span>
        </button>
        <button
          type="button"
          className="gprof-action gprof-action-plan"
          data-testid="gprof-plan"
          disabled={!onPlan}
          onClick={onPlan}
        >
          <img className="gprof-action-icon" src="/figma-v2/person/icon-plan.svg" alt="" width={18} height={18} aria-hidden />
          <span className="gprof-action-label">Plan</span>
        </button>
      </div>

      <section className="gprof-section gprof-section-graph" aria-label="Graph">
        <div className="gprof-section-head">
          <h2 className="gprof-section-title">Graph</h2>
          <p className="gprof-section-sub">What {name} is moving toward.</p>
        </div>
        {primaryGraph ? (
          <button
            type="button"
            className="gprof-graph-card"
            data-testid={`gprof-graph-${primaryGraph.id}`}
            onClick={() => onOpenGraph?.(primaryGraph.id)}
          >
            {primaryGraph.mediaSrc ? (
              <img src={primaryGraph.mediaSrc} alt="" />
            ) : (
              <span className="gprof-graph-media-ph" />
            )}
            <div className="gprof-graph-copy">
              <strong>{primaryGraph.title}</strong>
              {primaryGraph.when ? <span className="gprof-when">{primaryGraph.when}</span> : null}
              {primaryGraph.detail ? <span className="gprof-graph-ago">{primaryGraph.detail}</span> : null}
              <span className="gprof-chip">Close friends</span>
            </div>
          </button>
        ) : (
          <p className="gprof-empty">Nothing forming yet.</p>
        )}
      </section>

      <section className="gprof-section gprof-section-memories" aria-label="Memories">
        <div className="gprof-section-head">
          <h2 className="gprof-section-title">Memories</h2>
          <p className="gprof-section-sub">What became real.</p>
        </div>
      </section>
      <div className="gprof-mem-grid" data-testid="gprof-mem-grid">
        {memories.length === 0 ? (
          <p className="gprof-empty" style={{ left: 20, top: 586 }}>
            Nothing shared yet.
          </p>
        ) : (
          memories.slice(0, 6).map((m, i) => {
            // Exact 618:1257 tile geometry  -  row1 y586 / row2 y706; x 20/138/256
            const col = i % 3;
            const row = Math.floor(i / 3);
            const left = 20 + col * 118;
            const top = 586 + row * 120;
            return (
              <button
                key={m.id}
                type="button"
                className="gprof-mem"
                data-testid={`gprof-mem-${m.id}`}
                style={{ left, top }}
                onClick={() => onOpenMemory?.(m.id)}
              >
                {m.mediaSrc ? (
                  <img src={m.mediaSrc} alt="" style={{ objectFit: "cover", objectPosition: "center" }} />
                ) : (
                  <span className="gprof-mem-ph" />
                )}
                {m.when ? <span className="gprof-mem-meta">{m.when}</span> : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
