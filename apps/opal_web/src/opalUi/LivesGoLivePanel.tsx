import React, { useEffect, useState } from "react";
import {
  getLivesGoLiveCopy,
  getLivesStickerCatalog,
  postLivesGoLive,
  searchLivesVenues,
  type LivesGoLiveCopy,
} from "../api/productClient";

type VenueCandidate = {
  place_id?: string;
  name?: string;
  formatted_address?: string;
};

/**
 * Paste K — go-live requires venue confirmation (no skip).
 * Under ?opal_lives=1 only: if Places search is empty/unavailable,
 * offer "Enter venue manually (testing)" → provisional test-<slug> venue.
 */
export function LivesGoLivePanel() {
  const testingSurface =
    typeof window !== "undefined" &&
    new URL(window.location.href).searchParams.get("opal_lives") === "1";

  const [copy, setCopy] = useState<LivesGoLiveCopy | null>(null);
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<VenueCandidate[]>([]);
  const [selected, setSelected] = useState<VenueCandidate | null>(null);
  const [searchBlocked, setSearchBlocked] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualCity, setManualCity] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consequence, setConsequence] = useState<string | null>(null);
  const [liveResult, setLiveResult] = useState<Record<string, unknown> | null>(null);
  const [stickerHonesty, setStickerHonesty] = useState(
    "Stickers use test credits for now.",
  );

  useEffect(() => {
    void (async () => {
      try {
        const [c, catalog] = await Promise.all([
          getLivesGoLiveCopy(),
          getLivesStickerCatalog(),
        ]);
        setCopy(c);
        if (catalog?.honesty) setStickerHonesty(catalog.honesty);
      } catch {
        setCopy({
          step: 1,
          prompt: "Where are you?",
          required: true,
          skip_allowed: false,
          default: null,
          trade:
            "Confirmed venues get discovered on the heat map — that's how your people (and new fans) find you.",
          consequence_template: "Anyone can see you're at [venue].",
          reject_free_text: "we couldn't find that venue — try searching",
          residential_reject: "lives happen at venues",
        });
      }
    })();
  }, []);

  async function onSearch() {
    setError(null);
    setConsequence(null);
    setLiveResult(null);
    setSelected(null);
    setSearching(true);
    const q = query.trim();
    if (!q) {
      setSearching(false);
      setError("Where are you?");
      return;
    }
    try {
      const res = await searchLivesVenues(q);
      const list = Array.isArray(res.candidates) ? res.candidates : [];
      setCandidates(list);
      const blocked = Boolean(res.places_unavailable) || Boolean(res.empty) || list.length === 0;
      setSearchBlocked(blocked);
      if (blocked && testingSurface) {
        setManualOpen(true);
      }
      if (blocked && !testingSurface) {
        setError(res.message || "we couldn't find that venue — try searching");
      }
    } catch (e) {
      setCandidates([]);
      setSearchBlocked(true);
      if (testingSurface) {
        setManualOpen(true);
      } else {
        setError(e instanceof Error ? e.message : "Venue search failed");
      }
    } finally {
      setSearching(false);
    }
  }

  async function onGoLivePlaces() {
    setError(null);
    setConsequence(null);
    if (!selected?.place_id) {
      setError("Confirm a venue from search results");
      return;
    }
    try {
      const res = await postLivesGoLive({
        place_id: selected.place_id,
        name: selected.name,
        address: selected.formatted_address,
      });
      if ((res as { error?: string }).error) {
        setError(
          (res as { message?: string; error?: string }).message ||
            (res as { error?: string }).error ||
            "Could not go live",
        );
        return;
      }
      setConsequence(res.consequence);
      setLiveResult(res as unknown as Record<string, unknown>);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not go live");
    }
  }

  async function onGoLiveManual() {
    setError(null);
    setConsequence(null);
    const name = manualName.trim();
    const city = manualCity.trim();
    if (!name || !city) {
      setError("Enter venue name and city");
      return;
    }
    if (!testingSurface) {
      setError("Manual venues are testing-only");
      return;
    }
    try {
      const res = await postLivesGoLive({
        provisional: true,
        allow_provisional: true,
        venue_name: name,
        city,
      });
      if ((res as { error?: string }).error) {
        setError(
          (res as { message?: string; error?: string }).message ||
            (res as { error?: string }).error ||
            "Could not go live",
        );
        return;
      }
      setConsequence(res.consequence);
      setLiveResult(res as unknown as Record<string, unknown>);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not go live");
    }
  }

  const testBadge =
    (liveResult?.test_venue_badge as string | undefined) ||
    (liveResult?.test_only ? "TEST VENUE" : null);

  return (
    <section className="lives-go-live" data-testid="lives-go-live-panel">
      <h2 data-testid="lives-go-live-prompt">{copy?.prompt || "Where are you?"}</h2>
      <p className="lives-go-live-trade" data-testid="lives-go-live-trade">
        {copy?.trade}
      </p>

      <label htmlFor="lives-venue-search">Search venue</label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          id="lives-venue-search"
          data-testid="lives-venue-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search and confirm a venue"
          autoComplete="off"
          style={{ flex: 1, minWidth: 180 }}
        />
        <button
          type="button"
          data-testid="lives-venue-search-submit"
          onClick={() => void onSearch()}
          disabled={searching}
        >
          {searching ? "Searching…" : "Search"}
        </button>
      </div>

      {/* Keep place_id test hook for vitest / direct confirm */}
      <input
        type="hidden"
        data-testid="lives-place-id"
        value={selected?.place_id || ""}
        readOnly
      />

      {candidates.length > 0 ? (
        <ul data-testid="lives-venue-candidates" style={{ listStyle: "none", padding: 0 }}>
          {candidates.map((c) => (
            <li key={c.place_id || c.name}>
              <button
                type="button"
                data-testid={`lives-venue-candidate-${c.place_id}`}
                onClick={() => {
                  setSelected(c);
                  setManualOpen(false);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  marginTop: 6,
                  fontWeight: selected?.place_id === c.place_id ? 700 : 400,
                }}
              >
                {c.name}
                {c.formatted_address ? ` — ${c.formatted_address}` : ""}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {selected?.place_id ? (
        <button
          type="button"
          data-testid="lives-go-live-submit"
          onClick={() => void onGoLivePlaces()}
          style={{ marginTop: 12 }}
        >
          Go live at {selected.name}
        </button>
      ) : null}

      {searchBlocked && testingSurface ? (
        <div data-testid="lives-manual-testing" style={{ marginTop: 16 }}>
          <button
            type="button"
            data-testid="lives-manual-testing-toggle"
            onClick={() => setManualOpen((v) => !v)}
          >
            Enter venue manually (testing)
          </button>
          {manualOpen ? (
            <div data-testid="lives-manual-form" style={{ marginTop: 8 }}>
              <p data-testid="lives-manual-disclaimer">
                Creates a provisional TEST VENUE (quarantine; stickers disabled).
                Not a real Places venue.
              </p>
              <label htmlFor="lives-manual-name">Venue name</label>
              <input
                id="lives-manual-name"
                data-testid="lives-manual-name"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Rooftop Bar"
                autoComplete="off"
              />
              <label htmlFor="lives-manual-city">City</label>
              <input
                id="lives-manual-city"
                data-testid="lives-manual-city"
                value={manualCity}
                onChange={(e) => setManualCity(e.target.value)}
                placeholder="San Diego"
                autoComplete="off"
              />
              <button
                type="button"
                data-testid="lives-go-live-manual"
                onClick={() => void onGoLiveManual()}
                style={{ marginTop: 8 }}
              >
                Confirm TEST VENUE & go live
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <p className="lives-go-live-note" data-testid="lives-no-skip">
        Venue confirmation is required — there is no skip.
      </p>

      {error ? (
        <p data-testid="lives-go-live-error" role="alert">
          {error}
        </p>
      ) : null}
      {consequence ? (
        <p data-testid="lives-go-live-consequence">{consequence}</p>
      ) : null}
      {testBadge ? (
        <p data-testid="lives-test-venue-badge" style={{ fontWeight: 700 }}>
          {testBadge}
        </p>
      ) : null}
      {liveResult ? (
        <p data-testid="lives-go-live-success">Live started</p>
      ) : null}

      <p data-testid="lives-sticker-honesty" className="lives-sticker-honesty">
        {stickerHonesty}
      </p>
      <p data-testid="lives-anti-mercenary" className="lives-anti-mercenary">
        Stickers are celebratory, never required. A live with zero stickers is
        complete.
      </p>
    </section>
  );
}

export default LivesGoLivePanel;
