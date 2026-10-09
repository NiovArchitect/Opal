/**
 * PERSON PROFILE CURRENT 618:1257 (legacy 201:10).
 * Message / Call / Video / Plan for another person.
 * Distinct from You 618:1344 (settings hub).
 * Home-active dock. Brand V4 absolute geometry.
 */
import React, { useState } from "react";
import type { RelationshipTypeValue } from "../api/productClient";
import { BRAND } from "../brand/brand";
import {
  personNodeTemporal,
  type PersonOpenLoop,
  type PersonUpcomingPlan,
} from "./graphCalendaring";
import {
  RELATIONSHIP_TYPE_OPTIONS,
  relationshipTypeLabel,
} from "./relationshipTypes";

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
  /** RU-1 type when known - editable via onSetRelationshipType. */
  relationshipType?: RelationshipTypeValue | string | null;
  onSetRelationshipType?: (type: RelationshipTypeValue) => void | Promise<void>;
  phoneNumber?: string | null;
  onSavePhone?: (phone: string) => void | Promise<void>;
  avatarSrc?: string;
  onMessage?: () => void;
  onCall?: () => void;
  onVideo?: () => void;
  onPlan?: () => void;
  onBack?: () => void;
  graphs?: ProfileGraphItem[];
  memories?: ProfileMemoryItem[];
  /** Next shared plans (up to 3). Falls back to seed temporal context. */
  upcomingPlans?: PersonUpcomingPlan[];
  /** Next open loop with this person. */
  nextOpenLoop?: PersonOpenLoop | null;
  onOpenGraph?: (id: string) => void;
  onOpenMemory?: (id: string) => void;
  onOpenLoop?: (id: string) => void;
  savingMeta?: boolean;
};

