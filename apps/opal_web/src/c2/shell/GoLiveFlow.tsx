import React, { useEffect, useRef, useState } from "react";
import { TopLayer } from "../../opalUi/TopLayer";
import {
  getLivesGoLiveCopy,
  postLivesGoLive,
  searchLivesVenues,
  type LivesGoLiveCopy,
} from "../../api/productClient";
import { IconClose, IconSearch } from "./bits";

/**
 * Repair #21 (W-17) - GO LIVE, the creation sheet's live door.
 *
 * One move deep, real machinery only: the surface's words are
 * the server's own (GET /lives/go-live-copy - its prompt, its
 * consequence template, its audience set), the place step is
 * the real venue search (GET /lives/venue-search), and going
 * live is the real POST /lives/go-live. Nothing is painted
 * that the endpoints do not carry:
 *
 * - Venue search is Places-backed. When the server answers
 *   places_unavailable, the surface shows the server's own
 *   message and offers the manual entry ONLY when the server
 *   offers it (manual_testing_available, with the server's
 *   label). Free-text venues are otherwise rejected by the
 *   product's design (the copy's reject_free_text), so no
 *   free-text path is painted.
 * - A manual venue goes live as a provisional venue
 *   (allow_provisional) - the server's own testing lane, and
 *   it says so in its response (test venue badge), never
 *   silently as a clean venue.
 * - On success the surface closes and the shell re-reads:
 *   your live stands in Flows (the happening strip's "Your
 *   live" card + your presence light) because the server's
 *   visible-lives read says so.
 */

type VenuePick = {
  placeId?: string;
  name: string;
  address?: string;
  manual?: boolean;
  city?: string;
};

