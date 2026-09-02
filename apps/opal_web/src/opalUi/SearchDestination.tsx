/**
 * SEARCH — CURRENT destination authority 618:2299
 * People / Places / Experiences / Graphs — distinct result classes.
 * Places & Experiences route to CURRENT Graph Reality owners when entity IDs exist.
 * Do not invent VenueDetail / PlaceProfile. Do not soft-hint substitute for navigation.
 */
import React, { useMemo } from "react";
import { OpalMark, OpalWordmark } from "../brand/OpalLogo";
import { FOUNDER_HOME_FEED } from "./founderGraphSeed";

/** Modes preserved: Top + People / Places / Experiences / Graphs */
const PILLS = ["Top", "People", "Places", "Experiences", "Graphs"] as const;
export type SearchPill = (typeof PILLS)[number];

export type SearchPersonResult = {
  result_type: "people";
  name: string;
  meta: string;
  source_entity_id: string;
};

export type SearchPlaceResult = {
  result_type: "places";
  name: string;
  meta: string;
  source_entity_id: string;
  /** Exact Graph Reality when CURRENT authority owns one — never invent a Place page */
  graph_id: string | null;
  authority_status: "GREEN" | "MISSING_CURRENT_AUTHORITY";
};

export type SearchExperienceResult = {
  result_type: "experiences";
  name: string;
  meta: string;
  source_entity_id: string;
  graph_id: string | null;
  authority_status: "GREEN" | "MISSING_CURRENT_AUTHORITY";
};

export type SearchGraphResult = {
  result_type: "graphs";
  name: string;
  meta: string;
  source_entity_id: string;
  graph_id: string;
};

type Props = {
  onBack: () => void;
  onOpenPerson?: (name: string, entityId: string) => void;
  /** Place/Experience/Graph → exact Graph Reality when authorized */
  onOpenGraphReality?: (graphId: string, visibleName: string) => void;
  initialMode?: SearchPill;
  searchContext?: "default" | "people" | "add_members";
  /** Controlled query — parent preserves across Profile round-trip */
  query?: string;
  onQueryChange?: (q: string) => void;
  /** Controlled pill — parent preserves category */
  mode?: SearchPill;
  onModeChange?: (mode: SearchPill) => void;
};

const PEOPLE: SearchPersonResult[] = [
  {
    result_type: "people",
    name: "Chanelle",
    meta: "Connection · dating",
    source_entity_id: "person-chanelle",
  },
  {
    result_type: "people",
    name: "Maya",
    meta: "Connection · friend",
    source_entity_id: "person-maya",
  },
  {
    result_type: "people",
    name: "Nina",
    meta: "Suggested · nearby creator",
    source_entity_id: "person-nina",
  },
];

/** Places with CURRENT Graph Reality owners (founder fixture / Home feed). */
const PLACES: SearchPlaceResult[] = [
  {
    result_type: "places",
    name: "Juniper & Ivy",
    meta: "San Diego · restaurant",
    source_entity_id: "place-juniper-ivy",
    graph_id: "seed-chanelle-juniper",
    authority_status: "GREEN",
  },
];

/** Experiences with CURRENT Graph / Live Reality owners. */
const EXPERIENCES: SearchExperienceResult[] = [
  {
    result_type: "experiences",
    name: "Rooftop Jazz",
    meta: "9 min away · tonight",
    source_entity_id: "experience-rooftop-jazz",
    graph_id: "seed-near-rooftop",
    authority_status: "GREEN",
  },
  {
    result_type: "experiences",
    name: "Oceanside Farmers Market",
    meta: "Saturday · local",
    source_entity_id: "experience-oceanside-farmers",
    graph_id: "seed-jordan-market",
    authority_status: "GREEN",
  },
];

function graphResultsFromSeed(): SearchGraphResult[] {
  return FOUNDER_HOME_FEED.filter((c) => c.kind === "graph")
    .slice(0, 8)
    .map((c) => ({
      result_type: "graphs" as const,
      name: c.title,
      meta: [c.person, c.detail || c.when].filter(Boolean).join(" · "),
      source_entity_id: c.id,
      graph_id: c.id,
    }));
}

