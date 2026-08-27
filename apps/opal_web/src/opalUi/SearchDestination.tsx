/**
 * SEARCH-00 — PEOPLE / PLACES / EXPERIENCES / GRAPHS
 * Figma 373:261 — full mobile-column destination (not a modal sheet).
 * Owner: existing SearchDestination only — no second search system.
 */
import React, { useMemo, useState } from "react";
import { OpalMark, OpalWordmark } from "../brand/OpalLogo";

type Props = {
  onBack: () => void;
  onOpenPerson?: (name: string) => void;
  onOpenPlaceHint?: (place: string) => void;
};

const PEOPLE = [
  { name: "Chanelle", meta: "Connection · dating" },
  { name: "Maya", meta: "Connection · friend" },
  { name: "Nina", meta: "Suggested · nearby creator" },
];
const PLACES = [
  { name: "Juniper & Ivy", meta: "San Diego · restaurant" },
  { name: "Rooftop Jazz", meta: "9 min away · tonight" },
  { name: "Oceanside Farmers Market", meta: "Saturday · local" },
];

/** Modes preserved: Top + People / Places / Experiences / Graphs */
const PILLS = ["Top", "People", "Places", "Experiences", "Graphs"] as const;

export function SearchDestination({ onBack, onOpenPerson, onOpenPlaceHint }: Props) {
  const [q, setQ] = useState("");
  const [pill, setPill] = useState<(typeof PILLS)[number]>("Top");

  const people = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return PEOPLE;
    return PEOPLE.filter((p) => p.name.toLowerCase().includes(s));
  }, [q]);
  const places = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return PLACES;
    return PLACES.filter((p) => p.name.toLowerCase().includes(s) || p.meta.toLowerCase().includes(s));
  }, [q]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  const showPeople = pill === "Top" || pill === "People";
  const showPlaces =
    pill === "Top" || pill === "Places" || pill === "Experiences" || pill === "Graphs";

  return (
    <div
      className="search-dest-373-261"
      data-testid="search-destination"
      data-figma-node="373:261"
      data-screen="search-00"
      data-presentation="full-column"
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      {/* 373:261 brand row — emblem + wordmark. Back remains for prior-context restore. */}
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
            <button
              key={p.name}
              type="button"
              className="search-result"
              data-testid={`search-person-${p.name.toLowerCase()}`}
              onClick={() => onOpenPerson?.(p.name)}
            >
              <span className="search-result-row">
                <span className="search-result-avatar" aria-hidden>
                  {p.name.slice(0, 1)}
                </span>
                <span className="search-result-copy">
                  <strong>{p.name}</strong>
                  <span>{p.meta}</span>
                </span>
                <span className="search-result-chevron" aria-hidden>
                  ›
                </span>
              </span>
            </button>
          ))}
        </>
      ) : null}

      {showPlaces ? (
        <>
          <p className="search-section-label">Places & experiences</p>
          {places.map((p) => (
            <button
              key={p.name}
              type="button"
              className="search-result"
              data-testid={`search-place-${p.name.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => onOpenPlaceHint?.(p.name)}
            >
              <span className="search-result-row">
                <span className="search-result-copy">
                  <strong>{p.name}</strong>
                  <span>{p.meta}</span>
                </span>
                <span className="search-result-chevron" aria-hidden>
                  ›
                </span>
              </span>
            </button>
          ))}
        </>
      ) : null}
    </div>
  );
}
