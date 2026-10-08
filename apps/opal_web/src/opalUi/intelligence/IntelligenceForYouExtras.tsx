/**
 * Loads mediation + weekly briefing into Attention For you.
 * Mock/auto flags remock on API miss; real flag shows honest empty/error.
 */
import React from "react";
import {
  fetchCurrentBriefing,
  fetchMediationItems,
  type MediationItem,
  type WeeklyBriefing,
} from "../../api/intelligenceClient";
import { MediationCard } from "./MediationCard";
import { WeeklyBriefingCard } from "./WeeklyBriefingCard";
import { dedupeNudgesAgainstReminders } from "./intelligenceDedupe";
import type { ReminderProjection } from "./reminderLifecycle";

type Props = {
  bearer?: string;
  enabled?: boolean;
  onOpenConversation?: (conversationId: string) => void;
  onPresenceChange?: (hasCards: boolean) => void;
  /** Active reminder projections — FE dedupe drops matching nudges. */
  activeReminders?: ReminderProjection[];
};

export function IntelligenceForYouExtras({
  bearer,
  enabled = true,
  onOpenConversation,
  onPresenceChange,
  activeReminders = [],
}: Props) {
  const [mediation, setMediation] = React.useState<MediationItem[]>([]);
  const [briefing, setBriefing] = React.useState<WeeklyBriefing | null>(null);
  const [dismissed, setDismissed] = React.useState<Record<string, true>>({});
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!enabled) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoadError(null);
      const errors: string[] = [];
      try {
        const med = await fetchMediationItems({ bearer });
        if (cancelled) return;
        setMediation(med.items.filter((i) => i.card_state !== "dismissed"));
        if (med._error) errors.push(med._error);
      } catch (e) {
        if (!cancelled) {
          setMediation([]);
          errors.push(e instanceof Error ? e.message : "Mediation unavailable");
        }
      }
      try {
        const brief = await fetchCurrentBriefing({ bearer });
        if (cancelled) return;
        setBriefing(brief);
      } catch (e) {
        if (!cancelled) {
          setBriefing(null);
          errors.push(
            e instanceof Error ? e.message : "Weekly briefing unavailable",
          );
        }
      }
      if (!cancelled) {
        setLoadError(errors.length ? errors.join(" · ") : null);
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bearer, enabled]);

  const visibleMediation = mediation.filter((m) => !dismissed[m.id]);
  const showBriefing = Boolean(briefing && !dismissed[briefing.id]);
  const hasCards = visibleMediation.length > 0 || showBriefing;

  React.useEffect(() => {
    if (loaded) onPresenceChange?.(hasCards);
  }, [loaded, hasCards, onPresenceChange]);

  // FE dedupe: if a choreography nudge mirrored a reminder (person_id, date),
  // reminder card already owns the surface — log + drop nudge-shaped mediation
  // topics that collide (defensive; primary path is reminderDedupeKey in store).
  React.useEffect(() => {
    if (!activeReminders.length) return;
    dedupeNudgesAgainstReminders(
      visibleMediation.map((m) => ({
        event_id: m.id,
        person_id: null,
        anchor_date: null,
        summary: m.topic,
      })),
      activeReminders,
    );
  }, [activeReminders, visibleMediation]);

  if (!loaded) {
    return (
      <p
        className="intelligence-for-you-loading"
        data-testid="intelligence-for-you-loading"
        aria-live="polite"
      >
        Checking what Opal noticed…
      </p>
    );
  }

  if (!visibleMediation.length && !showBriefing) {
    if (!loadError) return null;
    return (
      <p
        className="activity-empty"
        data-testid="intelligence-for-you-error"
        role="alert"
      >
        {loadError}
      </p>
    );
  }

  return (
    <div data-testid="intelligence-for-you-extras" aria-live="polite">
      {loadError ? (
        <p
          className="activity-empty"
          data-testid="intelligence-for-you-error"
          role="alert"
        >
          {loadError}
        </p>
      ) : null}
      {visibleMediation.map((item) => (
        <MediationCard
          key={item.id}
          item={item}
          bearer={bearer}
          onDismissed={(id) => setDismissed((d) => ({ ...d, [id]: true }))}
          onSent={(id) => setDismissed((d) => ({ ...d, [id]: true }))}
          onPlanCreated={(id) => setDismissed((d) => ({ ...d, [id]: true }))}
        />
      ))}
      {showBriefing && briefing ? (
        <WeeklyBriefingCard
          briefing={briefing}
          bearer={bearer}
          onDismissed={(id) => setDismissed((d) => ({ ...d, [id]: true }))}
          onOpenConversation={onOpenConversation}
        />
      ) : null}
    </div>
  );
}
