/**
 * Paste W 2.2 — compact contact surface from thread header avatar.
 * Seed/live relationship + shared plans only; not the full GraphProfilePage.
 */
import React from "react";

export type ContactSharedPlan = {
  id: string;
  title: string;
  whenLabel?: string;
  state?: string;
};

type Props = {
  name: string;
  relationshipLabel?: string | null;
  phone?: string | null;
  sharedPlans?: ContactSharedPlan[];
  avatarSrc?: string | null;
  onClose: () => void;
  onOpenPlan?: (planId: string) => void;
  onMessage?: () => void;
};

export function ContactProfileSheet({
  name,
  relationshipLabel,
  phone,
  sharedPlans = [],
  avatarSrc,
  onClose,
  onOpenPlan,
  onMessage,
}: Props) {
  const initial = name.slice(0, 1).toUpperCase();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="contact-profile-sheet"
      data-testid="contact-profile-sheet"
      role="dialog"
      aria-modal="true"
      aria-label={`${name} contact`}
    >
      <button
        type="button"
        className="contact-profile-backdrop"
        aria-label="Close contact"
        data-testid="contact-profile-backdrop"
        onClick={onClose}
      />
      <div className="contact-profile-card">
        <header className="contact-profile-head">
          <button
            type="button"
            className="opal-nav-chevron"
            data-testid="contact-profile-back"
            aria-label="Back"
            onClick={onClose}
          >
            ‹
          </button>
          <h2 className="contact-profile-title" data-testid="contact-profile-name">
            {name}
          </h2>
        </header>

        <div className="contact-profile-hero">
          {avatarSrc ? (
            <img className="contact-profile-avatar" src={avatarSrc} alt="" width={72} height={72} />
          ) : (
            <span className="contact-profile-avatar contact-profile-avatar-fallback">{initial}</span>
          )}
          {relationshipLabel ? (
            <p className="contact-profile-rel" data-testid="contact-profile-relationship">
              {relationshipLabel}
            </p>
          ) : null}
          {phone ? (
            <p className="contact-profile-phone" data-testid="contact-profile-phone">
              {phone}
            </p>
          ) : null}
        </div>

        {onMessage ? (
          <button
            type="button"
            className="btn primary contact-profile-message"
            data-testid="contact-profile-message"
            onClick={onMessage}
          >
            Message
          </button>
        ) : null}

        <section className="contact-profile-plans" data-testid="contact-profile-plans">
          <h3 className="contact-profile-plans-kicker">Shared plans</h3>
          {sharedPlans.length ? (
            <ul>
              {sharedPlans.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="contact-profile-plan-row"
                    data-testid={`contact-profile-plan-${p.id}`}
                    data-plan-state={p.state || undefined}
                    onClick={() => onOpenPlan?.(p.id)}
                  >
                    <strong>{p.title}</strong>
                    {p.whenLabel ? <span>{p.whenLabel}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="gsh-meta" data-testid="contact-profile-plans-empty">
              No shared plans yet.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
