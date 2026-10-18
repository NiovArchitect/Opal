/**
 * Repair #18 B3 — CheckinSummary contract: the organizer summary is
 * rendered from the projection verbatim. The unanswered member is a
 * NAMED row in status asked ("Still waiting") - never dropped, never
 * marked answered; the declining member shows no content; the server
 * headline and still-waiting copy print exactly as composed.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CheckinSummary } from "./CheckinSummary";
import type { CheckinOrganizerSummary } from "../api/productClient";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const SUMMARY: CheckinOrganizerSummary = {
  view: "organizer",
  sweep: {
    id: "sweep-1",
    source_kind: "relationship_set",
    source_ref_id: null,
    source_fallback: null,
    circle_label: "Family",
    status: "open",
    prompt_theme: "with the power out",
    created_at: "2026-10-17T00:00:00Z",
    expires_at: "2026-10-19T00:00:00Z",
    closed_at: null,
    close_reason: null,
    next_sweep_allowed_at: null,
  },
  counts: {
    asked_total: 5,
    answered: 3,
    declined_or_passed: 1,
    withdrawn: 0,
    not_ok: 1,
    still_waiting: 1,
    not_askable: 0,
  },
  members: [
    {
      user_id: "u-ok",
      display_name: "Pam",
      response_status: "answered",
      okay: "ok",
      where_text: "home",
      needs_text: null,
      free_text: null,
      shared_area: null,
      responded_at: "2026-10-17T01:00:00Z",
      updated_at: "2026-10-17T01:00:00Z",
      answer_source: "card",
      delivery_state: "deliverable",
    },
    {
      user_id: "u-notok",
      display_name: "Sue",
      response_status: "answered",
      okay: "not_ok",
      where_text: null,
      needs_text: "insulin is running low",
      free_text: null,
      shared_area: { label: "Carlsbad", lat: 33.158, lon: -117.351, shared_at: "2026-10-17T01:05:00Z" },
      responded_at: "2026-10-17T01:05:00Z",
      updated_at: "2026-10-17T01:05:00Z",
      answer_source: "card",
      delivery_state: "deliverable",
    },
    {
      user_id: "u-declined",
      display_name: "Dan",
      response_status: "declined",
      okay: null,
      where_text: null,
      needs_text: null,
      free_text: null,
      shared_area: null,
      responded_at: "2026-10-17T01:10:00Z",
      updated_at: "2026-10-17T01:10:00Z",
      answer_source: "card",
      delivery_state: "deliverable",
    },
    {
      user_id: "u-waiting",
      display_name: "Eff",
      response_status: "asked",
      okay: null,
      where_text: null,
      needs_text: null,
      free_text: null,
      shared_area: null,
      responded_at: null,
      updated_at: "2026-10-17T00:00:00Z",
      answer_source: null,
      delivery_state: "deliverable",
    },
    {
      user_id: "u-words",
      display_name: "Gail",
      response_status: "answered",
      okay: "unstated",
      where_text: null,
      needs_text: null,
      free_text: "at my sister's, bring water",
      shared_area: null,
      responded_at: "2026-10-17T01:20:00Z",
      updated_at: "2026-10-17T01:20:00Z",
      answer_source: "center_text",
      delivery_state: "deliverable",
    },
  ],
  not_askable_names: [],
  not_askable_note: null,
  minor_note: null,
  copy: {
    headline: "4 of 5 answered - 1 need something, 1 still to hear from",
    still_waiting_line:
      "Still waiting on: Eff. Not answering is not the same as being okay.",
  },
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const q = (testid: string) => container.querySelector(`[data-testid="${testid}"]`);

describe("CheckinSummary", () => {
  it("prints the server headline and still-waiting line verbatim", () => {
    act(() => root.render(<CheckinSummary checkin={SUMMARY} />));
    expect(q("checkin-summary-headline")?.textContent).toBe(SUMMARY.copy.headline);
    expect(q("checkin-summary-waiting")?.textContent).toBe(SUMMARY.copy.still_waiting_line);
  });

  it("the unanswered member is a named row marked Still waiting, never answered", () => {
    act(() => root.render(<CheckinSummary checkin={SUMMARY} />));
    const row = q("checkin-member-u-waiting");
    expect(row).not.toBeNull();
    expect(row?.getAttribute("data-status")).toBe("asked");
    expect(row?.textContent).toContain("Eff");
    expect(row?.textContent).toContain("Still waiting");
  });

  it("answers render verbatim; a decline renders no content fields", () => {
    act(() => root.render(<CheckinSummary checkin={SUMMARY} />));
    expect(q("checkin-member-u-notok")?.textContent).toContain("insulin is running low");
    expect(q("checkin-member-u-notok")?.textContent).toContain("Carlsbad");
    expect(q("checkin-member-u-words")?.textContent).toContain("at my sister's, bring water");
    const declined = q("checkin-member-u-declined");
    expect(declined?.textContent).toContain("Chose not to answer");
    expect(declined?.textContent).not.toContain("home");
  });
});
