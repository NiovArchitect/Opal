import type { ChatPreview } from "../data";
import { planWhoLine } from "../realtime/inboxState";
import { decideSurfaceProjection, shouldShowHomePending } from "./surfaceProjection";

/**
 * Continuity cards for committed SharedPlans.
 * Upcoming plans stay quiet continuity.
 * Past Shared Reality ("Earlier together") stays in relationship history —
 * not proven attendance, not Durable Memory, not published Memory.
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

  const past = plans.filter((chat) => chat.planProjection?.temporal_state === "past");
  const upcoming = plans.filter((chat) => chat.planProjection?.temporal_state !== "past");

  return (
    <section className="home-plan-list" aria-label="Plans" data-testid="home-plan-list">
      {upcoming.map((chat) => renderCard(chat, onOpenChat, "upcoming"))}
      {past.map((chat) => renderCard(chat, onOpenChat, "past"))}
    </section>
  );
}

function renderCard(
  chat: ChatPreview,
  onOpenChat: (id?: string) => void,
  lane: "upcoming" | "past",
) {
  const plan = chat.planProjection!;
  const who = planWhoLine(plan.participant_mode, chat.name);
  const isPast = lane === "past" || plan.temporal_state === "past";
  const homePending =
    !isPast &&
    plan.pending_change === true &&
    shouldShowHomePending(
      decideSurfaceProjection({
        sourceType: "proposal",
        role: "participant",
        attentionCarriesAction: true,
        homeRelevance: false,
        pendingChange: true,
        changeProposalValue: plan.pending_proposal_value,
      }),
    );

  return (
    <button
      key={plan.lineage_id || chat.id}
      type="button"
      className={`home-plan-card${isPast ? " is-history" : ""}`}
      data-testid={isPast ? "home-plan-history" : "home-plan-projection"}
      data-visibility={plan.visibility}
      data-public="false"
      data-participant-mode={plan.participant_mode}
      data-conversation-id={chat.id}
      data-temporal={isPast ? "past" : plan.temporal_state || "future"}
      data-home-lane={isPast ? "past-shared-reality" : "continuity"}
      data-past-shared-reality={
        isPast || plan.past_shared_reality === true ? "true" : "false"
      }
      data-occurrence-state={
        isPast
          ? plan.occurrence_state || "past_unverified"
          : plan.occurrence_state || undefined
      }
      onClick={() => onOpenChat(chat.id)}
    >
      <p className="home-plan-kicker">{isPast ? "Earlier together" : plan.kicker}</p>
      <p className="home-plan-who">{who}</p>
      {plan.participant_mode === "solo" ? (
        <p className="home-plan-execution">Just you. Not a shared agreement.</p>
      ) : null}
      {plan.when_label ? <p className="home-plan-when">{plan.when_label}</p> : null}
      {plan.online || plan.plan_type === "virtual" ? (
        <p className="home-plan-place" data-testid="home-plan-online" data-plan-type="virtual">
          <span className="home-plan-online-icon" aria-hidden>
            📹
          </span>{" "}
          Online
        </p>
      ) : plan.place ? (
        <p className="home-plan-place">{plan.place}</p>
      ) : null}
      {!isPast && plan.meeting_link ? (
        <span
          className="home-plan-execution home-plan-join"
          data-testid="home-plan-join"
          role="link"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            // http(s) only — sanitized upstream in clientPlanFields
            window.open(plan.meeting_link!, "_blank", "noopener,noreferrer");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              window.open(plan.meeting_link!, "_blank", "noopener,noreferrer");
            }
          }}
        >
          Join
        </span>
      ) : null}
      {!isPast && plan.execution_label ? (
        <p className="home-plan-execution">{plan.execution_label}</p>
      ) : null}
      {!isPast && plan.execution_detail ? (
        <p className="home-plan-execution">{plan.execution_detail}</p>
      ) : null}
      {isPast ? (
        <p className="home-plan-execution" data-testid="home-plan-history-cue">
          Shared plan · open the thread
        </p>
      ) : null}
      {homePending ? (
        <p className="home-plan-execution" data-testid="home-plan-pending">
          A change is waiting.
        </p>
      ) : null}
    </button>
  );
}