export function GoLiveFlow({
  bearer,
  onClose,
  onLive,
}: {
  bearer?: string;
  onClose: () => void;
  onLive: () => void;
}) {
  const [copy, setCopy] = useState<LivesGoLiveCopy | null>(null);
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<VenuePick[]>([]);
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const [manualLabel, setManualLabel] = useState<string | null>(null);
  const [manualName, setManualName] = useState("");
  const [manualCity, setManualCity] = useState("");
  const [pick, setPick] = useState<VenuePick | null>(null);
  const [audience, setAudience] = useState<"friends" | "close_circle">("friends");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchSeq = useRef(0);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const c = await getLivesGoLiveCopy(bearer);
        if (live) setCopy(c);
      } catch {
        /* the prompt has a lawful default below */
      }
    })();
    return () => {
      live = false;
    };
  }, [bearer]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setCandidates([]);
      return;
    }
    const seq = ++searchSeq.current;
    const t = setTimeout(() => {
      void (async () => {
        try {
          const res = await searchLivesVenues(q, bearer);
          if (searchSeq.current !== seq) return;
          if (res.places_unavailable) {
            setCandidates([]);
            setUnavailable(res.message ?? "Venue search is unavailable.");
            setManualLabel(
              res.manual_testing_available
                ? res.manual_testing_label ?? "Enter venue manually (testing)"
                : null,
            );
            return;
          }
          setUnavailable(null);
          setManualLabel(null);
          setCandidates(
            (res.candidates ?? []).map((c) => ({
              placeId: c.place_id,
              name: c.name ?? "",
              address: c.formatted_address,
            })).filter((c) => c.name),
          );
        } catch {
          if (searchSeq.current === seq) {
            setCandidates([]);
            setUnavailable("Venue search is unavailable.");
            setManualLabel(null);
          }
        }
      })();
    }, 350);
    return () => clearTimeout(t);
  }, [query, bearer]);

  const goLive = async () => {
    if (!pick || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await postLivesGoLive(
        pick.manual
          ? {
              venue_name: pick.name,
              name: pick.name,
              city: pick.city,
              provisional: true,
              allow_provisional: true,
              audience,
            }
          : {
              place_id: pick.placeId,
              name: pick.name,
              venue_name: pick.name,
              audience,
            },
        bearer,
      );
      if (res.live_room) {
        onLive();
        return;
      }
      setBusy(false);
      setError(res.message ?? res.error ?? "That did not start. Try again.");
    } catch {
      setBusy(false);
      setError("That did not start. Try again.");
    }
  };

  const prompt = copy?.prompt ?? "Where are you?";
  const consequence = pick
    ? (copy?.consequence_template ?? "Anyone can see you're at [venue].").replace(
        "[venue]",
        pick.name,
      )
    : null;
  const audiences: Array<{ id: "friends" | "close_circle"; label: string }> = [
    { id: "friends", label: "Friends" },
    { id: "close_circle", label: "Close circle" },
  ];

  return (
    <TopLayer band="flow">
      <div className="c2s-flow c2s-go-live" data-testid="c2-go-live">
        <div className="c2s-entry-top">
          <button
            type="button"
            className="c2s-icon-btn"
            aria-label="Close"
            data-testid="c2-go-live-close"
            onClick={onClose}
          >
            <IconClose />
          </button>
          <span style={{ fontWeight: 650 }}>Go live</span>
          <span style={{ width: 44 }} />
        </div>
        <div className="c2s-entry-body">
          <h1>{prompt}</h1>
          <div className="c2s-go-live-search">
            <IconSearch />
            <input
              className="c2s-field"
              data-testid="c2-go-live-search"
              placeholder="Search venues"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPick(null);
              }}
              aria-label="Search venues"
            />
          </div>
          {candidates.length > 0 ? (
            <div className="c2s-go-live-results">
              {candidates.map((c) => (
                <button
                  key={(c.placeId ?? c.name) + c.name}
                  type="button"
                  className="c2s-sheet-row"
                  data-testid="c2-go-live-venue"
                  onClick={() => setPick(c)}
                >
                  <span>
                    {c.name}
                    {c.address ? <small>{c.address}</small> : null}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
          {unavailable ? (
            <>
              <p className="c2s-caption" data-testid="c2-go-live-unavailable">
                {unavailable}
              </p>
              {manualLabel ? (
                <div className="c2s-field-group">
                  <label className="c2s-field-label" htmlFor="c2-go-live-manual-input">
                    {manualLabel}
                  </label>
                  {/* The server's manual rule: a venue is a name
                      AND a city (name_and_city_required) - both
                      fields, or the pick is not armed. */}
                  <input
                    id="c2-go-live-manual-input"
                    className="c2s-field"
                    data-testid="c2-go-live-manual"
                    placeholder="Venue name"
                    value={manualName}
                    onChange={(e) => {
                      const name = e.target.value;
                      setManualName(name);
                      const city = manualCity.trim();
                      setPick(
                        name.trim() && city
                          ? { name: name.trim(), city, manual: true }
                          : null,
                      );
                    }}
                  />
                  <input
                    className="c2s-field"
                    data-testid="c2-go-live-manual-city"
                    placeholder="City"
                    value={manualCity}
                    onChange={(e) => {
                      const city = e.target.value;
                      setManualCity(city);
                      const name = manualName.trim();
                      setPick(
                        name && city.trim()
                          ? { name, city: city.trim(), manual: true }
                          : null,
                      );
                    }}
                  />
                </div>
              ) : null}
            </>
          ) : null}
          {pick ? (
            <>
              <p className="c2s-card-line" data-testid="c2-go-live-consequence">
                {consequence}
              </p>
              <div className="c2s-seg" role="group" aria-label="Audience">
                {audiences.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className="c2s-seg-btn"
                    data-testid={`c2-go-live-audience-${a.id}`}
                    aria-pressed={audience === a.id}
                    onClick={() => setAudience(a.id)}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
              {error ? (
                <p className="c2s-error-line" role="alert">
                  {error}
                </p>
              ) : null}
              <button
                type="button"
                className="c2s-btn-primary"
                data-testid="c2-go-live-submit"
                disabled={busy}
                onClick={() => void goLive()}
              >
                {busy ? "Starting" : "Go live"}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </TopLayer>
  );
}
