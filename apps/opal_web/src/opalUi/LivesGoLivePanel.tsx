import React, { useEffect, useState } from "react";
import {
  getLivesGoLiveCopy,
  getLivesStickerCatalog,
  postLivesGoLive,
  type LivesGoLiveCopy,
} from "../api/productClient";

/**
 * Paste K — go-live requires Places-validated place_id (no skip).
 * Stickers honesty copy is always visible while test-mode is default.
 */
export function LivesGoLivePanel() {
  const [copy, setCopy] = useState<LivesGoLiveCopy | null>(null);
  const [placeId, setPlaceId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [consequence, setConsequence] = useState<string | null>(null);
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

  async function onGoLive() {
    setError(null);
    setConsequence(null);
    const trimmed = placeId.trim();
    if (!trimmed) {
      setError("Where are you?");
      return;
    }
    try {
      const res = await postLivesGoLive({ place_id: trimmed });
      if ((res as { error?: string }).error) {
        setError(
          (res as { message?: string; error?: string }).message ||
            (res as { error?: string }).error ||
            "Could not go live",
        );
        return;
      }
      setConsequence(res.consequence);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not go live");
    }
  }

  return (
    <section className="lives-go-live" data-testid="lives-go-live-panel">
      <h2 data-testid="lives-go-live-prompt">{copy?.prompt || "Where are you?"}</h2>
      <p className="lives-go-live-trade" data-testid="lives-go-live-trade">
        {copy?.trade}
      </p>
      <label htmlFor="lives-place-id">Venue (Places place_id)</label>
      <input
        id="lives-place-id"
        data-testid="lives-place-id"
        value={placeId}
        onChange={(e) => setPlaceId(e.target.value)}
        placeholder="Search and confirm a venue"
        autoComplete="off"
      />
      <p className="lives-go-live-note" data-testid="lives-no-skip">
        Venue confirmation is required — there is no skip.
      </p>
      <button
        type="button"
        data-testid="lives-go-live-submit"
        onClick={() => void onGoLive()}
      >
        Go live
      </button>
      {error ? (
        <p data-testid="lives-go-live-error" role="alert">
          {error}
        </p>
      ) : null}
      {consequence ? (
        <p data-testid="lives-go-live-consequence">{consequence}</p>
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
