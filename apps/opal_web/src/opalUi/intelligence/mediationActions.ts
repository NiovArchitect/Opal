/**
 * Mediation / consensus actions against typed mocks (BLOCKED.md).
 *
 * Backend delivery today: GroupCoordinator.maybe_mediate_to_owner posts a draft
 * to Opal Center 1:1 with delivery: :owner_center. Owner sends — Opal never
 * auto-posts the mediation draft into the group thread.
 */
import {
  createPlanFromMediation,
  dismissMediation,
  sendMediationDraft,
  type MediationItem,
} from "../../api/intelligenceClient";
import { postOpalMessage } from "../../api/productClient";

/** Open Center compose with draft — does not claim Opal auto-posted to group. */
export async function handoffMediationDraftToCenter(
  item: MediationItem,
  draft: string,
  bearer?: string,
): Promise<void> {
  const body =
    draft.trim() ||
    item.mediation_draft ||
    `Help mediate: ${item.topic}`;
  // Records owner intent via mock send endpoint, then posts to owner Center.
  await sendMediationDraft(item.id, body, { bearer });
  await postOpalMessage(
    `Send to group about ${item.topic}:\n\n${body}`,
    bearer,
  );
  try {
    window.dispatchEvent(
      new CustomEvent("opal-open-center", {
        detail: { source: "mediation-send", mediation_id: item.id },
      }),
    );
  } catch {
    /* ignore */
  }
}

export async function dismissMediationCard(
  item: MediationItem,
  bearer?: string,
): Promise<void> {
  await dismissMediation(item.id, { bearer });
}

/** Consensus lock-in → existing planning path via Center prefill. */
export async function lockInConsensusPlan(
  item: MediationItem,
  bearer?: string,
): Promise<void> {
  const proposal = item.positions[0]?.proposal || item.topic;
  await createPlanFromMediation(
    item.id,
    { topic: item.topic, proposal, conversation_id: item.conversation_id },
    { bearer },
  );
  await postOpalMessage(
    `Create plan: ${proposal} (${item.topic})`,
    bearer,
  );
  try {
    window.dispatchEvent(
      new CustomEvent("opal-open-center", {
        detail: { source: "mediation-create-plan", mediation_id: item.id },
      }),
    );
  } catch {
    /* ignore */
  }
}
