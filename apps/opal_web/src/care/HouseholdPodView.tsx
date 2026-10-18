/**
 * Repair #18 Division B (B5a) — household pod view.
 *
 * Renders the pod contract exactly as projected: the label the pod
 * gave itself, who is in (active) and who has been invited (pending —
 * shown as invited, never counted as members), and the plan defaults
 * the pod drives. A pod is a planning context, not a trust tier, and
 * this surface claims nothing more.
 */
import type { Household } from "./careClient";

export function HouseholdPodView({
  pod,
  names,
  onAccept,
  onSetPrimary,
  onAcceptSupply,
}: {
  pod: Household;
  names: Record<string, string>;
  onAccept?: () => void;
  onSetPrimary?: () => void;
  onAcceptSupply?: () => void;
}) {
  const nameOf = (id: string) => names[id] || "Member";

  return (
    <section aria-label={`Household ${pod.label}`}>
      <h2>{pod.label}</h2>
      <p>
        Home base: {pod.home_label} · Plans here default to everyone in the pod, at{" "}
        {pod.home_label}, in the pod&apos;s timezone.
      </p>

      <ul aria-label="Household members">
        {pod.active_member_user_ids.map((id) => (
          <li key={id}>{nameOf(id)}</li>
        ))}
        {pod.pending_member_user_ids.map((id) => (
          <li key={id}>{nameOf(id)} (invited)</li>
        ))}
      </ul>

      {pod.viewer_status === "invited" && (
        <button type="button" onClick={() => onAccept?.()}>
          Join {pod.label}
        </button>
      )}
      {pod.viewer_status === "active" && !pod.viewer_is_primary && (
        <button type="button" onClick={() => onSetPrimary?.()}>
          Make this my main household
        </button>
      )}
      {pod.viewer_is_primary && pod.active_member_user_ids.length >= 2 && (
        <button type="button" onClick={() => onAcceptSupply?.()}>
          Start a supply run for {pod.label}
        </button>
      )}
    </section>
  );
}
