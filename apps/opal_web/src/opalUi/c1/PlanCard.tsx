/**
 * Repair #18 Division C1 - THE ONE PLAN CARD GRAMMAR (spec section 4).
 *
 * One component family, four sizes (row pill, thread card, strip card,
 * detail sheet), one projection. The same plan renders the same
 * data-plan-state, the same state treatment, and the same attendance
 * text on every surface - that identity is the F18-07 coherence
 * requirement made visual. No surface invents a variant.
 */
import React from "react";
import { TopLayer } from "../TopLayer";
import { ListenButton } from "./ListenButton";
import {
  STATE_META,
  attendanceLine,
  conflictLine,
  validatePlanProjection,
  viewerLine,
  whenLine,
  whereLine,
  type PlanProjection,
} from "./planProjection";

/** State pill: glyph + word, state treatment. Never color alone. */
export function PlanStatePill({ plan }: { plan: PlanProjection }) {
  const meta = STATE_META[plan.state];
  const label = plan.stateLabel || meta.label;
  return (
    <span
      className="c1-state-pill"
      data-testid="plan-state-pill"
      data-plan-state={plan.state}
      data-state-glyph={meta.glyph}
    >
      <span className="c1-state-glyph" aria-hidden="true">
        {plan.state === "happening" ? <span className="c1-live-dot" /> : meta.glyph}
      </span>
      <span className="c1-state-label">{label}</span>
    </span>
  );
}

export function FaceStack({ plan, size = 28 }: { plan: PlanProjection; size?: number }) {
  if (!plan.attendance || plan.attendance.faces.length === 0) return null;
  return (
    <span className="c1-faces" aria-hidden="true">
      {plan.attendance.faces.slice(0, 4).map((f, i) =>
        f.avatarUrl ? (
          <img
            key={i}
            className="c1-face"
            src={f.avatarUrl}
            alt=""
            width={size}
            height={size}
            style={{ width: size, height: size }}
          />
        ) : (
          <span
            key={i}
            className="c1-face c1-face-initials"
            style={{ width: size, height: size }}
          >
            {f.initials}
          </span>
        ),
      )}
    </span>
  );
}

/** Who row: faces + the one attendance text. Absent when attendance is null. */
export function AttendanceLine({ plan }: { plan: PlanProjection }) {
  const line = attendanceLine(plan);
  if (!line) return null;
  const viewer = viewerLine(plan);
  return (
    <div className="c1-who-row">
      <FaceStack plan={plan} />
      <span className="c1-attendance-text">{line}</span>
      {viewer ? <span className="c1-viewer-line">{viewer}</span> : null}
    </div>
  );
}

/** The honest fallback for an invalid/missing payload (spec 2.3). */
export function PlanFallback() {
  return (
    <div className="c1-plan-fallback" data-testid="plan-fallback" role="note">
      Plan details are not ready yet.
    </div>
  );
}

