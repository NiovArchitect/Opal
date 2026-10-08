/**
 * PersonMemoryView — "What Opal remembers" per person.
 * Entry: You hub People row + thread About / GroupInfo member affordance.
 * No bulk forget — founder decision Phase 2.3 (per-fact remove only).
 */
import React from "react";
import { BRAND } from "../../brand/brand";
import {
  deletePersonFact,
  fetchPersonMemory,
  patchPersonFact,
  type MemoryProvenance,
  type PersonMemoryFact,
  type PersonMemoryView as PersonMemoryData,
} from "../../api/intelligenceClient";

type Props = {
  personId: string;
  displayName?: string;
  bearer?: string;
  onBack: () => void;
  onOpenConversation?: (conversationId: string) => void;
};

function provenanceLabel(p: MemoryProvenance | string | null | undefined): string | null {
  if (!p) return null;
  if (p === "stated") return "You told Opal";
  if (p === "observed") return "Opal noticed";
  if (p === "inferred") return "Opal inferred";
  return String(p);
}

export function PersonMemoryView({
  personId,
  displayName,
  bearer,
  onBack,
  onOpenConversation,
}: Props) {
  const [data, setData] = React.useState<PersonMemoryData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [editingKey, setEditingKey] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState("");
  const [confirmRemoveKey, setConfirmRemoveKey] = React.useState<string | null>(
    null,
  );
  const [busyKey, setBusyKey] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchPersonMemory(personId, {
        bearer,
        displayName,
      });
      setData(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load memory");
    } finally {
      setLoading(false);
    }
  }, [personId, bearer, displayName]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  const onSaveFact = async (fact: PersonMemoryFact) => {
    if (busyKey) return;
    setBusyKey(fact.key);
    try {
      const updated = await patchPersonFact(personId, fact.key, editValue.trim(), {
        bearer,
      });
      setData((prev) =>
        prev
          ? {
              ...prev,
              known_facts: prev.known_facts.map((f) =>
                f.key === fact.key ? { ...f, ...updated } : f,
              ),
            }
          : prev,
      );
      setEditingKey(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update");
    } finally {
      setBusyKey(null);
    }
  };

  const onRemoveFact = async (key: string) => {
    if (busyKey) return;
    setBusyKey(key);
    try {
      await deletePersonFact(personId, key, { bearer });
      setData((prev) =>
        prev
          ? {
              ...prev,
              known_facts: prev.known_facts.filter((f) => f.key !== key),
            }
          : prev,
      );
      setConfirmRemoveKey(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove");
    } finally {
      setBusyKey(null);
    }
  };

  const name = data?.display_name || displayName || "Someone";
  const empty =
    data &&
    data.known_facts.length === 0 &&
    data.rhythms.length === 0 &&
    data.important_dates.length === 0 &&
    data.open_loops.length === 0 &&
    data.learned_preferences.length === 0;

  return (
    <div
      className="intelligence-person-memory"
      data-testid="person-memory-view"
      data-person-id={personId}
      role="dialog"
      aria-modal="true"
      aria-label={`What Opal remembers about ${name}`}
    >
      <header className="social-dest-brand" style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button
          type="button"
          className="opal-nav-chevron"
          data-testid="person-memory-back"
          aria-label="Back"
          onClick={onBack}
        >
          ‹
        </button>
      </header>

      <div
        className="intelligence-person-header"
        data-testid="person-memory-header"
      >
        <span
          className="group-info-avatar"
          aria-hidden
          style={{
            borderColor: BRAND.palette.opalCyan,
            color: BRAND.palette.opalCyan,
          }}
        >
          {name.slice(0, 1).toUpperCase()}
        </span>
        <h1 className="activity-dest-title" data-testid="person-memory-name">
          {name}
        </h1>
        {data?.relationship_type ? (
          <p
            className="activity-dest-lede"
            data-testid="person-memory-relationship"
          >
            {data.relationship_type.replace(/_/g, " ")}
          </p>
        ) : null}
        {data?.vibe_summary ? (
          <p
            className="activity-calm"
            data-testid="person-memory-vibe"
            style={{ color: BRAND.palette.electricAqua }}
          >
            {data.vibe_summary}
          </p>
        ) : null}
      </div>

      {loading ? (
        <p className="activity-empty" data-testid="person-memory-loading">
          Loading…
        </p>
      ) : null}
      {error ? (
        <p className="activity-empty" data-testid="person-memory-error" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && empty ? (
        <p className="you-memory-empty" data-testid="person-memory-empty">
          Opal doesn&apos;t know much about {name} yet. As you plan and talk,
          what matters will show up here — and you can correct anything.
        </p>
      ) : null}

      {!loading && data && !empty ? (
        <>
          <section
            className="intelligence-person-memory-section"
            data-testid="person-memory-knows"
            aria-labelledby="person-memory-knows-label"
          >
            <h3 id="person-memory-knows-label">Knows about you</h3>
            {/* No bulk forget — founder decision Phase 2.3: per-fact remove only. */}
            <div className="you-consent-rows" aria-live="polite">
              {data.known_facts.length === 0 ? (
                <p className="you-memory-empty">Nothing stored yet.</p>
              ) : (
                data.known_facts.map((fact) => (
                  <div
                    key={fact.key}
                    className="you-settings-row"
                    data-testid={`person-fact-${fact.key}`}
                    data-provenance={fact.provenance || undefined}
                  >
                    <div className="you-settings-row-copy">
                      <strong>{fact.key}</strong>
                      {editingKey === fact.key ? (
                        <input
                          data-testid={`person-fact-edit-${fact.key}`}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          aria-label={`Correct ${fact.key}`}
                        />
                      ) : (
                        <span>{fact.value}</span>
                      )}
                      {fact.source_note ? (
                        <span className="intelligence-provenance">
                          {fact.source_note}
                        </span>
                      ) : null}
                      {provenanceLabel(fact.provenance) ? (
                        <span
                          className="intelligence-provenance"
                          data-testid={`person-fact-provenance-${fact.key}`}
                        >
                          {provenanceLabel(fact.provenance)}
                        </span>
                      ) : null}
                    </div>
                    <div className="intelligence-reminder-actions">
                      {editingKey === fact.key ? (
                        <button
                          type="button"
                          className="intelligence-reminder-cta"
                          data-testid={`person-fact-save-${fact.key}`}
                          disabled={busyKey === fact.key}
                          style={{ color: BRAND.palette.electricAqua }}
                          onClick={() => void onSaveFact(fact)}
                        >
                          Save
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="intelligence-reminder-cta"
                          data-testid={`person-fact-correct-${fact.key}`}
                          style={{ color: BRAND.palette.electricAqua }}
                          onClick={() => {
                            setEditingKey(fact.key);
                            setEditValue(fact.value);
                            setConfirmRemoveKey(null);
                          }}
                        >
                          Correct
                        </button>
                      )}
                      {confirmRemoveKey === fact.key ? (
                        <button
                          type="button"
                          className="intelligence-reminder-dismiss"
                          data-testid={`person-fact-confirm-remove-${fact.key}`}
                          disabled={busyKey === fact.key}
                          onClick={() => void onRemoveFact(fact.key)}
                        >
                          Confirm remove
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="intelligence-reminder-dismiss"
                          data-testid={`person-fact-remove-${fact.key}`}
                          aria-label={`Remove ${fact.key}`}
                          onClick={() => {
                            setConfirmRemoveKey(fact.key);
                            setEditingKey(null);
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section
            className="intelligence-person-memory-section"
            data-testid="person-memory-rhythms"
          >
            <h3>Rhythms</h3>
            {data.rhythms.length === 0 ? (
              <p className="you-memory-empty">No rhythms yet.</p>
            ) : (
              data.rhythms.map((r, i) => (
                <div
                  key={`${r.label}-${i}`}
                  className="you-settings-row"
                  data-testid={`person-rhythm-${i}`}
                  data-provenance={r.provenance || undefined}
                >
                  <div className="you-settings-row-copy">
                    <strong>{r.label}</strong>
                    {r.streak_weeks != null ? (
                      <span>{r.streak_weeks} week streak</span>
                    ) : null}
                    {provenanceLabel(r.provenance) ? (
                      <span className="intelligence-provenance">
                        {provenanceLabel(r.provenance)}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </section>

          <section
            className="intelligence-person-memory-section"
            data-testid="person-memory-dates"
          >
            <h3>Important dates</h3>
            {data.important_dates.length === 0 ? (
              <p className="you-memory-empty">No dates yet.</p>
            ) : (
              data.important_dates.map((d) => (
                <div
                  key={d.anchor_id}
                  className="you-settings-row"
                  data-testid={`person-date-${d.anchor_id}`}
                >
                  <div className="you-settings-row-copy">
                    <strong>{d.anchor_type}</strong>
                    <span>
                      {d.date}
                      {d.lifecycle ? ` · ${d.lifecycle}` : ""}
                    </span>
                  </div>
                </div>
              ))
            )}
          </section>

          <section
            className="intelligence-person-memory-section"
            data-testid="person-memory-loops"
          >
            <h3>Open loops</h3>
            {data.open_loops.length === 0 ? (
              <p className="you-memory-empty">Nothing open.</p>
            ) : (
              data.open_loops.map((loop) => (
                <button
                  key={loop.id}
                  type="button"
                  className="you-settings-row you-settings-row-nav"
                  data-testid={`person-loop-${loop.id}`}
                  onClick={() =>
                    loop.conversation_id &&
                    onOpenConversation?.(loop.conversation_id)
                  }
                >
                  <div className="you-settings-row-copy">
                    <strong>{loop.summary}</strong>
                  </div>
                </button>
              ))
            )}
          </section>

          <section
            className="intelligence-person-memory-section"
            data-testid="person-memory-learned"
          >
            <h3>What Opal has learned</h3>
            {data.learned_preferences.length === 0 ? (
              <p className="you-memory-empty">Still learning.</p>
            ) : (
              data.learned_preferences.map((learned, i) => (
                <div
                  key={i}
                  className="you-settings-row"
                  data-testid={`person-learned-${i}`}
                  data-provenance={learned.provenance || undefined}
                >
                  <div className="you-settings-row-copy">
                    <strong>{learned.summary}</strong>
                    {learned.evidence_count != null ? (
                      <span className="intelligence-provenance">
                        {learned.evidence_count} signals
                      </span>
                    ) : null}
                    {provenanceLabel(learned.provenance) ? (
                      <span className="intelligence-provenance">
                        {provenanceLabel(learned.provenance)}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
