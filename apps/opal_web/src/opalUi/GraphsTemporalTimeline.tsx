/**
 * Phase 5 - Graphs as calendar: temporal flow (not a month grid).
 *
 * Importance formula (card scale):
 *   importance = groupSize * relationshipCloseness * timeProximity
 *   - groupSize: 1 + (memberCount - 1) * 0.25, capped 2.5
 *   - relationshipCloseness: 1.0 close / 0.7 friend / 0.45 acquaintance (default 0.7)
 *   - timeProximity: 1.4 tonight · 1.2 weekend · 1.0 next week · 0.7 next month · 0.4 someday
 *
 * Paste J: 30/90 range filter, seed honesty, Message / Adjust / Add to calendar on future items.
 * Someday nurture signal is stubbed seed until live price/intel wiring.
 */
import React, { useMemo, useState } from "react";
import {
  downloadPlanIcs,
  filterTimelineByRangeDays,
  isFutureTimelineItem,
  withSeedStartsAt,
  type TimelineItem,
} from "./graphCalendaring";

export type { TimelineItem };

type OrbitTense = "past" | "present" | "future";
export type TimelineRangeDays = 30 | 90;

type Props = {
  items?: TimelineItem[];
  onOpenItem?: (id: string) => void;
  /** Message the group / person for this plan. */
  onMessageGroup?: (item: TimelineItem) => void;
  /** Adjust plan (open detail / continuity). */
  onAdjust?: (item: TimelineItem) => void;
  /** When true, show sample-plans honesty chip (seed path). */
  seedLabeled?: boolean;
};

const BUCKET_ORDER: TimelineItem["bucket"][] = [
  "now",
  "tonight",
  "weekend",
  "next_week",
  "next_month",
  "someday",
];

const BUCKET_LABEL: Record<string, string> = {
  now: "Now",
  tonight: "Tonight",
  weekend: "This weekend",
  next_week: "Next week",
  next_month: "Next month",
  someday: "Someday",
  earlier: "Earlier together",
};

const PROXIMITY: Record<string, number> = {
  now: 1.5,
  tonight: 1.4,
  weekend: 1.2,
  next_week: 1.0,
  next_month: 0.7,
  someday: 0.4,
  earlier: 0.5,
};

/** Seed temporal items so Timeline is walkable without live trip API. */
export const SEED_TIMELINE_ITEMS: TimelineItem[] = withSeedStartsAt([
  {
    id: "seed-chanelle-juniper",
    title: "Juniper",
    whenLabel: "Saturday · 7:30",
    who: ["Chanelle"],
    where: "Juniper",
    status: "ready",
    bucket: "weekend",
    groupSize: 2,
    closeness: 1,
    /* Paste W Phase 6.1 - restaurant deal proactive extension */
    nurtureSignal: "Juniper is almost full Saturday. Want to book?",
    source: "seed",
  },
  {
    id: "seed-maya-graph-coast",
    title: "Coast walk",
    whenLabel: "Tonight",
    who: ["Maya"],
    where: "Coast",
    status: "forming",
    bucket: "tonight",
    groupSize: 2,
    closeness: 0.9,
    source: "seed",
  },
  {
    id: "seed-near-rooftop",
    title: "Rooftop lights",
    whenLabel: "Next week",
    who: ["Alex"],
    bucket: "next_week",
    groupSize: 3,
    closeness: 0.7,
    source: "seed",
  },
  {
    id: "seed-mexico-city-past",
    title: "Mexico City",
    whenLabel: "Earlier together",
    who: ["Alex", "Maya"],
    where: "CDMX",
    status: "past",
    bucket: "earlier",
    groupSize: 3,
    closeness: 1,
    source: "seed",
  },
  {
    id: "seed-japan-someday",
    title: "Japan (someday)",
    whenLabel: "Someday",
    who: ["You", "Chanelle"],
    where: "Tokyo",
    bucket: "someday",
    groupSize: 2,
    closeness: 1,
    nurtureSignal: "Flight prices to Tokyo dropped 20%. Want to look at dates?",
    source: "seed",
  },
]);

