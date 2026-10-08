/**
 * Loads mediation + weekly briefing into Attention For you.
 * Uses typed mocks when product HTTP is missing (BLOCKED.md).
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

type Props = {
  bearer?: string;
  enabled?: boolean;
  onOpenConversation?: (conversationId: string) => void;
  onPresenceChange?: (hasCards: boolean) => void;
};

export function IntelligenceForYouExtras({
  bearer,
  enabled = true,
  onOpenConversation,
  onPresenceChange,
}: Props) {
  const [mediation, setMediation] = React.useState<MediationItem[]>([]);
  const [briefing, setBriefing] = React.useState<WeeklyBriefing | null>(null);
  const [dismissed, setDismissed] = React.useState<Record<string, true>>({});
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void (async () => {
      try {
        const [med, brief] = await Promise.all([
          fetchMediationItems({ bearer }),
          fetchCurrentBriefing({ bearer }),
        ]);
        if (cancelled) return;
        setMediation(med.items.filter((i) => i.card_state !== "dismissed"));
        setBriefing(brief);
      } catch {
        /* keep empty */
      } finally {
        if (!cancelled) setLoaded(true);
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

  if (!visibleMediation.length && !showBriefing) return null;

  return (
    <div data-testid="intelligence-for-you-extras" aria-live="polite">
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