export function GraphProfilePage({
  name,
  connectionLabel = "Direct connection",
  relationshipType = null,
  onSetRelationshipType,
  phoneNumber = null,
  onSavePhone,
  avatarSrc,
  onMessage,
  onCall,
  onVideo,
  onPlan,
  onBack,
  graphs = [],
  memories = [],
  upcomingPlans,
  nextOpenLoop,
  onOpenGraph,
  onOpenMemory,
  onOpenLoop,
  savingMeta = false,
}: Props) {
  const initial = name.slice(0, 1).toUpperCase();
  const primaryGraph = graphs[0];
  const [typeOpen, setTypeOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState(phoneNumber || "");

  const typeLabel = relationshipType
    ? relationshipTypeLabel(relationshipType)
    : connectionLabel || "Direct connection";

  const seedTemporal = personNodeTemporal(name);
  const plans: PersonUpcomingPlan[] = (() => {
    if (upcomingPlans && upcomingPlans.length) return upcomingPlans.slice(0, 3);
    const fromGraphs = graphs.map((g) => ({
      id: g.id,
      title: g.title,
      whenLabel: g.when || g.detail || "",
    }));
    const seen = new Set(fromGraphs.map((p) => p.id));
    const filled = [
      ...fromGraphs,
      ...seedTemporal.upcomingPlans.filter((p) => !seen.has(p.id)),
    ];
    return filled.slice(0, 3);
  })();
  const openLoop: PersonOpenLoop | null =
    nextOpenLoop !== undefined ? nextOpenLoop : seedTemporal.nextOpenLoop;

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
        {onSetRelationshipType ? (
          <button
            type="button"
            className="gprof-conn gprof-conn-edit"
            data-testid="gprof-relationship-type"
            aria-label={`How do you know ${name}?`}
            disabled={savingMeta}
            onClick={() => {
              setPhoneOpen(false);
              setTypeOpen((v) => !v);
            }}
          >
            {typeLabel}
            <span className="gprof-conn-chevron" aria-hidden>
              ▾
            </span>
          </button>
        ) : (
          <p className="gprof-conn">{typeLabel}</p>
        )}
      </div>

      {typeOpen && onSetRelationshipType ? (
        <div
          className="gprof-type-picker"
          role="dialog"
          aria-label={`How do you know ${name}?`}
          data-testid="gprof-type-picker"
        >
          <p className="gprof-type-prompt">How do you know {name}?</p>
          <div className="gprof-type-options">
            {RELATIONSHIP_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`gprof-type-option${
                  relationshipType === opt.value ? " is-selected" : ""
                }`}
                data-testid={`gprof-type-option-${opt.value}`}
                disabled={savingMeta}
                onClick={() => {
                  void Promise.resolve(onSetRelationshipType(opt.value)).then(() =>
                    setTypeOpen(false),
                  );
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="gprof-type-cancel"
            data-testid="gprof-type-cancel"
            disabled={savingMeta}
            onClick={() => setTypeOpen(false)}
          >
            Cancel
          </button>
        </div>
      ) : null}

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

      {onSavePhone ? (
        <div className="gprof-phone" data-testid="gprof-phone-row">
          {phoneOpen ? (
            <form
              className="gprof-phone-form"
              data-testid="gprof-phone-form"
              onSubmit={(e) => {
                e.preventDefault();
                const next = phoneDraft.trim();
                if (!next || savingMeta) return;
                void Promise.resolve(onSavePhone(next)).then(() => setPhoneOpen(false));
              }}
            >
              <input
                className="gprof-phone-input"
                data-testid="gprof-phone-input"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="Phone number"
                value={phoneDraft}
                disabled={savingMeta}
                onChange={(e) => setPhoneDraft(e.target.value)}
                aria-label={`Phone number for ${name}`}
              />
              <button
                type="submit"
                className="gprof-phone-save"
                data-testid="gprof-phone-save"
                disabled={savingMeta || !phoneDraft.trim()}
                style={{ color: BRAND.palette.opalCyan }}
              >
                Save
              </button>
              <button
                type="button"
                className="gprof-phone-cancel"
                data-testid="gprof-phone-cancel"
                disabled={savingMeta}
                onClick={() => {
                  setPhoneDraft(phoneNumber || "");
                  setPhoneOpen(false);
                }}
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="gprof-phone-add"
              data-testid="gprof-phone-add"
              disabled={savingMeta}
              onClick={() => {
                setTypeOpen(false);
                setPhoneDraft(phoneNumber || "");
                setPhoneOpen(true);
              }}
            >
              {phoneNumber ? phoneNumber : "Add number"}
            </button>
          )}
        </div>
      ) : null}

      <section
        className={`gprof-section gprof-section-graph${plans.length || openLoop ? " has-temporal" : ""}`}
        aria-label="Graph"
        data-testid="gprof-graph-section"
      >
        <div className="gprof-section-head">
          <h2 className="gprof-section-title">Graph</h2>
          <p className="gprof-section-sub">What {name} is moving toward.</p>
        </div>
        {plans.length || openLoop ? (
          <div className="gprof-temporal" data-testid="gprof-temporal">
            <p className="gprof-temporal-kicker">Coming up</p>
            <ul className="gprof-upcoming" data-testid="gprof-upcoming-plans">
              {plans.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="gprof-upcoming-row"
                    data-testid={
                      primaryGraph && p.id === primaryGraph.id
                        ? `gprof-graph-${p.id}`
                        : `gprof-upcoming-${p.id}`
                    }
                    onClick={() => onOpenGraph?.(p.id)}
                  >
                    <strong>{p.title}</strong>
                    {p.whenLabel ? <span>{p.whenLabel}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
            {openLoop ? (
              <button
                type="button"
                className="gprof-open-loop"
                data-testid="gprof-open-loop"
                onClick={() =>
                  onOpenLoop
                    ? onOpenLoop(openLoop.id)
                    : onOpenGraph?.(plans[0]?.id || openLoop.id)
                }
              >
                <span className="gprof-open-loop-kicker">Open loop</span>
                <span>{openLoop.label}</span>
              </button>
            ) : null}
          </div>
        ) : null}
        {/* Tall media card only when no temporal list (avoids overlap with memories). */}
        {primaryGraph && !plans.length ? (
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
        ) : !plans.length && !openLoop ? (
          <p className="gprof-empty">Nothing forming yet.</p>
        ) : null}
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
