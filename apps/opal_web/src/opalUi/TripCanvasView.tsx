/**
 * Trip canvas — multi-day soft itinerary (Brand V4 tokens, no new design language).
 * Trip → Day → TimeBlock → Activity + RSVP. Convoy + vibe moments included.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildMexicoCityCanvasSeed,
  daySummaryLine,
  formatTripDateRange,
  personName,
  rsvpCounts,
  subgroupLine,
  type CanvasActivity,
  type CanvasPerson,
  type CanvasRsvpState,
  type CanvasTimeBlock,
  type CanvasTrip,
} from "./mexicoCityCanvasSeed";
import {
  curateTripExperience,
  getTripConvoy,
  seedMexicoCityCanvas,
  setTripActivityResponse,
  tripConvoyOptIn,
  tripConvoyOptOut,
  tripConvoyPing,
  type Trip,
  type TripConvoyRoster,
} from "../api/productClient";

type Props = {
  bearer?: string | null;
  /** Live trip id when available; otherwise founder seed canvas. */
  tripId?: string | null;
  selfUserId?: string | null;
  onClose: () => void;
  /** Open StoryViewer memories without closing canvas ownership in parent. */
  onOpenMemories?: () => void;
};

function BlockIcon({ kind }: { kind: string }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (kind === "free") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M8 12h8" />
      </svg>
    );
  }
  if (kind === "meal") {
    return (
      <svg {...common}>
        <path d="M8 3v8M8 11c0 2 1 3 3 3" />
        <path d="M16 3v18M14 8h4" />
      </svg>
    );
  }
  if (kind === "transit") {
    return (
      <svg {...common}>
        <path d="M5 17h14v2H5zM7 17V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v10" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2.5" />
    </svg>
  );
}

function AvatarStack({
  people,
  ids,
  tone,
}: {
  people: CanvasPerson[];
  ids: string[];
  tone: "in" | "interested" | "passed";
}) {
  return (
    <div className={`trip-canvas-avatars is-${tone}`} aria-hidden>
      {ids.slice(0, 4).map((id) => {
        const p = people.find((x) => x.id === id);
        return (
          <span key={id} className="trip-canvas-avatar" title={p?.name || id}>
            {p?.initial || "?"}
          </span>
        );
      })}
    </div>
  );
}

function mapApiTripToCanvas(trip: Trip, selfId?: string | null): CanvasTrip {
  const participants: CanvasPerson[] = (trip.participants || []).map((p, i) => ({
    id: p.user_id,
    name: p.user_id === selfId ? "You" : `Guest ${i + 1}`,
    initial: p.user_id === selfId ? "Y" : String.fromCharCode(65 + (i % 26)),
  }));
  if (selfId && !participants.some((p) => p.id === selfId)) {
    participants.unshift({ id: selfId, name: "You", initial: "Y" });
  }
  const days: CanvasDay[] = (trip.days || []).map((d) => ({
    id: d.id,
    day_index: d.day_index,
    on_date: d.on_date ?? null,
    label: d.label,
    notes: d.notes ?? null,
    time_blocks: (d.time_blocks || []).map((b) => ({
      id: b.id,
      position: b.position,
      slot: b.slot,
      time_label: b.time_label,
      block_kind: b.block_kind,
      title: b.title ?? null,
      notes: b.notes ?? null,
      activities: (b.activities || []).map((a) => ({
        id: a.id,
        venue_name: a.venue_name,
        venue_area: a.venue_area ?? null,
        activity_kind: a.activity_kind || "activity",
        vibe_tags: a.vibe_tags || [],
        notes: a.notes ?? null,
        responses: (a.responses || []).map((r) => ({
          user_id: r.user_id,
          state: r.state as CanvasRsvpState,
        })),
      })),
    })),
  }));
  return {
    id: trip.id,
    title: trip.title || trip.destination_label || "Trip",
    destination_label: trip.destination_label || trip.title || "Trip",
    starts_on: trip.starts_on || "",
    ends_on: trip.ends_on || "",
    participants,
    days,
    opal_noticed: [],
  };
}

