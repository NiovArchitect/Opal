/**
 * Repair #21 (W-5b) - GROUP MEMBERSHIP, on the real
 * ConversationMember machinery.
 *
 * The group thread's manage surface. Everything it shows is the
 * backend's membership projection (GET /conversations/:id/
 * membership): who is in, who created the conversation, and - per
 * member - whether THIS viewer may remove them, decided server-side
 * from the admin rule (only the creator may remove someone else;
 * anyone may remove themselves). The surface decides nothing:
 *
 *  - Add: a multi-select over the one people projection; one tap
 *    adds everyone selected in ONE call (POST with `user_ids`).
 *  - Remove / Leave: rendered only where the projection's
 *    `can_remove` says so; the server re-checks on the DELETE and
 *    its refusal line is shown verbatim.
 *  - Who came and went: the projection's recorded membership
 *    events, finished lines from the conversation's own record.
 *
 * After every write the panel re-reads the projection - the
 * server's truth, never a local edit - and tells the host so the
 * thread and list re-read too. When the viewer leaves, the host is
 * told (`onLeft`) so it can close the thread: they are not in the
 * conversation anymore.
 */
import React, { useEffect, useState } from "react";
import {
  addConversationMembers,
  fetchConversationMembership,
  listPeopleProjection,
  membershipWriteError,
  removeConversationMember,
  type ConversationMembership,
} from "../../api/productClient";

type Candidate = { personId: string; name: string };

export function GroupMembershipPanel({
  conversationId,
  bearer,
  onChanged,
  onLeft,
}: {
  conversationId: string;
  bearer?: string;
  /** A membership write landed and the host should re-read its lists. */
  onChanged?: () => void;
  /** The viewer left this conversation. */
  onLeft?: () => void;
}) {
  const [membership, setMembership] = useState<ConversationMembership | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const reload = React.useCallback(async () => {
    try {
      const res = await fetchConversationMembership(conversationId, bearer);
      setMembership(res.membership);
      setLoadFailed(false);
      try {
        const people = await listPeopleProjection(bearer);
        const memberIds = new Set(res.membership.members.map((m) => m.user_id));
        setCandidates(
          (people.people ?? [])
            .filter((p) => !memberIds.has(p.id))
            .map((p) => ({ personId: p.id, name: p.display_name })),
        );
      } catch {
        // The add list is a second read; its failure leaves the
        // member list standing and the add section honestly empty.
        setCandidates([]);
      }
    } catch {
      setLoadFailed(true);
    }
  }, [conversationId, bearer]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (loadFailed) {
    return (
      <div className="group-membership" data-testid="group-membership">
        <p className="group-membership-line" role="alert">
          People in this conversation did not load. Try again in a moment.
        </p>
      </div>
    );
  }

  if (!membership) {
    return (
      <div className="group-membership" data-testid="group-membership">
        <p className="group-membership-line">Loading people...</p>
      </div>
    );
  }

  const toggle = (personId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(personId)) next.delete(personId);
      else next.add(personId);
      return next;
    });
  };

  const addSelected = async () => {
    if (busy || selected.size === 0) return;
    setBusy(true);
    setError(null);
    try {
      await addConversationMembers(conversationId, [...selected], bearer);
      setSelected(new Set());
      await reload();
      onChanged?.();
    } catch (err) {
      setError(membershipWriteError(err) ?? "That didn't go through. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (userId: string, isViewer: boolean) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await removeConversationMember(conversationId, userId, bearer);
      onChanged?.();
      if (isViewer) {
        onLeft?.();
        return;
      }
      await reload();
    } catch (err) {
      setError(membershipWriteError(err) ?? "That didn't go through. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="group-membership" data-testid="group-membership">
      <p className="group-membership-title">People in this conversation</p>
      <div className="group-membership-members">
        {membership.members.map((member) => (
          <div
            key={member.user_id}
            className="group-membership-row"
            data-testid="group-membership-member"
            data-user-id={member.user_id}
          >
            <span className="group-membership-name">
              {member.is_viewer ? "You" : member.display_name}
              {member.is_creator ? (
                <span className="group-membership-creator"> - started this conversation</span>
              ) : null}
            </span>
            {member.can_remove ? (
              <button
                type="button"
                className="group-membership-remove"
                data-testid={member.is_viewer ? "group-membership-leave" : "group-membership-remove"}
                disabled={busy}
                onClick={() => void remove(member.user_id, member.is_viewer)}
              >
                {member.is_viewer ? "Leave" : "Remove"}
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {candidates.length > 0 ? (
        <div className="group-membership-add">
          <p className="group-membership-title">Add people</p>
          {candidates.map((person) => (
            <label
              key={person.personId}
              className="group-membership-candidate"
              data-testid="group-membership-candidate"
              data-user-id={person.personId}
            >
              <input
                type="checkbox"
                checked={selected.has(person.personId)}
                disabled={busy}
                onChange={() => toggle(person.personId)}
              />
              <span>{person.name}</span>
            </label>
          ))}
          <button
            type="button"
            className="group-membership-add-btn"
            data-testid="group-membership-add-selected"
            disabled={busy || selected.size === 0}
            onClick={() => void addSelected()}
          >
            {busy
              ? "Adding..."
              : selected.size > 1
                ? `Add ${selected.size} people`
                : "Add"}
          </button>
        </div>
      ) : null}

      {membership.membership_events.length > 0 ? (
        <div className="group-membership-events">
          <p className="group-membership-title">Who came and went</p>
          {membership.membership_events.map((event, i) => (
            <p
              key={`${event.kind}-${event.at ?? i}`}
              className="group-membership-event"
              data-testid="group-membership-event"
            >
              {event.label}
            </p>
          ))}
        </div>
      ) : null}

      {error ? (
        <p className="group-membership-error" data-testid="group-membership-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
