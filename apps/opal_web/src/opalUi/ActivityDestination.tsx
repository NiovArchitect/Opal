/**
 * ATTENTION CENTER — Opal Signal destination (A6.1)
 *
 * Projection of AttentionAuthority via GET /api/v1/product/attention.
 * Domain sections: needs_you · waiting · updated.
 * Human presentation: For you · Waiting · Updated (light labels; rows carry meaning).
 * Badge = actionable needs_you only.
 *
 * Intelligence surfaces (reminders / mediation / briefing) compose into For you —
 * do not invent a parallel Attention product.
 */
import React from "react";
import type { SignalSemanticState } from "../theme/signalGrammar";
import {
  fetchAttention,
  type AttentionCenterFeed,
  type AttentionCenterItem,
} from "../api/productClient";
import { ReminderCard } from "./intelligence/ReminderCard";
import {
  isReminderSourceType,
  projectReminder,
  type ReminderProjection,
} from "./intelligence/reminderLifecycle";

type Props = {
  onBack: () => void;
  onOpenGraph?: () => void;
  onOpenConversation?: (conversationId: string) => void;
  onOpenPlan?: (planId: string) => void;
  /** Open the exact canonical action Opal interrupted for — not a generic thread dump. */
  onOpenAttentionItem?: (item: AttentionCenterItem) => void;
  bearer?: string;
  /** Optional preloaded feed (tests / parent cache). */
  initialFeed?: AttentionCenterFeed | null;
  onFeedChange?: (feed: AttentionCenterFeed) => void;
  /** Demo / screenshot: inject reminder projections when feed lacks enrichment. */
  reminderSeed?: ReminderProjection[] | null;
  /** Extra intelligence cards rendered at top of For you (mediation / briefing). */
  forYouExtras?: React.ReactNode;
};

function signalForSection(section: string): SignalSemanticState {
  switch (section) {
    case "needs_you":
      return "needs_attention";
    case "waiting":
      return "provisional";
    case "updated":
      return "confirmed";
    default:
      return "settled";
  }
}

/** Human cue under the row — calm verb, not dashboard taxonomy. */
function rowCue(item: AttentionCenterItem): string | null {
  if (item.section === "needs_you" && item.action_required) return "Review";
  if (item.section === "waiting") return null;
  if (item.section === "updated") return null;
  return null;
}

function Section({
  label,
  testId,
  items,
  onOpen,
  bearer,
  onOpenPlan,
  onReminderDismissed,
  extras,
}: {
  label: string;
  testId: string;
  items: AttentionCenterItem[];
  onOpen: (item: AttentionCenterItem) => void;
  bearer?: string;
  onOpenPlan?: (planId: string) => void;
  onReminderDismissed?: (attentionId: string) => void;
  extras?: React.ReactNode;
}) {
  if (!items.length && !extras) return null;
  return (
    <section className="activity-section" data-testid={testId} data-section={testId}>
      <h2 className="activity-section-label">{label}</h2>
      {extras}
      {items.map((r) => {
        if (testId === "needs-you" && isReminderSourceType(r.source_type)) {
          const reminder = projectReminder(r);
          if (reminder) {
            return (
              <ReminderCard
                key={r.id}
                reminder={reminder}
                bearer={bearer}
                onOpenPlan={onOpenPlan}
                onDismissed={() => onReminderDismissed?.(r.id)}
              />
            );
          }
        }
        const cue = rowCue(r);
        return (
          <button
            key={r.id}
            type="button"
            className="activity-row"
            data-testid={`activity-row-${r.section}-${r.id}`}
            data-attention-id={r.id}
            data-section={r.section}
            data-needs-you={r.section === "needs_you" ? "true" : "false"}
            data-signal-state={signalForSection(r.section)}
            data-action-required={r.action_required ? "true" : "false"}
            onClick={() => onOpen(r)}
          >
            <strong>{r.title}</strong>
            <span className="activity-row-detail">{r.detail || r.copy}</span>
            {cue ? <span className="activity-row-cue">{cue}</span> : null}
          </button>
        );
      })}
    </section>
  );
}

