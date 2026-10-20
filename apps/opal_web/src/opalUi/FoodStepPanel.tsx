/**
 * Repair #18 (B2) — the at-home completion panel: join step + food step,
 * rendered ONLY from the plan contract's `completion` projection (the
 * backend's one source). This component derives nothing: no local food
 * state, no hardcoded labels beyond the design's canonical strings.
 *
 * HONESTY LAW: Opal does not place food orders. The panel composes the
 * group's own list and hands each person off to the restaurant site or
 * their own delivery app, where THEY order and pay. The only
 * confirmation that exists is the person's own tap: "I placed my order".
 */
import { useState } from "react";
import {
  foodAddItems,
  foodCouldNotDeliver,
  foodNotOrdering,
  foodSelfConfirm,
  foodStartHandoff,
} from "../api/productClient";

type CompletionStep = {
  id: string;
  status: string;
  copy?: string;
  host?: string | null;
  restaurant_name?: string | null;
  rollup?: { households_total: number; households_confirmed: number; confirmed_by: string[]; label: string };
  recipients?: Array<{
    user_id: string;
    items: string[];
    items_state: string;
    handoff_state: string;
    provider_choice?: string | null;
  }>;
};

export function completionStep(
  completion: { steps: CompletionStep[] } | null | undefined,
  id: string,
): CompletionStep | null {
  return completion?.steps?.find((s) => s.id === id) ?? null;
}

/**
 * Repair #20 (F-20) - the viewer's OWN delivery apps, as the
 * backend's one handoff transport names them
 * (FoodHandoff.provider_choices: doordash / ubereats / grubhub).
 * Picking one starts the handoff with that provider_choice: the
 * backend opens that provider's public search with the restaurant
 * name as the search term (labeled a search, never a store page).
 * A provider not in the backend map has no rail and is never
 * offered here.
 */
export const FOOD_PROVIDER_CHOICES: Array<{ key: string; label: string }> = [
  { key: "doordash", label: "DoorDash" },
  { key: "ubereats", label: "Uber Eats" },
  { key: "grubhub", label: "GrubHub" },
];

export function FoodStepPanel(props: {
  planId: string;
  completion: { steps: CompletionStep[] } | null | undefined;
  viewerUserId: string;
  meetingLink?: string | null;
  onChanged?: () => void;
}) {
  const { planId, completion, viewerUserId, meetingLink, onChanged } = props;
  const join = completionStep(completion, "join");
  const food = completionStep(completion, "food");
  const [handoffNote, setHandoffNote] = useState<string | null>(null);
  const [itemDraft, setItemDraft] = useState("");

  if (!join && !food) return null;

  const mine = food?.recipients?.find((r) => r.user_id === viewerUserId) ?? null;
  const restaurant = food?.restaurant_name || "the restaurant";

  const after = () => onChanged?.();

  const startHandoff = async (providerChoice?: string) => {
    const res = await foodStartHandoff(planId, providerChoice);
    if (res.handoff_url) {
      window.open(res.handoff_url, "_blank", "noopener,noreferrer");
      setHandoffNote(
        "You opened the ordering page. When you have placed your order there, tap I placed my order.",
      );
    } else {
      setHandoffNote(res.no_rail_reason ?? null);
    }
    after();
  };

  return (
    <section className="food-step-panel" data-testid="food-step-panel">
      {join ? (
        <div className="food-step-join" data-testid="join-step" data-status={join.status}>
          {join.status === "link_ready" ? (
            meetingLink ? (
              <button
                type="button"
                className="food-step-join-button"
                onClick={() => window.open(meetingLink, "_blank", "noopener,noreferrer")}
              >
                Join{join.host ? ` on ${join.host}` : ""}
              </button>
            ) : (
              <span data-testid="join-link-missing">
                The meeting link is not on this plan yet — ask the host to add it and Join
                will show up here.
              </span>
            )
          ) : (
            <p className="food-step-join-missing">
              Add the meeting link and I will put Join on the plan for everyone.
            </p>
          )}
        </div>
      ) : null}

      {food ? (
        <div className="food-step" data-testid="food-step" data-status={food.status}>
          <p className="food-step-header">
            Opal does not place this order. You order and pay in the provider, delivered to the
            address in your provider account.
          </p>
          {food.status === "suggested" ? (
            <p className="food-step-ask">
              Want food handled for this one? I can set up an order handoff for everyone at home.
            </p>
          ) : null}
          {food.status === "declined" ? <p>Food is off for this one.</p> : null}
          {food.status !== "suggested" && food.status !== "declined" ? (
            <>
              <p className="food-step-list-label">
                Order list for {restaurant} - your group list. You will place the actual order with
                the provider.
              </p>
              {food.rollup ? (
                <p className="food-step-rollup" data-testid="food-rollup">
                  {food.rollup.label}
                  {food.rollup.confirmed_by.length > 0
                    ? ` (confirmed by ${food.rollup.confirmed_by.join(", ")})`
                    : ""}
                </p>
              ) : null}
              {mine ? (
                <div className="food-step-mine" data-testid="food-mine">
                  <ul>
                    {mine.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <label>
                    Your items
                    <input
                      value={itemDraft}
                      onChange={(e) => setItemDraft(e.target.value)}
                      placeholder="margherita pizza, no basil"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!itemDraft.trim()) return;
                      await foodAddItems(planId, [...mine.items, itemDraft.trim()]);
                      setItemDraft("");
                      after();
                    }}
                  >
                    Save my items
                  </button>
                  {mine.handoff_state === "not_started" ||
                  mine.handoff_state === "could_not_deliver" ? (
                    <button type="button" onClick={() => void startHandoff()}>
                      {food.restaurant_name
                        ? `Open ${restaurant} site to order`
                        : "Open your delivery app"}
                    </button>
                  ) : null}
                  {/* F-20: the handoff routes INTO the viewer's own
                      connected tool - their pick of delivery app,
                      searched for this restaurant. Offered only
                      when a restaurant is chosen (the provider rail
                      carries the restaurant name as its search). */}
                  {(mine.handoff_state === "not_started" ||
                    mine.handoff_state === "could_not_deliver") &&
                  food.restaurant_name ? (
                    <div className="food-step-providers" data-testid="food-providers">
                      <span>Or open it in your app: </span>
                      {FOOD_PROVIDER_CHOICES.map((choice) => (
                        <button
                          key={choice.key}
                          type="button"
                          data-testid={`food-provider-${choice.key}`}
                          onClick={() => void startHandoff(choice.key)}
                        >
                          {choice.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {handoffNote ? <p className="food-step-note">{handoffNote}</p> : null}
                  {mine.handoff_state === "handed_off" ? (
                    <>
                      <button
                        type="button"
                        onClick={async () => {
                          await foodSelfConfirm(planId);
                          after();
                        }}
                      >
                        I placed my order
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await foodNotOrdering(planId);
                          after();
                        }}
                      >
                        Not ordering for this one
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await foodCouldNotDeliver(planId);
                          after();
                        }}
                      >
                        That place does not deliver to me
                      </button>
                    </>
                  ) : null}
                  {mine.handoff_state === "self_confirmed_done" ? (
                    <p>You confirmed your own order for this plan.</p>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
