/**
 * Phase 4D — Trips strip inside Graphs sticky chrome (above filter pills).
 * Compact horizontal cards; detail / create / add-stop overlays.
 * Reuses graph-card chrome + GraphWhoPicker. No Journey naming.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  addTripLeg,
  createTrip,
  getTrip,
  listConversations,
  listTrips,
  type Trip,
  type TripLeg,
} from "../api/productClient";
import { GraphWhoPicker, type WhoPerson } from "./GraphWhoPicker";

export type PersonDir = Record<string, { name: string; initial: string }>;

type Props = {
  /** Optional bearer; productClient resolves session when omitted. */
  bearer?: string;
};

function formatDateRange(starts?: string | null, ends?: string | null): string {
  if (!starts && !ends) return "";
  if (starts && ends && starts !== ends) return `${starts} – ${ends}`;
  return starts || ends || "";
}

function metaLine(trip: Trip): string {
  const dest = (trip.destination_label || "").trim();
  const dates = formatDateRange(trip.starts_on, trip.ends_on);
  if (dest && dates) return `${dest} · ${dates}`;
  return dest || dates || "Planning";
}

function LegTypeIcon({ type }: { type: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (type) {
    case "lodging":
      return (
        <svg {...common}>
          <path d="M3 21V8l9-5 9 5v13" />
          <path d="M9 21v-6h6v6" />
        </svg>
      );
    case "transit":
      return (
        <svg {...common}>
          <path d="M5 17h14v2H5z" />
          <path d="M7 17V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v10" />
          <circle cx="8.5" cy="17" r="1.5" />
          <circle cx="15.5" cy="17" r="1.5" />
        </svg>
      );
    case "meal":
      return (
        <svg {...common}>
          <path d="M8 3v8M8 11c0 2 1 3 3 3h0" />
          <path d="M6 3v4M10 3v4" />
          <path d="M16 3v18" />
          <path d="M14 8h4" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l2.5 2.5" />
        </svg>
      );
  }
}

export function TripCard({
  trip,
  people,
  onOpen,
}: {
  trip: Trip;
  people: PersonDir;
  onOpen: (id: string) => void;
}) {
  const participants = trip.participants || [];
  const shown = participants.slice(0, 4);
  const extra = Math.max(0, participants.length - 4);

  return (
    <article
      className="graphs-home-card graphs-trips-card"
      data-testid={`trip-card-${trip.id}`}
    >
      <button
        type="button"
        className="graphs-home-card-btn"
        data-testid={`trip-open-${trip.id}`}
        onClick={() => onOpen(trip.id)}
      >
        <div className="graphs-card-top">
          <strong className="graphs-card-title">{trip.title}</strong>
        </div>
        <p className="graphs-card-place" data-testid={`trip-meta-${trip.id}`}>
          {metaLine(trip)}
        </p>
        <div className="graphs-trips-avatars" aria-label="Participants">
          {shown.map((p) => {
            const info = people[p.user_id];
            const initial = info?.initial || "?";
            return (
              <span
                key={p.user_id}
                className="gsh-avatar-fallback graphs-trips-avatar"
                title={info?.name || p.user_id}
              >
                {initial}
              </span>
            );
          })}
          {extra > 0 ? (
            <span className="gsh-avatar-fallback graphs-trips-avatar graphs-trips-avatar-more">
              +{extra}
            </span>
          ) : null}
        </div>
      </button>
    </article>
  );
}

function TripDetail({
  trip,
  people,
  onBack,
  onRefresh,
  bearer,
}: {
  trip: Trip;
  people: PersonDir;
  onBack: () => void;
  onRefresh: (trip: Trip) => void;
  bearer?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [placeLabel, setPlaceLabel] = useState("");
  const [legType, setLegType] = useState("activity");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const legs = useMemo(
    () => [...(trip.legs || [])].sort((a, b) => a.position - b.position),
    [trip.legs],
  );

  async function submitStop(e: React.FormEvent) {
    e.preventDefault();
    if (!placeLabel.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await addTripLeg(
        trip.id,
        {
          leg_type: legType,
          place_label: placeLabel.trim(),
          starts_on: startsOn || undefined,
          ends_on: endsOn || undefined,
        },
        bearer,
      );
      const res = await getTrip(trip.id, bearer);
      onRefresh(res.trip);
      setAdding(false);
      setPlaceLabel("");
      setStartsOn("");
      setEndsOn("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add stop");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="graphs-trips-detail" data-testid="trip-detail">
      <header className="graphs-trips-detail-top">
        <button type="button" className="btn ghost" data-testid="trip-detail-back" onClick={onBack}>
          Back
        </button>
      </header>
      <h2 className="graphs-card-title" data-testid="trip-detail-title">
        {trip.title}
      </h2>
      <p className="graphs-card-place" data-testid="trip-detail-meta">
        {metaLine(trip)}
      </p>
      <div className="graphs-trips-avatars graphs-trips-avatars-detail">
        {(trip.participants || []).map((p) => (
          <span key={p.user_id} className="gsh-avatar-fallback graphs-trips-avatar">
            {people[p.user_id]?.initial || "?"}
          </span>
        ))}
      </div>

      <ul className="graphs-trips-legs" data-testid="trip-legs">
        {legs.map((leg: TripLeg) => (
          <li
            key={leg.id}
            className="graphs-trips-leg-row"
            data-testid={`trip-leg-${leg.id}`}
            data-position={leg.position}
          >
            <span className="graphs-trips-leg-icon" data-leg-type={leg.leg_type}>
              <LegTypeIcon type={leg.leg_type} />
            </span>
            <div className="graphs-trips-leg-body">
              <strong className="graphs-trips-leg-place">{leg.place_label}</strong>
              {leg.starts_on || leg.ends_on ? (
                <span className="graphs-card-place">
                  {formatDateRange(leg.starts_on, leg.ends_on)}
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {!adding ? (
        <button
          type="button"
          className="btn graphs-trips-add-stop"
          data-testid="trip-add-stop"
          onClick={() => setAdding(true)}
        >
          + Add stop
        </button>
      ) : (
        <form className="graphs-trips-add-form" data-testid="trip-add-stop-form" onSubmit={submitStop}>
          <label className="graphs-trips-field">
            <span className="graphs-card-place">Place</span>
            <input
              className="graphs-trips-input"
              value={placeLabel}
              onChange={(e) => setPlaceLabel(e.target.value)}
              placeholder="Where"
              required
              data-testid="trip-add-place"
            />
          </label>
          <label className="graphs-trips-field">
            <span className="graphs-card-place">Type</span>
            <select
              className="graphs-trips-input"
              value={legType}
              onChange={(e) => setLegType(e.target.value)}
              data-testid="trip-add-type"
            >
              <option value="activity">Activity</option>
              <option value="lodging">Lodging</option>
              <option value="transit">Transit</option>
              <option value="meal">Meal</option>
            </select>
          </label>
          <div className="graphs-trips-field-row">
            <label className="graphs-trips-field">
              <span className="graphs-card-place">Starts</span>
              <input
                className="graphs-trips-input"
                type="date"
                value={startsOn}
                onChange={(e) => setStartsOn(e.target.value)}
                data-testid="trip-add-starts"
              />
            </label>
            <label className="graphs-trips-field">
              <span className="graphs-card-place">Ends</span>
              <input
                className="graphs-trips-input"
                type="date"
                value={endsOn}
                onChange={(e) => setEndsOn(e.target.value)}
                data-testid="trip-add-ends"
              />
            </label>
          </div>
          {error ? <p className="graphs-card-place">{error}</p> : null}
          <div className="graphs-trips-form-actions">
            <button type="button" className="btn ghost" onClick={() => setAdding(false)}>
              Cancel
            </button>
            <button type="submit" className="btn" disabled={busy} data-testid="trip-add-submit">
              {busy ? "Adding…" : "Add stop"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function TripCreateFlow({
  people,
  whoPeople,
  onClose,
  onCreated,
  bearer,
}: {
  people: PersonDir;
  whoPeople: WhoPerson[];
  onClose: () => void;
  onCreated: (trip: Trip) => void;
  bearer?: string;
}) {
  const [step, setStep] = useState<"form" | "who">("form");
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [together, setTogether] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await createTrip(
        {
          title: title.trim(),
          destination_label: destination.trim() || undefined,
          starts_on: startsOn || undefined,
          ends_on: endsOn || undefined,
          user_ids: selectedIds,
        },
        bearer,
      );
      onCreated(res.trip);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create trip");
    } finally {
      setBusy(false);
    }
  }

  if (step === "who") {
    return (
      <GraphWhoPicker
        people={whoPeople}
        selectedIds={selectedIds}
        together={together}
        onToggle={(id) =>
          setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
          )
        }
        onTogetherChange={setTogether}
        onContinue={() => setStep("form")}
        onClose={onClose}
        title="Who’s coming?"
        body="Invite people into this trip."
        mode="add"
      />
    );
  }

  return (
    <div className="graphs-trips-create" data-testid="trip-create-flow" role="dialog" aria-modal="true">
      <header className="graphs-trips-detail-top">
        <button type="button" className="btn ghost" onClick={onClose}>
          Close
        </button>
        <h2 className="graphs-card-title">New trip</h2>
      </header>
      <label className="graphs-trips-field">
        <span className="graphs-card-place">Title</span>
        <input
          className="graphs-trips-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Big Sur weekend"
          data-testid="trip-create-title"
          required
        />
      </label>
      <label className="graphs-trips-field">
        <span className="graphs-card-place">Destination</span>
        <input
          className="graphs-trips-input"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Big Sur"
          data-testid="trip-create-destination"
        />
      </label>
      <div className="graphs-trips-field-row">
        <label className="graphs-trips-field">
          <span className="graphs-card-place">Starts</span>
          <input
            className="graphs-trips-input"
            type="date"
            value={startsOn}
            onChange={(e) => setStartsOn(e.target.value)}
            data-testid="trip-create-starts"
          />
        </label>
        <label className="graphs-trips-field">
          <span className="graphs-card-place">Ends</span>
          <input
            className="graphs-trips-input"
            type="date"
            value={endsOn}
            onChange={(e) => setEndsOn(e.target.value)}
            data-testid="trip-create-ends"
          />
        </label>
      </div>
      <button
        type="button"
        className="btn ghost"
        data-testid="trip-create-people"
        onClick={() => setStep("who")}
      >
        People{selectedIds.length ? ` · ${selectedIds.length}` : ""}
      </button>
      {selectedIds.length ? (
        <div className="graphs-trips-avatars">
          {selectedIds.map((id) => (
            <span key={id} className="gsh-avatar-fallback graphs-trips-avatar">
              {people[id]?.initial || "?"}
            </span>
          ))}
        </div>
      ) : null}
      {error ? <p className="graphs-card-place">{error}</p> : null}
      <button
        type="button"
        className="btn"
        disabled={busy}
        data-testid="trip-create-submit"
        onClick={() => void submit()}
      >
        {busy ? "Creating…" : "Create trip"}
      </button>
    </div>
  );
}

export function GraphsTripsSection({ bearer }: Props) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [people, setPeople] = useState<PersonDir>({});
  const [whoPeople, setWhoPeople] = useState<WhoPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tripRes, convRes] = await Promise.all([
        listTrips(bearer),
        listConversations(bearer).catch(() => ({ conversations: [] as never[] })),
      ]);
      setTrips(tripRes.trips || []);
      const dir: PersonDir = {};
      const who: WhoPerson[] = [];
      const seen = new Set<string>();
      for (const c of convRes.conversations || []) {
        for (const p of c.peers || []) {
          if (!p?.id || seen.has(p.id)) continue;
          seen.add(p.id);
          const name = p.display_name || p.handle || "Friend";
          const initial = name.trim().charAt(0).toUpperCase() || "?";
          dir[p.id] = { name, initial };
          who.push({ id: p.id, name, initial });
        }
      }
      setPeople(dir);
      setWhoPeople(who);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load trips");
    } finally {
      setLoading(false);
    }
  }, [bearer]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openTrip(id: string) {
    try {
      const res = await getTrip(id, bearer);
      setSelectedTrip(res.trip);
    } catch {
      const cached = trips.find((t) => t.id === id) || null;
      setSelectedTrip(cached);
    }
  }

  return (
    <section className="graphs-trips" data-testid="graphs-trips-section" aria-label="Trips">
      {selectedTrip ? (
        <div className="graphs-trips-overlay" data-testid="trip-detail-overlay">
          <TripDetail
            trip={selectedTrip}
            people={people}
            bearer={bearer}
            onBack={() => {
              setSelectedTrip(null);
              void load();
            }}
            onRefresh={(t) => {
              setSelectedTrip(t);
              setTrips((prev) => prev.map((x) => (x.id === t.id ? t : x)));
            }}
          />
        </div>
      ) : null}
      {creating ? (
        <div className="graphs-trips-overlay" data-testid="trip-create-overlay">
          <TripCreateFlow
            people={people}
            whoPeople={whoPeople}
            bearer={bearer}
            onClose={() => setCreating(false)}
            onCreated={(trip) => {
              setCreating(false);
              setTrips((prev) => [trip, ...prev]);
              setSelectedTrip(trip);
            }}
          />
        </div>
      ) : null}
      <div className="graphs-trips-head">
        <h2 className="graphs-trips-label">Trips</h2>
        <button
          type="button"
          className="btn ghost graphs-trips-new"
          data-testid="trip-new"
          onClick={() => setCreating(true)}
        >
          New trip
        </button>
      </div>

      {loading ? (
        <div className="graphs-trips-strip" data-testid="graphs-trips-loading" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="graphs-home-card graphs-trips-card graphs-trips-skeleton" />
          ))}
        </div>
      ) : error ? (
        <div className="graphs-trips-empty" data-testid="graphs-trips-error">
          <p className="graphs-card-place">{error}</p>
          <button type="button" className="btn ghost" onClick={() => void load()}>
            Retry
          </button>
        </div>
      ) : !trips.length ? (
        <div className="graphs-trips-empty" data-testid="graphs-trips-empty">
          <p className="graphs-card-place">No trips yet — plan one together.</p>
          <button
            type="button"
            className="btn"
            data-testid="trip-empty-new"
            onClick={() => setCreating(true)}
          >
            New trip
          </button>
        </div>
      ) : (
        <div className="graphs-trips-strip gsh-pulse" data-testid="graphs-trips-strip">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} people={people} onOpen={(id) => void openTrip(id)} />
          ))}
        </div>
      )}
    </section>
  );
}
