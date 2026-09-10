/**
 * NEW CALL — CURRENT additive authority 928:276
 * Call-scoped people + groups only. Not global Search 618:2299.
 * Law: Recent history should never be required to start a call.
 */
import React, { useMemo, useState } from "react";
import { FOUNDER_PEOPLE } from "./founderGraphSeed";

export type NewCallPerson = {
  id: string;
  name: string;
  kind: "person";
  avatarSrc?: string;
  avatarTone?: string;
};

export type NewCallGroup = {
  id: string;
  name: string;
  kind: "group";
  memberCount: number;
  avatarTone?: string;
};

type Props = {
  onBack: () => void;
  onCallPerson: (person: NewCallPerson) => void;
  onCallGroup: (group: NewCallGroup) => void;
  onOpenPersonContinuity: (person: NewCallPerson) => void;
  onOpenGroupContinuity: (group: NewCallGroup) => void;
  /** Optional live connections; founder fixture fills defaults. */
  people?: NewCallPerson[];
  groups?: NewCallGroup[];
};

const DEFAULT_PEOPLE: NewCallPerson[] = [
  {
    id: "newcall-chanelle",
    name: "Chanelle",
    kind: "person",
    avatarSrc: "/figma-v2/home-201/avatar-chanelle.png",
  },
  {
    id: "newcall-maya",
    name: "Maya",
    kind: "person",
    avatarSrc: "/figma-v2/home-201/avatar-maya.png",
  },
  {
    id: "newcall-jordan",
    name: "Jordan",
    kind: "person",
    avatarTone: "#0A2429",
  },
];

const DEFAULT_GROUPS: NewCallGroup[] = [
  {
    id: "newcall-juniper-crew",
    name: "Juniper crew",
    kind: "group",
    memberCount: 4,
    avatarTone: "#1A2338",
  },
];

function seedPeopleFromFounder(): NewCallPerson[] {
  const wanted = ["Chanelle", "Maya", "Jordan"];
  const fromSeed = FOUNDER_PEOPLE.filter((p) => wanted.includes(p)).map((name, i) => {
    const base = DEFAULT_PEOPLE.find((d) => d.name === name) || DEFAULT_PEOPLE[i]!;
    return { ...base, name };
  });
  return fromSeed.length ? fromSeed : DEFAULT_PEOPLE;
}

export function NewCallDestination({
  onBack,
  onCallPerson,
  onCallGroup,
  onOpenPersonContinuity,
  onOpenGroupContinuity,
  people,
  groups = DEFAULT_GROUPS,
}: Props) {
  const [q, setQ] = useState("");
  const roster = people?.length ? people : seedPeopleFromFounder();

  const filteredPeople = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return roster;
    return roster.filter((p) => p.name.toLowerCase().includes(s));
  }, [roster, q]);

  const filteredGroups = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return groups;
    return groups.filter(
      (g) => g.name.toLowerCase().includes(s) || String(g.memberCount).includes(s),
    );
  }, [groups, q]);

  return (
    <div
      className="new-call-dest"
      data-testid="new-call-destination"
      data-figma="928:276"
      data-figma-authority="928:276"
      data-screen="new-call"
      role="dialog"
      aria-modal="true"
      aria-label="New call"
    >
      <header className="new-call-top">
        <button
          type="button"
          className="new-call-back"
          data-testid="new-call-back"
          aria-label="Back"
          onClick={onBack}
        >
          ‹
        </button>
        <div className="new-call-titles">
          <h1 className="new-call-title">New call</h1>
          <p className="new-call-lede">Start with a person or group.</p>
        </div>
      </header>

      <div className="new-call-search-wrap">
        <span className="new-call-search-glyph" aria-hidden>
          ⌕
        </span>
        <input
          className="new-call-search"
          data-testid="new-call-search"
          placeholder="Search people and groups"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search people and groups"
        />
      </div>

      <section className="new-call-section" data-testid="new-call-people">
        <h2 className="new-call-heading">People</h2>
        <ul className="new-call-list">
          {filteredPeople.map((p) => (
            <li key={p.id} className="new-call-row">
              <button
                type="button"
                className="new-call-row-main"
                data-testid={`new-call-person-${p.name.toLowerCase()}`}
                onClick={() => onOpenPersonContinuity(p)}
              >
                <span
                  className="chats-home-avatar"
                  aria-hidden
                  style={p.avatarTone ? { background: p.avatarTone } : undefined}
                >
                  {p.avatarSrc ? <img src={p.avatarSrc} alt="" /> : p.name.slice(0, 1)}
                </span>
                <span className="new-call-name">{p.name}</span>
              </button>
              <button
                type="button"
                className="new-call-phone"
                data-testid={`new-call-dial-${p.name.toLowerCase()}`}
                aria-label={`Call ${p.name}`}
                onClick={() => onCallPerson(p)}
              >
                <img
                  className="calls-row-phone-shell"
                  src="/figma-v2/calls/callback-shell.svg"
                  alt=""
                  aria-hidden
                />
                <img
                  className="calls-row-phone-icon"
                  src="/figma-v2/calls/callback-icon.svg"
                  alt=""
                  width={18}
                  height={18}
                  aria-hidden
                />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="new-call-section" data-testid="new-call-groups">
        <h2 className="new-call-heading">Groups</h2>
        <ul className="new-call-list">
          {filteredGroups.map((g) => (
            <li key={g.id} className="new-call-row">
              <button
                type="button"
                className="new-call-row-main"
                data-testid={`new-call-group-${g.id}`}
                onClick={() => onOpenGroupContinuity(g)}
              >
                <span
                  className="chats-home-avatar"
                  aria-hidden
                  style={g.avatarTone ? { background: g.avatarTone } : undefined}
                >
                  {g.name.slice(0, 1)}
                </span>
                <span className="new-call-copy">
                  <span className="new-call-name">{g.name}</span>
                  <span className="new-call-meta">{g.memberCount} people</span>
                </span>
              </button>
              <button
                type="button"
                className="new-call-phone"
                data-testid={`new-call-dial-group-${g.id}`}
                aria-label={`Call ${g.name}`}
                onClick={() => onCallGroup(g)}
              >
                <img
                  className="calls-row-phone-shell"
                  src="/figma-v2/calls/callback-shell.svg"
                  alt=""
                  aria-hidden
                />
                <img
                  className="calls-row-phone-icon"
                  src="/figma-v2/calls/callback-icon.svg"
                  alt=""
                  width={18}
                  height={18}
                  aria-hidden
                />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <p className="new-call-law" data-testid="new-call-entry-law">
        Recent history should never be required to start a call.
      </p>
    </div>
  );
}
