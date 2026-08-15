/**
 * V2 Experience World shared visual primitives.
 *
 * Prevent presentation drift across Home / Chat / Shared Reality.
 * Design: Figma fy69K8cCug9prf5GLwQ7Hy nodes 2:2, 3:2, 4:2.
 * Content always comes from domain props — never hardcode Figma example people/venues.
 *
 * Not an enterprise component system. Smallest reusable shells only.
 */
import React from "react";
import { OpalMark } from "../brand/OpalLogo";
import { BRAND_ASSETS } from "../brand/brand";

/** Living Void base surface (#030406). */
export function V2VoidSurface({
  children,
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`v2-void-surface ${className ?? ""}`.trim()} {...rest}>
      {children}
    </div>
  );
}

/** Calm ambient field only — not neon, not permanent logo halo. */
export function V2AmbientField({ className }: { className?: string }) {
  return (
    <div
      className={`v2-ambient-field home-ambient-field ${className ?? ""}`.trim()}
      aria-hidden
    />
  );
}

/** Canonical product mark — founder orbital working raster (not clean circle). */
export function V2OpalMark({
  size = 26,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      className={`v2-opal-mark home-opal-mark opal-mark--current ${className ?? ""}`.trim()}
      src={BRAND_ASSETS.markCurrent}
      width={size}
      height={size}
      alt=""
      data-brand-source="founder-orbital-working"
      data-brand-final="false"
      draggable={false}
    />
  );
}

/** Brand row: mark + Opal word (UI type, not proprietary wordmark artwork). */
export function V2BrandRow({ className }: { className?: string }) {
  return (
    <header className={`home-brand-row ${className ?? ""}`.trim()} aria-label="Opal">
      <V2OpalMark size={26} />
      <span className="home-brand-word">Opal</span>
    </header>
  );
}

export type PresenceEnergy = "settled" | "possibility" | "group" | "recall" | "calm";

export function PresenceSurface({
  who,
  title,
  detail,
  energy = "calm",
  onClick,
  testId = "coming-up-card",
  composition,
  memberCount,
  conversationId,
}: {
  who: string;
  title: string;
  detail?: string;
  energy?: PresenceEnergy;
  onClick?: () => void;
  testId?: string;
  composition?: string;
  memberCount?: number;
  /** Stable conversation id for live proof / surface targeting */
  conversationId?: string | null;
}) {
  return (
    <button
      type="button"
      className={`presence-block energy-${energy}${composition === "group" ? " is-group" : ""}`}
      data-testid={testId}
      data-energy={energy}
      data-composition={composition || "dyad"}
      data-member-count={memberCount}
      data-conversation-id={conversationId || undefined}
      onClick={onClick}
    >
      <span className="presence-avatar" aria-hidden>
        {who.slice(0, 1)}
      </span>
      <span className="presence-copy">
        <span className="presence-who">{who}</span>
        <span className={`presence-title tone-${energy}`}>{title}</span>
        {detail ? <span className="presence-detail">{detail}</span> : null}
      </span>
    </button>
  );
}

export function AwakenSurface({
  title,
  meta,
  kicker = "CHOOSE",
  onClick,
  conversationId,
}: {
  title: string;
  meta?: string;
  kicker?: string;
  onClick?: () => void;
  /** Stable conversation id — Home/Chat/API/Phoenix topic must share this identity */
  conversationId?: string | null;
}) {
  return (
    <button
      type="button"
      className="home-awaken-card"
      data-testid="home-awaken"
      data-node-ref="2:7"
      data-conversation-id={conversationId || undefined}
      onClick={onClick}
    >
      <span className="home-awaken-bar" aria-hidden />
      <span className="home-awaken-kicker">{kicker}</span>
      <span className="home-awaken-title">{title}</span>
      {meta ? <span className="home-awaken-meta">{meta}</span> : null}
    </button>
  );
}

export function HumanBubbleIncoming({
  body,
  time,
}: {
  body: string;
  time?: string;
}) {
  return (
    <div className="bubble-row in">
      <div className="bubble in">
        <p>{body}</p>
        {time ? <time>{time}</time> : null}
      </div>
    </div>
  );
}

export function HumanBubbleOutgoing({
  body,
  time,
}: {
  body: string;
  time?: string;
}) {
  return (
    <div className="bubble-row out">
      <div className="bubble out">
        <p>{body}</p>
        {time ? <time>{time}</time> : null}
      </div>
    </div>
  );
}

export type FilamentMode = "awaken" | "transform";