function CardBody({
  plan,
  size,
  onOpen,
}: {
  plan: PlanProjection;
  size: "thread" | "strip";
  onOpen?: (plan: PlanProjection) => void;
}) {
  const where = whereLine(plan);
  return (
    <>
      <div className="c1-plan-top">
        <PlanStatePill plan={plan} />
        {size === "strip" ? (
          <span className="c1-plan-chevron" aria-hidden="true">
            ›
          </span>
        ) : null}
      </div>
      <div className="c1-plan-title">{plan.title}</div>
      <div className="c1-plan-meta">
        <span aria-hidden="true">◷ </span>
        {whenLine(plan)}
      </div>
      {where ? (
        <div className="c1-plan-meta">
          <span aria-hidden="true">{plan.where.kind === "virtual" ? "▣ " : "⌖ "}</span>
          {where}
        </div>
      ) : null}
      <AttendanceLine plan={plan} />
      {size === "thread" ? (
        <div className="c1-plan-actions">
          {plan.primaryAction.kind !== "none" ? (
            <button
              type="button"
              className="c1-plan-primary"
              data-testid="plan-card-primary"
              onClick={() => onOpen?.(plan)}
            >
              {plan.primaryAction.label}
            </button>
          ) : null}
          {plan.primaryAction.kind !== "view" ? (
            <button type="button" className="c1-plan-quiet" onClick={() => onOpen?.(plan)}>
              View plan
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

/**
 * PlanCard - thread and strip sizes render as cards; the row-pill size
 * renders the inline pill + count used on people chat rows (spec 4.4).
 */
export function PlanCard({
  plan: raw,
  size = "thread",
  onOpen,
}: {
  plan: unknown;
  size?: "thread" | "strip" | "row";
  onOpen?: (plan: PlanProjection) => void;
}) {
  const plan = validatePlanProjection(raw);
  if (!plan) return <PlanFallback />;
  if (size === "row") {
    const line = attendanceLine(plan);
    return (
      <span className="c1-row-pill-line" data-testid="plan-card" data-plan-state={plan.state}>
        <PlanStatePill plan={plan} />
        {line ? <span className="c1-attendance-text">{line}</span> : null}
      </span>
    );
  }
  const inner = <CardBody plan={plan} size={size} onOpen={onOpen} />;
  // ST-I: the plan-card summary, read aloud exactly as displayed -
  // title, when line, where line (the same strings CardBody renders).
  const summaryText = [plan.title, whenLine(plan), whereLine(plan)]
    .filter((x): x is string => Boolean(x))
    .join(". ");
  const cls = `c1-plan-card c1-plan-card-${size}${plan.state === "past" ? " c1-plan-past" : ""}`;
  return size === "strip" ? (
    <button
      type="button"
      className={cls}
      data-testid="plan-card"
      data-plan-state={plan.state}
      data-plan-id={plan.id}
      onClick={() => onOpen?.(plan)}
    >
      {inner}
    </button>
  ) : (
    <article className={cls} data-testid="plan-card" data-plan-state={plan.state} data-plan-id={plan.id}>
      {inner}
      <ListenButton text={summaryText} />
    </article>
  );
}

/**
 * Plan detail sheet (spec 5.4). Mounts ONLY through TopLayer at the
 * sheet band; the thread underneath stays mounted, scroll intact.
 * One primary action per state; no action renders without a handler
 * (every-asset-benefits: a button performs its operation or is cut).
 */
export function PlanDetailSheet({
  plan: raw,
  onClose,
  onPrimary,
  mode,
}: {
  plan: unknown;
  onClose: () => void;
  onPrimary?: (plan: PlanProjection) => void;
  /** The sheet portals to <body>, outside the shell root: it carries
   *  the design scope itself so tokens resolve in the portal. */
  mode?: "light" | "dark";
}) {
  const plan = validatePlanProjection(raw);
  const resolvedMode =
    mode ??
    (typeof document !== "undefined"
      ? (document
          .querySelector('[data-design="r18"]')
          ?.getAttribute("data-mode") as "light" | "dark" | null) ?? "dark"
      : "dark");
  return (
    <TopLayer band="sheet">
      <div data-design="r18" data-mode={resolvedMode} className="c1-sheet-root">
      <div className="c1-sheet-scrim" data-testid="plan-detail-scrim" onClick={onClose} />
      <section
        className="c1-sheet"
        data-testid="plan-detail-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={plan ? plan.title : "Plan"}
      >
        <div className="c1-sheet-handle" aria-hidden="true" />
        {!plan ? (
          <PlanFallback />
        ) : (
          <>
            <div className="c1-plan-top">
              <PlanStatePill plan={plan} />
            </div>
            <h2 className="c1-sheet-title">{plan.title}</h2>
            <div className="c1-sheet-block">
              <div className="c1-sheet-line">{whenLine(plan)}</div>
              <div className="c1-sheet-line">{whereLine(plan, true)}</div>
            </div>
            {plan.attendance ? (
              <div className="c1-sheet-block">
                <div className="c1-sheet-block-head">{attendanceLine(plan)}</div>
                {(plan.participants ?? []).map((p) => (
                  <div key={p.name} className="c1-participant-row">
                    <span className="c1-face c1-face-initials">{p.face.initials}</span>
                    <span className="c1-participant-name">{p.name}</span>
                    <span className="c1-participant-response">{p.response}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {plan.proposal ? (
              <div className="c1-sheet-block" data-testid="plan-proposal-zone">
                <div className="c1-sheet-line">
                  {plan.proposal.proposerName} suggested {plan.proposal.newLabel}. It is{" "}
                  {plan.proposal.currentLabel} now.
                </div>
              </div>
            ) : null}
            {conflictLine(plan) ? (
              <div className="c1-conflict-line" data-testid="plan-conflict-line">
                {conflictLine(plan)} <span className="c1-plan-quiet">View both</span>
              </div>
            ) : null}
            {plan.state === "forming" ? (
              <div className="c1-sheet-block" data-testid="plan-gap-list">
                {plan.when.kind !== "canonical" ? (
                  <div className="c1-gap-row">
                    <span>Time not set yet.</span>
                    <span className="c1-gap-action">Pick a time</span>
                  </div>
                ) : null}
                {plan.where.kind === "unset" ? (
                  <div className="c1-gap-row">
                    <span>Place not set yet.</span>
                    <span className="c1-gap-action">Pick a place</span>
                  </div>
                ) : null}
              </div>
            ) : null}
            {plan.primaryAction.kind !== "none" ? (
              <button
                type="button"
                className="c1-sheet-primary"
                data-testid="plan-detail-primary"
                onClick={() => onPrimary?.(plan)}
              >
                {plan.primaryAction.label}
              </button>
            ) : null}
            <button type="button" className="c1-sheet-close" onClick={onClose}>
              Close
            </button>
          </>
        )}
      </section>
      </div>
    </TopLayer>
  );
}