export function SearchDestination({
  onBack,
  onOpenPerson,
  onOpenGraphReality,
  initialMode = "Top",
  searchContext = "default",
  query,
  onQueryChange,
  mode,
  onModeChange,
}: Props) {
  const [localQ, setLocalQ] = React.useState("");
  const [localPill, setLocalPill] = React.useState<SearchPill>(initialMode);
  const q = query !== undefined ? query : localQ;
  const setQ = (v: string) => {
    if (onQueryChange) onQueryChange(v);
    else setLocalQ(v);
  };
  const pill = mode !== undefined ? mode : localPill;
  const setPill = (v: SearchPill) => {
    if (onModeChange) onModeChange(v);
    else setLocalPill(v);
  };

  const graphs = useMemo(() => graphResultsFromSeed(), []);

  const people = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return PEOPLE;
    return PEOPLE.filter((p) => p.name.toLowerCase().includes(s));
  }, [q]);

  const places = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return PLACES;
    return PLACES.filter(
      (p) => p.name.toLowerCase().includes(s) || p.meta.toLowerCase().includes(s),
    );
  }, [q]);

  const experiences = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return EXPERIENCES;
    return EXPERIENCES.filter(
      (p) => p.name.toLowerCase().includes(s) || p.meta.toLowerCase().includes(s),
    );
  }, [q]);

  const filteredGraphs = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return graphs;
    return graphs.filter(
      (g) => g.name.toLowerCase().includes(s) || g.meta.toLowerCase().includes(s),
    );
  }, [q, graphs]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  const showPeople = pill === "Top" || pill === "People";
  const showPlaces = pill === "Top" || pill === "Places";
  const showExperiences = pill === "Top" || pill === "Experiences";
  const showGraphs = pill === "Top" || pill === "Graphs";

  function renderNavigableRow(opts: {
    testId: string;
    name: string;
    meta: string;
    avatar?: string;
    onNavigate: () => void;
  }) {
    return (
      <button
        type="button"
        className="search-result"
        data-testid={opts.testId}
        data-affordance="navigate"
        onClick={opts.onNavigate}
      >
        <span className="search-result-row">
          {opts.avatar !== undefined ? (
            <span className="search-result-avatar" aria-hidden>
              {opts.avatar}
            </span>
          ) : null}
          <span className="search-result-copy">
            <strong>{opts.name}</strong>
            <span>{opts.meta}</span>
          </span>
          <span className="search-result-chevron" aria-hidden>
            ›
          </span>
        </span>
      </button>
    );
  }

  function renderMissingAuthorityRow(opts: {
    testId: string;
    name: string;
    meta: string;
  }) {
    return (
      <div
        className="search-result search-result-info"
        data-testid={opts.testId}
        data-affordance="info"
        data-authority="MISSING_CURRENT_AUTHORITY"
        role="status"
      >
        <span className="search-result-row">
          <span className="search-result-copy">
            <strong>{opts.name}</strong>
            <span>{opts.meta}</span>
            <span className="search-result-authority-note">
              No CURRENT destination authority
            </span>
          </span>
        </span>
      </div>
    );
  }

  return (
    <div
      className="search-dest-373-261"
      data-testid="search-destination"
      data-figma-node="618:2299"
      data-legacy-figma-node="373:261"
      data-screen="search-00"
      data-presentation="full-column"
      data-search-mode={pill.toLowerCase()}
      data-search-context={searchContext}
      data-search-query={q}
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <div className="search-brand-row">
        <button
          type="button"
          className="opal-nav-chevron"
          data-testid="search-back"
          aria-label="Back"
          onClick={onBack}
        >
          ‹
        </button>
        <div className="gsh-brand" aria-hidden>
          <OpalMark size="sm" title="" />
          <OpalWordmark height={18} title="" compact />
        </div>
      </div>

      <h1 className="search-dest-title">Search</h1>
      <p className="search-dest-lede">People, places, experiences and Graphs</p>

      <div className="search-field-wrap">
        <span className="search-field-icon" aria-hidden />
        <input
          className="search-field"
          data-testid="search-field"
          placeholder="Search Opal Graph"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search Opal Graph"
        />
      </div>

      <div className="search-pills" role="tablist" aria-label="Search modes">
        {PILLS.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            className={`search-pill ${pill === p ? "is-on" : ""}`}
            aria-selected={pill === p}
            data-testid={`search-pill-${p.toLowerCase()}`}
            onClick={() => setPill(p)}
          >
            {p}
          </button>
        ))}
      </div>

      {showPeople ? (
        <>
          <p className="search-section-label">People</p>
          {people.map((p) => (
            <React.Fragment key={p.source_entity_id}>
              {renderNavigableRow({
                testId: `search-person-${p.name.toLowerCase()}`,
                name: p.name,
                meta: p.meta,
                avatar: p.name.slice(0, 1),
                onNavigate: () => onOpenPerson?.(p.name, p.source_entity_id),
              })}
            </React.Fragment>
          ))}
        </>
      ) : null}

      {showPlaces ? (
        <>
          <p className="search-section-label">Places</p>
          {places.map((p) => (
            <React.Fragment key={p.source_entity_id}>
              {p.graph_id && p.authority_status === "GREEN"
                ? renderNavigableRow({
                    testId: `search-place-${p.name.toLowerCase().replace(/\s+/g, "-")}`,
                    name: p.name,
                    meta: p.meta,
                    onNavigate: () => onOpenGraphReality?.(p.graph_id!, p.name),
                  })
                : renderMissingAuthorityRow({
                    testId: `search-place-${p.name.toLowerCase().replace(/\s+/g, "-")}`,
                    name: p.name,
                    meta: p.meta,
                  })}
            </React.Fragment>
          ))}
        </>
      ) : null}

      {showExperiences ? (
        <>
          <p className="search-section-label">Experiences</p>
          {experiences.map((p) => (
            <React.Fragment key={p.source_entity_id}>
              {p.graph_id && p.authority_status === "GREEN"
                ? renderNavigableRow({
                    testId: `search-experience-${p.name.toLowerCase().replace(/\s+/g, "-")}`,
                    name: p.name,
                    meta: p.meta,
                    onNavigate: () => onOpenGraphReality?.(p.graph_id!, p.name),
                  })
                : renderMissingAuthorityRow({
                    testId: `search-experience-${p.name.toLowerCase().replace(/\s+/g, "-")}`,
                    name: p.name,
                    meta: p.meta,
                  })}
            </React.Fragment>
          ))}
        </>
      ) : null}

      {showGraphs ? (
        <>
          <p className="search-section-label">Graphs</p>
          {filteredGraphs.length ? (
            filteredGraphs.map((g) => (
              <React.Fragment key={g.graph_id}>
                {renderNavigableRow({
                  testId: `search-graph-${g.graph_id}`,
                  name: g.name,
                  meta: g.meta,
                  onNavigate: () => onOpenGraphReality?.(g.graph_id, g.name),
                })}
              </React.Fragment>
            ))
          ) : (
            <p className="search-empty" data-testid="search-graphs-empty">
              No Graphs match.
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}
