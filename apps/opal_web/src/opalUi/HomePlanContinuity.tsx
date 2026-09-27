import type { ChatPreview } from "../data";
import { planWhoLine } from "../realtime/inboxState";

/**
 * One continuity card per committed plan. Visible to the people in that
 * plan. This is not a public feed post and it is not a chat log.
 */
export function HomePlanContinuity({
  chats,
  onOpenChat,
}: {
  chats: ChatPreview[];
  onOpenChat: (id?: string) => void;
}) {
  const plans = chats.filter((chat) => chat.planProjection);
  if (plans.length === 0) return null;

  return (
    <section className="home-plan-list" aria-label="Plans" data-testid="home-plan-list">
      {plans.map((chat) => {
        const plan = chat.planProjection!;
        const who = planWhoLine(plan.participant_mode, chat.name);
        return (
          <button
            key={plan.lineage_id || chat.id}
            type="button"
            className="home-plan-card"
            data-testid="home-plan-projection"
            data-visibility={plan.visibility}
            data-public="false"
            data-participant-mode={plan.participant_mode}
            data-conversation-id={chat.id}
            onClick={() => onOpenChat(chat.id)}
          >
            <p className="home-plan-kicker">{plan.kicker}</p>
            <p className="home-plan-who">{who}</p>
            {plan.participant_mode === "solo" ? (
              <p className="home-plan-execution">Just you. Not a shared agreement.</p>
            ) : null}
            {plan.when_label ? <p className="home-plan-when">{plan.when_label}</p> : null}
            {plan.place ? <p className="home-plan-place">{plan.place}</p> : null}
            {plan.execution_label ? (
              <p className="home-plan-execution">{plan.execution_label}</p>
            ) : null}
            {plan.execution_detail ? (
              <p className="home-plan-execution">{plan.execution_detail}</p>
            ) : null}
            {plan.pending_change ? (
              <p className="home-plan-execution">A change is waiting.</p>
            ) : null}
          </button>
        );
      })}
    </section>
  );
}