function importance(item: TimelineItem): number {
  const group = Math.min(2.5, 1 + Math.max(0, (item.groupSize || item.who.length || 1) - 1) * 0.25);
  const close = item.closeness ?? 0.7;
  const prox = PROXIMITY[item.bucket] ?? 0.8;
  return group * close * prox;
}

function shareCard(item: TimelineItem): string {
  const who = item.who.length ? item.who.join(", ") : "friends";
  const where = item.where ? ` · ${item.where}` : "";
  return `Opal lined this up for us\n${item.title}${where}\n${item.whenLabel}\nWith ${who}\n- Opal`;
}

export function GraphsTemporalTimeline({
  items = SEED_TIMELINE_ITEMS,
  onOpenItem,
  onMessageGroup,
  onAdjust,
  seedLabeled,
}: Props) {
  const [orbitPerson, setOrbitPerson] = useState<string | null>(null);
  const [rangeDays, setRangeDays] = useState<TimelineRangeDays>(30);

  const usingSeed =
    seedLabeled === true ||
    (items.length > 0 && items.every((i) => (i.source || "seed") === "seed"));

  const ranged = useMemo(
    () => filterTimelineByRangeDays(items, rangeDays),
    [items, rangeDays],
  );

  const upcoming = useMemo(() => {
    return [...ranged]
      .filter((i) => i.bucket !== "earlier" && i.bucket !== "someday")
      .sort((a, b) => importance(b) - importance(a))
      .slice(0, 3);
  }, [ranged]);

  const byBucket = useMemo(() => {
    const map = new Map<string, TimelineItem[]>();
    for (const b of [...BUCKET_ORDER, "earlier"]) map.set(b, []);
    for (const item of ranged) {
      const list = map.get(item.bucket) || [];
      list.push(item);
      map.set(item.bucket, list);
    }
    for (const [k, list] of map) {
      map.set(
        k,
        [...list].sort((a, b) => importance(b) - importance(a)),
      );
    }
    return map;
  }, [ranged]);

  const orbit = useMemo(() => {
    if (!orbitPerson) return null;
    const related = ranged.filter((i) =>
      i.who.some((w) => w.toLowerCase() === orbitPerson.toLowerCase()),
    );
    const tense = (i: TimelineItem): OrbitTense =>
      i.bucket === "earlier" ? "past" : i.bucket === "someday" || i.bucket === "next_month" || i.bucket === "next_week"
        ? "future"
        : i.bucket === "now" || i.bucket === "tonight" || i.bucket === "weekend"
          ? "present"
          : "future";
    return {
      person: orbitPerson,
      past: related.filter((i) => tense(i) === "past"),
      present: related.filter((i) => tense(i) === "present"),
      future: related.filter((i) => tense(i) === "future"),
    };
  }, [orbitPerson, ranged]);

  const onShare = async (item: TimelineItem) => {
    const text = shareCard(item);
    try {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({
          title: "Opal lined this up for us",
          text,
        });
      } else {
        const clip = (navigator as Navigator).clipboard;
        if (clip?.writeText) await clip.writeText(text);
      }
    } catch {
      /* cancelled */
    }
  };

  const rangeToggle = (
    <div
      className="graphs-range-toggle"
      role="tablist"
      aria-label="Timeline range"
      data-testid="graphs-range-toggle"
    >
      {([30, 90] as const).map((d) => (
        <button
          key={d}
          type="button"
          role="tab"
          className={`graphs-range-chip ${rangeDays === d ? "is-active" : ""}`}
          data-testid={`graphs-range-${d}`}
          aria-selected={rangeDays === d}
          onClick={() => setRangeDays(d)}
        >
          {d} days
        </button>
      ))}
    </div>
  );

  // Paste W3 5.1 — user-facing seed honesty only (no walkthrough/dev prose).
  const seedNote = usingSeed ? (
    <p className="graphs-temporal-seed-note" data-testid="graphs-temporal-seed-note">
      Plans you line up will land here.
    </p>
  ) : null;

  if (orbit) {
    return (
      <div className="graphs-orbit" data-testid="graphs-orbit" data-person={orbit.person}>
        <button
          type="button"
          className="graphs-orbit-back"
          data-testid="graphs-orbit-back"
          onClick={() => setOrbitPerson(null)}
        >
          ← Timeline
        </button>
        <h2 className="graphs-orbit-title">{orbit.person}</h2>
        <p className="graphs-orbit-lede">Everything with them: past, present, future.</p>
        {rangeToggle}
        {(
          [
            ["past", "Earlier together", orbit.past],
            ["present", "Present", orbit.present],
            ["future", "Upcoming + someday", orbit.future],
          ] as const
        ).map(([key, label, list]) => (
          <section key={key} className="graphs-orbit-section" data-testid={`graphs-orbit-${key}`}>
            <h3>{label}</h3>
            {list.length === 0 ? <p className="gsh-empty">Nothing here yet.</p> : null}
            {list.map((item) => (
              <TimelineCard
                key={item.id}
                item={item}
                onOpen={onOpenItem}
                onPerson={setOrbitPerson}
                onShare={onShare}
                onMessageGroup={onMessageGroup}
                onAdjust={onAdjust}
              />
            ))}
          </section>
        ))}
      </div>
    );
  }

  return (
    <div
      className="graphs-temporal"
      data-testid="graphs-temporal-timeline"
      data-range-days={rangeDays}
      data-source={usingSeed ? "seed" : "live"}
    >
      {rangeToggle}
      {seedNote}

      <section className="graphs-whats-next" data-testid="graphs-whats-next" aria-label="What's next">
        <h2 className="graphs-temporal-heading">What&apos;s next</h2>
        <div className="graphs-whats-next-list">
          {upcoming.map((item) => (
            <TimelineCard
              key={`next-${item.id}`}
              item={item}
              pinned
              onOpen={onOpenItem}
              onPerson={setOrbitPerson}
              onShare={onShare}
              onMessageGroup={onMessageGroup}
              onAdjust={onAdjust}
            />
          ))}
          {!upcoming.length ? (
            <p className="gsh-empty">Nothing in the next {rangeDays} days.</p>
          ) : null}
        </div>
      </section>

      {BUCKET_ORDER.map((bucket) => {
        const list = byBucket.get(bucket) || [];
        if (!list.length && bucket !== "someday") return null;
        return (
          <section
            key={bucket}
            className={`graphs-temporal-bucket${bucket === "someday" ? " is-someday" : ""}`}
            data-testid={`graphs-bucket-${bucket}`}
          >
            <h3 className="graphs-temporal-heading">{BUCKET_LABEL[bucket]}</h3>
            {list.map((item) => (
              <TimelineCard
                key={item.id}
                item={item}
                onOpen={onOpenItem}
                onPerson={setOrbitPerson}
                onShare={onShare}
                onMessageGroup={onMessageGroup}
                onAdjust={onAdjust}
              />
            ))}
            {bucket === "someday" && !list.length ? (
              <p className="gsh-empty">Dream trips land here.</p>
            ) : null}
          </section>
        );
      })}

      {(byBucket.get("earlier") || []).length ? (
        <section className="graphs-temporal-bucket is-earlier" data-testid="graphs-bucket-earlier">
          <h3 className="graphs-temporal-heading">Earlier together</h3>
          {(byBucket.get("earlier") || []).map((item) => (
            <TimelineCard
              key={item.id}
              item={item}
              onOpen={onOpenItem}
              onPerson={setOrbitPerson}
              onShare={onShare}
              onMessageGroup={onMessageGroup}
              onAdjust={onAdjust}
            />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function TimelineCard({
  item,
  pinned,
  onOpen,
  onPerson,
  onShare,
  onMessageGroup,
  onAdjust,
}: {
  item: TimelineItem;
  pinned?: boolean;
  onOpen?: (id: string) => void;
  onPerson: (name: string) => void;
  onShare: (item: TimelineItem) => void;
  onMessageGroup?: (item: TimelineItem) => void;
  onAdjust?: (item: TimelineItem) => void;
}) {
  const future = isFutureTimelineItem(item);
  const planState =
    item.status === "ready" || item.status === "aligned"
      ? "ready"
      : item.status === "past"
        ? "past"
        : item.status === "action"
          ? "action"
          : item.status === "forming"
            ? "forming"
            : item.bucket === "someday"
              ? "idea"
              : item.status || "forming";
  return (
    <article
      className={`graphs-temporal-card${pinned ? " is-pinned" : ""}`}
      data-testid={`graphs-temporal-card-${item.id}`}
      data-bucket={item.bucket}
      data-source={item.source || "seed"}
      data-plan-state={planState}
    >
      <button
        type="button"
        className="graphs-temporal-card-main"
        onClick={() => onOpen?.(item.id)}
      >
        <span className="graphs-temporal-card-top">
          <strong>{item.title}</strong>
          <span
            className={`graphs-card-status graphs-status-${planState === "ready" ? "ready" : planState === "action" ? "action" : planState === "past" ? "past" : planState === "idea" ? "idea" : planState === "happening" || planState === "locked" ? "happening" : "forming"} plan-state-pill`}
            data-plan-state={planState}
            data-testid={`graphs-temporal-status-${item.id}`}
          >
            {planState === "ready"
              ? "Ready"
              : planState === "action"
                ? "Action"
                : planState === "past"
                  ? "Past"
                  : planState === "idea"
                    ? "Idea"
                    : planState === "happening" || planState === "locked"
                      ? "Live"
                      : "Forming"}
          </span>
        </span>
        <span className="graphs-temporal-when">{item.whenLabel}</span>
        {item.where ? <span className="graphs-temporal-where">{item.where}</span> : null}
      </button>
      <div className="graphs-temporal-who">
        {item.who.map((name) => (
          <button
            key={name}
            type="button"
            className="graphs-person-pill"
            data-testid={`graphs-person-pill-${name.toLowerCase()}`}
            onClick={() => onPerson(name)}
          >
            {name}
          </button>
        ))}
      </div>
      {item.nurtureSignal ? (
        <p className="graphs-nurture-signal" data-testid="graphs-nurture-signal">
          {item.nurtureSignal}
        </p>
      ) : null}
      {future ? (
        <div
          className="graphs-temporal-actions"
          role="group"
          aria-label={`Actions for ${item.title}`}
          data-testid={`graphs-actions-${item.id}`}
        >
          <button
            type="button"
            className="graphs-temporal-action"
            data-testid={`graphs-message-${item.id}`}
            onClick={() => {
              if (onMessageGroup) onMessageGroup(item);
              else {
                const peer = item.who.find((w) => w.toLowerCase() !== "you");
                if (peer) onPerson(peer);
              }
            }}
          >
            Message
          </button>
          <button
            type="button"
            className="graphs-temporal-action"
            data-testid={`graphs-adjust-${item.id}`}
            onClick={() => (onAdjust ? onAdjust(item) : onOpen?.(item.id))}
          >
            Adjust
          </button>
          <button
            type="button"
            className="graphs-temporal-action"
            data-testid={`graphs-calendar-${item.id}`}
            onClick={() => downloadPlanIcs(item)}
          >
            Add to calendar
          </button>
          <button
            type="button"
            className="graphs-share-plan"
            data-testid={`graphs-share-${item.id}`}
            onClick={() => onShare(item)}
          >
            Share
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="graphs-share-plan"
          data-testid={`graphs-share-${item.id}`}
          onClick={() => onShare(item)}
        >
          Share
        </button>
      )}
    </article>
  );
}