export function TripCanvasView({
  bearer,
  tripId,
  selfUserId,
  onClose,
  onOpenMemories,
}: Props) {
  const seed = useMemo(() => buildMexicoCityCanvasSeed(), []);
  const [trip, setTrip] = useState<CanvasTrip>(seed);
  const [dayIndex, setDayIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gateNote, setGateNote] = useState<string | null>(null);
  const [curatorNote, setCuratorNote] = useState<string | null>(null);
  const [whyOpenId, setWhyOpenId] = useState<string | null>(null);
  const [suggestForId, setSuggestForId] = useState<string | null>(null);
  const [suggestText, setSuggestText] = useState("");
  const [convoyOpen, setConvoyOpen] = useState(false);
  const [convoyExplain, setConvoyExplain] = useState(false);
  const [convoy, setConvoy] = useState<TripConvoyRoster | null>(null);
  const [onWayBusy, setOnWayBusy] = useState(false);
  const selfId = selfUserId || seed.participants[0]?.id || "seed-you";
  const dayRailRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const touchX = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (bearer && tripId && !String(tripId).startsWith("seed-")) {
        const seeded = await seedMexicoCityCanvas(tripId, bearer).catch(() => null);
        const live = seeded?.trip;
        if (live?.days?.length) {
          const mapped = mapApiTripToCanvas(live, selfUserId);
          mapped.opal_noticed = seed.opal_noticed;
          setTrip(mapped);
          setLoading(false);
          return;
        }
      }
      setTrip(seed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load trip canvas.");
      setTrip(seed);
    } finally {
      setLoading(false);
    }
  }, [bearer, tripId, seed, selfUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!gateNote) return;
    const t = window.setTimeout(() => setGateNote(null), 4200);
    return () => window.clearTimeout(t);
  }, [gateNote]);

  const day = trip.days[dayIndex] || trip.days[0];
  const dateRange = formatTripDateRange(trip.starts_on, trip.ends_on);

  const setDay = (idx: number) => {
    const next = Math.max(0, Math.min(trip.days.length - 1, idx));
    setDayIndex(next);
    const rail = dayRailRef.current;
    const btn = rail?.querySelector(`[data-day-index="${next}"]`) as HTMLElement | null;
    btn?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  };

  const patchActivity = (activityId: string, state: CanvasRsvpState) => {
    setTrip((prev) => ({
      ...prev,
      days: prev.days.map((d) => ({
        ...d,
        time_blocks: d.time_blocks.map((b) => ({
          ...b,
          activities: b.activities.map((a) => {
            if (a.id !== activityId) return a;
            const others = a.responses.filter((r) => r.user_id !== selfId);
            return {
              ...a,
              responses: [...others, { user_id: selfId, state }],
            };
          }),
        })),
      })),
    }));
  };

  const onRsvp = async (activity: CanvasActivity, state: CanvasRsvpState) => {
    const before = activity.responses.find((r) => r.user_id === selfId)?.state;
    patchActivity(activity.id, state);
    const { inIds } = rsvpCounts(activity);
    const onlySelfWasIn =
      before === "in" &&
      state === "passed" &&
      inIds.length === 1 &&
      inIds[0] === selfId;
    if (onlySelfWasIn) {
      setCuratorNote(
        "Just you on this activity — still want to go, or find an alternative?",
      );
    }
    if (state === "passed") {
      const afterIn = activity.responses.filter(
        (r) => r.user_id !== selfId && r.state === "in",
      );
      if (afterIn.length === 0 && inIds.every((id) => id === selfId)) {
        setCuratorNote("Everyone passed — Opal is finding an alternative…");
        if (bearer && tripId && !String(tripId).startsWith("seed-")) {
          void curateTripExperience(tripId, bearer)
            .then((res) => {
              const p = res.proposals?.[0];
              if (p?.venue_name) {
                setCuratorNote(`Opal suggests: ${p.venue_name} — want to try it?`);
              }
            })
            .catch(() => {});
        }
      }
    }
    if (bearer && tripId && !String(tripId).startsWith("seed-") && !activity.id.startsWith("seed-")) {
      try {
        await setTripActivityResponse(tripId, activity.id, state, bearer);
      } catch {
        if (before) patchActivity(activity.id, before);
        else patchActivity(activity.id, "interested");
        setGateNote("Couldn't update RSVP — try again.");
      }
    }
  };

  const refreshConvoy = async () => {
    if (!bearer || !tripId || String(tripId).startsWith("seed-")) {
      setConvoy({
        sharing: convoy?.sharing || false,
        members: (convoy?.members || []).filter((m) => m.sharing),
        note: "Founder seed — convoy is local until a live trip id is linked.",
      });
      return;
    }
    try {
      const roster = await getTripConvoy(tripId, bearer);
      setConvoy(roster);
    } catch {
      setGateNote("Couldn't load convoy.");
    }
  };

  const startConvoy = async () => {
    setConvoyExplain(false);
    if (bearer && tripId && !String(tripId).startsWith("seed-")) {
      try {
        await tripConvoyOptIn(tripId, bearer);
        await refreshConvoy();
        setConvoyOpen(true);
        return;
      } catch {
        setGateNote("Couldn't start convoy.");
        return;
      }
    }
    setConvoy({
      sharing: true,
      members: [
        {
          user_id: selfId,
          sharing: true,
          place_label: "Roma Norte",
          has_coords: false,
          eta_note: "You · sharing",
        },
      ],
      note: "Opt-in only. Trip-scoped.",
    });
    setConvoyOpen(true);
  };

  const stopConvoy = async () => {
    if (bearer && tripId && !String(tripId).startsWith("seed-")) {
      try {
        await tripConvoyOptOut(tripId, bearer);
      } catch {
        /* */
      }
    }
    setConvoy({ sharing: false, members: [], note: "Sharing stopped." });
    setConvoyOpen(false);
  };

  const onMyWay = async () => {
    setOnWayBusy(true);
    const label = day?.time_blocks?.find((b) => b.activities[0])?.activities[0]?.venue_name || "meetup";
    if (bearer && tripId && !String(tripId).startsWith("seed-")) {
      try {
        await tripConvoyPing(tripId, { place_label: `On the way to ${label}` }, bearer);
        await refreshConvoy();
      } catch {
        setGateNote("Opt in to convoy before sharing ETA.");
      }
    } else {
      setConvoy((prev) => ({
        sharing: true,
        note: prev?.note || "Opt-in only.",
        members: [
          {
            user_id: selfId,
            sharing: true,
            place_label: `On the way to ${label}`,
            has_coords: false,
            eta_note: `You are on the way · ETA ~12 min`,
          },
          ...(prev?.members || []).filter((m) => m.user_id !== selfId),
        ],
      }));
    }
    setOnWayBusy(false);
  };

  useEffect(() => {
    if (convoyOpen) void refreshConvoy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convoyOpen]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.changedTouches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchX.current;
    touchX.current = null;
    if (start == null) return;
    const end = e.changedTouches[0]?.clientX ?? start;
    const dx = end - start;
    if (Math.abs(dx) < 48) return;
    if (dx < 0) setDay(dayIndex + 1);
    else setDay(dayIndex - 1);
  };

  return (
    <div className="trip-canvas" data-testid="trip-canvas" data-screen="trip-canvas">
      <header className="trip-canvas-header">
        <button
          type="button"
          className="trip-canvas-back"
          data-testid="trip-canvas-close"
          aria-label="Close trip canvas"
          onClick={onClose}
        >
          ‹
        </button>
        <div className="trip-canvas-header-main">
          <p className="trip-canvas-kicker">TRIP</p>
          <h1 className="trip-canvas-title" data-testid="trip-canvas-title">
            {trip.destination_label || trip.title}
          </h1>
          <p className="trip-canvas-dates" data-testid="trip-canvas-dates">
            {dateRange || "Dates open"}
          </p>
        </div>
        <div className="trip-canvas-header-actions">
          <div className="trip-canvas-people" aria-label="Participants">
            {trip.participants.slice(0, 4).map((p) => (
              <span key={p.id} className="trip-canvas-avatar is-header" title={p.name}>
                {p.initial}
              </span>
            ))}
          </div>
          <button
            type="button"
            className={`trip-canvas-chip ${convoyOpen || convoy?.sharing ? "is-active" : ""}`}
            data-testid="trip-canvas-convoy-toggle"
            onClick={() => {
              if (convoy?.sharing) {
                setConvoyOpen((v) => !v);
              } else {
                setConvoyExplain(true);
              }
            }}
          >
            Convoy
          </button>
          {onOpenMemories ? (
            <button
              type="button"
              className="trip-canvas-chip"
              data-testid="trip-canvas-memories"
              onClick={onOpenMemories}
            >
              Memories
            </button>
          ) : null}
        </div>
      </header>

      {gateNote ? (
        <p className="gsh-gate-note" role="status" data-testid="trip-canvas-gate">
          {gateNote}
        </p>
      ) : null}
      {curatorNote ? (
        <p className="trip-canvas-curator" role="status" data-testid="trip-canvas-curator">
          {curatorNote}
        </p>
      ) : null}

      {convoyExplain ? (
        <div className="trip-canvas-sheet" data-testid="trip-canvas-convoy-explain">
          <p className="trip-canvas-sheet-title">Share location with trip members?</p>
          <p className="trip-canvas-sheet-body">
            Share your live location with trip members for the duration of this trip. Auto-expires
            when the trip ends. Opt-in only — never default on.
          </p>
          <div className="trip-canvas-sheet-actions">
            <button type="button" className="trip-canvas-primary" onClick={() => void startConvoy()}>
              Opt in
            </button>
            <button type="button" className="trip-canvas-secondary" onClick={() => setConvoyExplain(false)}>
              Not now
            </button>
          </div>
        </div>
      ) : null}

      {convoyOpen && convoy?.sharing ? (
        <section className="trip-canvas-convoy" data-testid="trip-canvas-convoy">
          <div className="trip-canvas-convoy-head">
            <p className="trip-canvas-convoy-title">Convoy</p>
            <button
              type="button"
              className="trip-canvas-secondary"
              data-testid="trip-canvas-convoy-stop"
              onClick={() => void stopConvoy()}
            >
              Stop sharing
            </button>
          </div>
          <ul className="trip-canvas-convoy-list">
            {(convoy.members || []).map((m) => (
              <li key={m.user_id} data-testid={`trip-convoy-row-${m.user_id}`}>
                {m.eta_note ||
                  `${personName(trip.participants, m.user_id)} · ${m.place_label || "sharing"}`}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="trip-canvas-primary"
            data-testid="trip-canvas-on-my-way"
            disabled={onWayBusy}
            onClick={() => void onMyWay()}
          >
            I&apos;m on my way
          </button>
          <p className="trip-canvas-footnote">{convoy.note}</p>
        </section>
      ) : null}

      {trip.opal_noticed?.length ? (
        <div className="trip-canvas-noticed" data-testid="trip-canvas-noticed">
          {trip.opal_noticed.slice(0, 2).map((line) => (
            <p key={line} className="trip-canvas-noticed-line">
              {line}
            </p>
          ))}
        </div>
      ) : null}

      <div
        className="trip-canvas-days"
        role="tablist"
        aria-label="Trip days"
        ref={dayRailRef}
        data-testid="trip-canvas-day-rail"
      >
        {trip.days.map((d, i) => (
          <button
            key={d.id}
            type="button"
            role="tab"
            aria-selected={i === dayIndex}
            data-day-index={i}
            data-testid={`trip-canvas-day-tab-${i}`}
            className={`trip-canvas-day-tab ${i === dayIndex ? "is-active" : ""}`}
            onClick={() => setDay(i)}
          >
            {d.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="trip-canvas-empty" data-testid="trip-canvas-loading">
          <p>Opal is pulling together ideas…</p>
        </div>
      ) : error ? (
        <div className="trip-canvas-empty" data-testid="trip-canvas-error">
          <p>{error}</p>
          <button type="button" className="trip-canvas-primary" onClick={() => void load()}>
            Retry
          </button>
        </div>
      ) : !day ? (
        <div className="trip-canvas-empty" data-testid="trip-canvas-empty">
          <p>Opal is pulling together ideas…</p>
        </div>
      ) : (
        <div
          className="trip-canvas-body"
          ref={contentRef}
          data-testid="trip-canvas-day-body"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <p className="trip-canvas-day-summary" data-testid="trip-canvas-day-summary">
            {daySummaryLine(day)}
          </p>

          <ol className="trip-canvas-blocks">
            {day.time_blocks.map((block) => (
              <li key={block.id} className="trip-canvas-block" data-block-kind={block.block_kind}>
                <div className="trip-canvas-block-head">
                  <span className="trip-canvas-block-icon">
                    <BlockIcon kind={block.block_kind} />
                  </span>
                  <div>
                    <p className="trip-canvas-time-label">{block.time_label}</p>
                    {block.title ? <p className="trip-canvas-block-title">{block.title}</p> : null}
                  </div>
                </div>

                {block.block_kind === "free" ? (
                  <article className="trip-canvas-card is-free" data-testid={`trip-block-free-${block.id}`}>
                    <p>
                      {/evening|night/i.test(block.slot || block.time_label)
                        ? "Free evening — explore or rest."
                        : /morning/i.test(block.slot || block.time_label)
                          ? "Free morning — explore or rest."
                          : "Free afternoon — explore or rest."}
                    </p>
                    {block.notes ? <p className="trip-canvas-card-meta">{block.notes}</p> : null}
                  </article>
                ) : null}

                {block.block_kind === "transit" ? (
                  <article className="trip-canvas-card is-transit" data-testid={`trip-block-transit-${block.id}`}>
                    <p>{block.notes || block.title || "Transit"}</p>
                  </article>
                ) : null}

                {(block.block_kind === "activity" || block.block_kind === "meal") &&
                  block.activities.map((act) => (
                    <ActivityCard
                      key={act.id}
                      activity={act}
                      people={trip.participants}
                      selfId={selfId}
                      block={block}
                      whyOpen={whyOpenId === act.id}
                      onToggleWhy={() => setWhyOpenId((id) => (id === act.id ? null : act.id))}
                      suggestOpen={suggestForId === act.id}
                      suggestText={suggestText}
                      onSuggestOpen={() => {
                        setSuggestForId(act.id);
                        setSuggestText("");
                      }}
                      onSuggestChange={setSuggestText}
                      onSuggestSubmit={() => {
                        setGateNote(
                          suggestText.trim()
                            ? `Noted alternative: ${suggestText.trim()}`
                            : "Add a short alternative idea first.",
                        );
                        setSuggestForId(null);
                      }}
                      onRsvp={(state) => void onRsvp(act, state)}
                    />
                  ))}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function ActivityCard({
  activity,
  people,
  selfId,
  block,
  whyOpen,
  onToggleWhy,
  suggestOpen,
  suggestText,
  onSuggestOpen,
  onSuggestChange,
  onSuggestSubmit,
  onRsvp,
}: {
  activity: CanvasActivity;
  people: CanvasPerson[];
  selfId: string;
  block: CanvasTimeBlock;
  whyOpen: boolean;
  onToggleWhy: () => void;
  suggestOpen: boolean;
  suggestText: string;
  onSuggestOpen: () => void;
  onSuggestChange: (v: string) => void;
  onSuggestSubmit: () => void;
  onRsvp: (state: CanvasRsvpState) => void;
}) {
  const { inIds, interested, passed } = rsvpCounts(activity);
  const mine = activity.responses.find((r) => r.user_id === selfId)?.state;
  const everyoneIn =
    people.length > 0 && inIds.length >= people.length && passed.length === 0;
  const allPassed = people.length > 0 && passed.length >= people.length;
  const subgroup = subgroupLine(activity, people);
  const mealMeta =
    block.block_kind === "meal"
      ? `Table for ${Math.max(inIds.length, 1)} · ${block.time_label}`
      : null;

  return (
    <article
      className={`trip-canvas-card ${everyoneIn ? "is-anchor" : ""} ${
        mine === "passed" ? "is-passed" : ""
      } ${allPassed ? "is-all-passed" : ""}`}
      data-testid={`trip-activity-${activity.id}`}
      data-anchor={everyoneIn ? "true" : undefined}
    >
      <div className="trip-canvas-card-top">
        <div>
          <h2 className="trip-canvas-venue">{activity.venue_name}</h2>
          <p className="trip-canvas-card-meta">
            {[activity.venue_area, activity.cuisine, activity.price_tier].filter(Boolean).join(" · ")}
          </p>
        </div>
        {activity.why ? (
          <button
            type="button"
            className="trip-canvas-why-btn"
            data-testid={`trip-activity-why-${activity.id}`}
            aria-label="Why Opal suggested this"
            onClick={onToggleWhy}
          >
            i
          </button>
        ) : null}
      </div>
      {whyOpen && activity.why ? (
        <p className="trip-canvas-why" data-testid={`trip-activity-why-text-${activity.id}`}>
          {activity.why}
        </p>
      ) : null}
      {activity.description ? <p className="trip-canvas-desc">{activity.description}</p> : null}
      {mealMeta ? <p className="trip-canvas-meal-meta">{mealMeta}</p> : null}
      {everyoneIn ? (
        <p className="trip-canvas-everyone" data-testid="trip-activity-everyone-in">
          Everyone&apos;s in ✓
        </p>
      ) : null}
      {allPassed ? (
        <p className="trip-canvas-curator">Everyone passed — Opal is finding an alternative…</p>
      ) : null}

      {activity.vibe_tags?.length ? (
        <div className="trip-canvas-tags">
          {activity.vibe_tags.map((t) => (
            <span key={t} className="trip-canvas-tag">
              {t}
            </span>
          ))}
        </div>
      ) : null}

      <div className="trip-canvas-rsvp-row" data-testid={`trip-rsvp-row-${activity.id}`}>
        <AvatarStack people={people} ids={inIds} tone="in" />
        <AvatarStack people={people} ids={interested} tone="interested" />
        <AvatarStack people={people} ids={passed} tone="passed" />
        <span className="trip-canvas-rsvp-counts">
          {inIds.length} in · {interested.length} interested
        </span>
      </div>
      {subgroup ? <p className="trip-canvas-subgroup">{subgroup}</p> : null}

      <div className="trip-canvas-rsvp-actions" role="group" aria-label="Your RSVP">
        <button
          type="button"
          className={`trip-canvas-rsvp-btn ${mine === "in" ? "is-on" : ""}`}
          data-testid={`trip-rsvp-in-${activity.id}`}
          onClick={() => onRsvp("in")}
        >
          I&apos;m in
        </button>
        <button
          type="button"
          className={`trip-canvas-rsvp-btn ${mine === "interested" ? "is-on" : ""}`}
          data-testid={`trip-rsvp-interested-${activity.id}`}
          onClick={() => onRsvp("interested")}
        >
          Interested
        </button>
        <button
          type="button"
          className={`trip-canvas-rsvp-btn ${mine === "passed" ? "is-on" : ""}`}
          data-testid={`trip-rsvp-pass-${activity.id}`}
          onClick={() => onRsvp("passed")}
        >
          Pass
        </button>
      </div>
      {mine === "passed" ? (
        <button type="button" className="trip-canvas-rejoin" onClick={() => onRsvp("in")}>
          Changed your mind? Tap to join
        </button>
      ) : null}

      <button type="button" className="trip-canvas-suggest-link" onClick={onSuggestOpen}>
        Suggest alternative
      </button>
      {suggestOpen ? (
        <div className="trip-canvas-suggest">
          <input
            className="trip-canvas-suggest-input"
            value={suggestText}
            onChange={(e) => onSuggestChange(e.target.value)}
            placeholder="Another place or idea"
            aria-label="Suggest alternative"
          />
          <button type="button" className="trip-canvas-primary" onClick={onSuggestSubmit}>
            Send
          </button>
        </div>
      ) : null}
    </article>
  );
}
