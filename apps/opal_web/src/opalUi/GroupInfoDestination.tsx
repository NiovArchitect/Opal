/**
 * Group Info — dated Figma 618:521 (lineage 590:280).
 * Communication context → Chats-active dock (owned by parent OpalApp).
 * Conversation membership ≠ Graph / plan leadership.
 */
import React from "react";

export type GroupInfoMember = {
  id: string;
  name: string;
  role?: string;
  /** Product person id when known — opens PersonMemoryView via onOpenPersonMemory. */
  personId?: string;
};

type Props = {
  groupName: string;
  members: GroupInfoMember[];
  sharedGraphLabel?: string | null;
  onBack: () => void;
  onAddPeople?: () => void;
  onMute?: () => void;
  onLeave?: () => void;
  /** Existing About affordance → per-person memory (no new header button). */
  onOpenPersonMemory?: (member: GroupInfoMember) => void;
};

export function GroupInfoDestination({
  groupName,
  members,
  sharedGraphLabel,
  onBack,
  onAddPeople,
  onMute,
  onLeave,
  onOpenPersonMemory,
}: Props) {
  return (
    <div
      className="group-info-dest"
      data-testid="group-info"
      data-figma-node="618:521"
      data-legacy-figma="590:280"
      data-nav-active="chats"
      data-screen="group-info"
      role="dialog"
      aria-modal="true"
      aria-label={`${groupName} group info`}
    >
      <header className="group-info-top">
        <button
          type="button"
          className="opal-nav-chevron"
          data-testid="group-info-back"
          aria-label="Back"
          onClick={onBack}
        >
          ‹
        </button>
      </header>

      <h1 className="group-info-title" data-testid="group-info-title">
        {groupName}
      </h1>
      <p className="group-info-lede">
        Conversation membership is separate from plan leadership.
      </p>
      <p className="group-info-count">{members.length} people</p>
      <p className="group-info-meta">Members</p>

      <ul className="group-info-members" data-testid="group-info-members">
        {members.map((m) => (
          <li key={m.id} className="group-info-member" data-testid={`group-info-member-${m.id}`}>
            <span className="group-info-avatar" aria-hidden>
              {m.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="group-info-member-name">
              {m.name}
              {m.role ? <span className="group-info-member-role"> · {m.role}</span> : null}
            </span>
            {onOpenPersonMemory && m.role !== "you" ? (
              <button
                type="button"
                className="group-info-member-memory"
                data-testid={`group-info-memory-${m.id}`}
                aria-label={`What Opal remembers about ${m.name}`}
                onClick={() => onOpenPersonMemory(m)}
              >
                Memory
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="group-info-action group-info-add"
        data-testid="group-info-add-people"
        onClick={onAddPeople}
      >
        Add people
      </button>

      {sharedGraphLabel ? (
        <div className="group-info-shared-graph" data-testid="group-info-shared-graph">
          <p className="group-info-shared-kicker">Shared Graphs</p>
          <p className="group-info-shared-value">{sharedGraphLabel}</p>
          <span className="group-info-shared-chevron" aria-hidden>
            ›
          </span>
        </div>
      ) : null}

      <div className="group-info-footer-actions">
        <button
          type="button"
          className="group-info-action"
          data-testid="group-info-mute"
          onClick={onMute}
        >
          Mute conversation
        </button>
        <button
          type="button"
          className="group-info-action is-leave"
          data-testid="group-info-leave"
          onClick={onLeave}
        >
          Leave group
        </button>
      </div>
    </div>
  );
}