export function OpalFilament({
  mode,
  label,
  time,
  signalKind,
}: {
  mode: FilamentMode;
  label: string;
  time?: string;
  signalKind?: string;
}) {
  const cls =
    mode === "transform"
      ? "opal-moment filament filament-transform is-shared signal-set"
      : "opal-moment filament filament-awaken is-shared signal-plan_forming";
  return (
    <div
      className={cls}
      role="status"
      data-testid="opal-moment"
      data-private="false"
      data-filament={mode}
      data-state={mode === "transform" ? "transform" : "awakening"}
      data-signal-kind={signalKind}
    >
      <span className="filament-bar" aria-hidden />
      <div className="filament-copy">
        <span className="opal-moment-label">{label}</span>
        {time ? <time>{time}</time> : null}
      </div>
    </div>
  );
}

export function PrivateOpalPlate({
  body,
  time,
}: {
  body: string;
  time?: string;
}) {
  return (
    <div
      className="private-opal-plate"
      role="status"
      data-testid="private-opal"
      data-private="true"
      data-node-ref="3:29"
    >
      <p className="private-opal-kicker">ONLY YOU</p>
      <p className="private-opal-body">{body}</p>
      {time ? <time className="private-opal-time">{time}</time> : null}
    </div>
  );
}

export type SharedRealityPlateProps = {
  /** Editorial headline e.g. "Dinner with Jordan" — domain truth */
  headline: string;
  /** Temporal kicker: TONIGHT / TOMORROW / TOGETHER / weekday */
  kicker?: string;
  /** e.g. "6:30 PM · Harbor Table" — one primary detail line */
  whenWhere?: string | null;
  /** Area only when known e.g. "Little Italy" */
  area?: string | null;
  /** Distance only when travel truth supports e.g. "18 min from you" */
  distance?: string | null;
  /** Leave-around only when origin+dest+start+ETA trusted */
  leaveAround?: string | null;
  /** Precomposed secondary line (area · distance · leave) — no time restatement */
  secondary?: string | null;
  className?: string;
  phase?: string;
};

/**
 * Signature Shared Reality object (Figma 4:2).
 * Reusable across Chat, Plans, Temporal — same plate, different context.
 * Omit empty semantic rows; never fabricate travel; never restate kicker facts.
 */
export function SharedRealityPlate({
  headline,
  kicker = "TOGETHER",
  whenWhere,
  area,
  distance,
  leaveAround,
  secondary,
  className,
  phase = "hold",
}: SharedRealityPlateProps) {
  const secondaryLine =
    secondary ||
    [area, distance, leaveAround].filter(Boolean).join(" · ") ||
    null;

  return (
    <div
      className={`opal-resolution shared-reality-plate sr-signature phase-${phase} ${className ?? ""}`.trim()}
      data-testid="opal-resolution"
      data-phase={phase}
      data-node-ref="4:2"
      role="status"
      aria-label={headline}
    >
      <div className="sr-atmosphere" aria-hidden />
      <div className="sr-plate">
        <p className="sr-kicker">{kicker}</p>
        <p className="sr-title">{headline}</p>
        {whenWhere ? <p className="sr-when-where">{whenWhere}</p> : null}
        {secondaryLine ? (
          <div className="sr-travel" data-testid="sr-travel">
            <p className="sr-travel-line">{secondaryLine}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Quiet dock labels — parent owns navigation. */
export function V2Dock({
  active,
  onSelect,
}: {
  active: "home" | "chats" | "plans" | "you" | "people";
  onSelect: (id: "home" | "chats" | "plans" | "you") => void;
}) {
  const items: { id: "home" | "chats" | "plans" | "you"; label: string }[] = [
    { id: "home", label: "Home" },
    { id: "chats", label: "People" },
    { id: "plans", label: "Plans" },
    { id: "you", label: "You" },
  ];
  return (
    <nav className="tabbar glass v2-dock" aria-label="Primary" data-testid="member-tabbar">
      {items.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`tab ${active === t.id || (t.id === "chats" && active === "people") ? "active" : ""}`}
          aria-current={active === t.id ? "page" : undefined}
          onClick={() => onSelect(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}

/**
 * Opening brand — full founder lockup (continuous orbital + OPAL wordmark).
 * Exact approved raster. No halo. No arcs/spike. No clean-circle. No CSS fake wordmark.
 */
export function OpeningBrandMark({ reduce }: { reduce?: boolean }) {
  void reduce;
  return (
    <div className="opening-brand-mark" data-testid="opening-brand-mark" aria-label="Opal">
      <img
        src={BRAND_ASSETS.lockupCurrent}
        alt="Opal"
        className="opening-brand-raster opening-brand-lockup"
        width={200}
        height={200}
        data-brand-role="full-lockup"
        data-brand-source="founder-approved-lockup-raster"
        data-brand-final="false"
        data-brand-product="valid"
        draggable={false}
      />
    </div>
  );
}

export { OpalMark };