export function ActivityDestination({
  onBack,
  onOpenGraph,
  onOpenConversation,
  onOpenPlan,
  onOpenAttentionItem,
  bearer,
  initialFeed = null,
  onFeedChange,
  reminderSeed = null,
  forYouExtras,
}: Props) {
  const [feed, setFeed] = React.useState<AttentionCenterFeed | null>(initialFeed);
  const [loading, setLoading] = React.useState(!initialFeed);
  const [error, setError] = React.useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = React.useState<Record<string, true>>({});

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchAttention(bearer);
      setFeed(next);
      onFeedChange?.(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load attention");
    } finally {
      setLoading(false);
    }
  }, [bearer, onFeedChange]);

  React.useEffect(() => {
    if (!initialFeed) void load();
  }, [initialFeed, load]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  const openItem = (item: AttentionCenterItem) => {
    // Prefer the exact action surface Opal already knows about.
    if (onOpenAttentionItem) {
      onOpenAttentionItem(item);
      return;
    }
    const kind = item.deep_link?.kind;
    const id = item.deep_link?.id || item.deep_link?.conversation_id || item.conversation_id;
    if (
      (kind === "proposal" ||
        kind === "reservation_auth" ||
        kind === "open_question" ||
        kind === "commitment" ||
        kind === "conversation") &&
      id &&
      onOpenConversation
    ) {
      onOpenConversation(id);
      return;
    }
    if (kind === "plan" && id && onOpenPlan) {
      onOpenPlan(id);
      return;
    }
    if (item.action_required && onOpenGraph) {
      onOpenGraph();
      return;
    }
    onBack();
  };

  const needsRaw = feed?.needs_you ?? [];
  const needs = needsRaw.filter((i) => !dismissedIds[i.id]);
  const waiting = feed?.waiting ?? [];
  const updated = feed?.updated ?? [];
  const seedCards =
    reminderSeed &&
    !needs.some((i) => isReminderSourceType(i.source_type))
      ? reminderSeed.filter((r) => !dismissedIds[r.attentionId])
      : [];
  const reminderExtras =
    seedCards.length > 0 ? (
      <>
        {seedCards.map((r) => (
          <ReminderCard
            key={r.attentionId}
            reminder={r}
            bearer={bearer}
            onOpenPlan={onOpenPlan}
            onDismissed={() =>
              setDismissedIds((d) => ({ ...d, [r.attentionId]: true }))
            }
          />
        ))}
      </>
    ) : null;
  const forYouCombined = (
    <>
      {forYouExtras}
      {reminderExtras}
    </>
  );
  const hasExtras = Boolean(forYouExtras) || seedCards.length > 0;
  const hasAny =
    needs.length + waiting.length + updated.length > 0 || hasExtras;

  return (
    <div
      className="activity-dest-473-141"
      data-testid="activity-destination"
      data-attention-center="true"
      data-figma-node="618:2384"
      data-screen="attention-center"
      data-founder-title="Attention"
      data-signal-grammar="965:2"
      data-actionable-count={feed?.actionable_count ?? 0}
      role="dialog"
      aria-modal="true"
      aria-label="Attention"
    >
      <header className="social-dest-brand" style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button
          type="button"
          className="opal-nav-chevron"
          data-testid="activity-back"
          aria-label="Back"
          onClick={onBack}
        >
          ‹
        </button>
      </header>
      <h1 className="activity-dest-title">Attention</h1>
      <p className="activity-dest-lede">
        What&apos;s for you, what Opal is holding, and what just settled.
      </p>

      <div className="activity-scroll" data-testid="attention-center-scroll">
        {loading ? (
          <p className="activity-empty" data-testid="attention-loading">
            Loading…
          </p>
        ) : null}

        {error ? (
          <p className="activity-empty" data-testid="attention-error">
            {error}
          </p>
        ) : null}

        {!loading && !error && !hasAny ? (
          <p className="activity-empty" data-testid="attention-empty">
            {feed?.empty_copy || "You're all caught up."}
          </p>
        ) : null}

        {!loading && !error && hasAny && needs.length === 0 ? (
          <p className="activity-calm" data-testid="attention-nothing-needed">
            {feed?.empty_needs_you_copy || "Nothing needs your attention right now."}
          </p>
        ) : null}

        <Section
          label="For you"
          testId="needs-you"
          items={needs}
          onOpen={openItem}
          bearer={bearer}
          onOpenPlan={onOpenPlan}
          onReminderDismissed={(id) =>
            setDismissedIds((d) => ({ ...d, [id]: true }))
          }
          extras={forYouCombined}
        />
        <Section label="Waiting" testId="waiting" items={waiting} onOpen={openItem} />
        <Section label="Updated" testId="updated" items={updated} onOpen={openItem} />
      </div>
    </div>
  );
}
