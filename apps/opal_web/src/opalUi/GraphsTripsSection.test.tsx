/**
 * Phase 4D — Trips strip / card / detail / create / add-leg.
 * No @testing-library: createRoot + jsdom (project convention).
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TripCard, GraphsTripsSection } from "./GraphsTripsSection";
import type { Trip } from "../api/productClient";

const sampleTrip: Trip = {
  id: "trip-1",
  title: "Big Sur weekend",
  destination_label: "Big Sur",
  starts_on: "2026-11-14",
  ends_on: "2026-11-16",
  created_by_user_id: "u-a",
  legs: [
    {
      id: "leg-b",
      trip_id: "trip-1",
      position: 1,
      leg_type: "lodging",
      place_label: "Cabin",
    },
    {
      id: "leg-a",
      trip_id: "trip-1",
      position: 0,
      leg_type: "transit",
      place_label: "Drive up",
    },
    {
      id: "leg-c",
      trip_id: "trip-1",
      position: 2,
      leg_type: "meal",
      place_label: "Dinner",
    },
  ],
  participants: [
    { user_id: "u-a", role: "creator" },
    { user_id: "u-b", role: "participant" },
    { user_id: "u-c", role: "participant" },
    { user_id: "u-d", role: "participant" },
    { user_id: "u-e", role: "participant" },
  ],
};

const listTrips = vi.fn(async () => ({ trips: [sampleTrip] }));
const getTrip = vi.fn(async () => ({ trip: sampleTrip }));
const createTrip = vi.fn(async (attrs: { title: string }) => ({
  trip: { ...sampleTrip, id: "trip-new", title: attrs.title, legs: [] },
}));
const addTripLeg = vi.fn(async () => ({
  leg: {
    id: "leg-new",
    trip_id: "trip-1",
    position: 3,
    leg_type: "activity",
    place_label: "Hike",
  },
}));
const createPlanFromLeg = vi.fn(async (_tripId: string, legId: string) => ({
  plan: {
    id: "plan-from-leg",
    title: "Dinner",
    status: "tentative",
    source: "trip_leg",
    trip_leg_id: legId,
    conversation_id: null,
  },
  participants: [
    { user_id: "u-a", role: "participant", response_state: "pending" },
  ],
  leg: {
    id: legId,
    trip_id: "trip-1",
    position: 2,
    leg_type: "meal",
    place_label: "Dinner",
    shared_plan_id: "plan-from-leg",
  },
}));
const listConversations = vi.fn(async () => ({
  conversations: [
    {
      id: "c1",
      title: "",
      preview: "",
      updated_at: "",
      peers: [
        { id: "u-a", display_name: "Alex", handle: "a" },
        { id: "u-b", display_name: "Jordan", handle: "j" },
      ],
    },
  ],
}));

vi.mock("../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../api/productClient")>(
    "../api/productClient",
  );
  return {
    ...actual,
    listTrips: (...args: unknown[]) => listTrips(...args),
    getTrip: (...args: unknown[]) => getTrip(...args),
    createTrip: (...args: unknown[]) => createTrip(...args),
    addTripLeg: (...args: unknown[]) => addTripLeg(...args),
    createPlanFromLeg: (...args: unknown[]) => createPlanFromLeg(...args),
    listConversations: (...args: unknown[]) => listConversations(...args),
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function setInput(el: HTMLInputElement, value: string) {
  const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  proto?.set?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

beforeEach(() => {
  listTrips.mockReset().mockResolvedValue({ trips: [sampleTrip] });
  getTrip.mockReset().mockResolvedValue({ trip: sampleTrip });
  createTrip.mockReset().mockImplementation(async (attrs: { title: string }) => ({
    trip: { ...sampleTrip, id: "trip-new", title: attrs.title, legs: [] },
  }));
  addTripLeg.mockReset().mockResolvedValue({
    leg: {
      id: "leg-new",
      trip_id: "trip-1",
      position: 3,
      leg_type: "activity",
      place_label: "Hike",
    },
  });
  createPlanFromLeg.mockReset().mockImplementation(async (_tripId: string, legId: string) => ({
    plan: {
      id: "plan-from-leg",
      title: "Dinner",
      status: "tentative",
      source: "trip_leg",
      trip_leg_id: legId,
      conversation_id: null,
    },
    participants: [
      { user_id: "u-a", role: "participant", response_state: "pending" },
    ],
    leg: {
      id: legId,
      trip_id: "trip-1",
      position: 2,
      leg_type: "meal",
      place_label: "Dinner",
      shared_plan_id: "plan-from-leg",
    },
  }));
  listConversations.mockReset().mockResolvedValue({
    conversations: [
      {
        id: "c1",
        title: "",
        preview: "",
        updated_at: "",
        peers: [
          { id: "u-a", display_name: "Alex", handle: "a" },
          { id: "u-b", display_name: "Jordan", handle: "j" },
        ],
      },
    ],
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

async function openSampleDetail() {
  await act(async () => {
    root.render(<GraphsTripsSection />);
  });
  await flush();
  await act(async () => {
    container.querySelector<HTMLButtonElement>('[data-testid="trip-open-trip-1"]')?.click();
  });
  await flush();
}

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

describe("TripCard", () => {
  it("renders title, destination+dates, and avatars with +N", () => {
    const onOpen = vi.fn();
    act(() => {
      root.render(
        <TripCard
          trip={sampleTrip}
          people={{
            "u-a": { name: "Alex", initial: "A" },
            "u-b": { name: "Jordan", initial: "J" },
            "u-c": { name: "Maya", initial: "M" },
            "u-d": { name: "Chris", initial: "C" },
            "u-e": { name: "Sam", initial: "S" },
          }}
          onOpen={onOpen}
        />,
      );
    });

    expect(container.textContent).toContain("Big Sur weekend");
    const meta = container.querySelector('[data-testid="trip-meta-trip-1"]');
    expect(meta?.textContent).toMatch(/Big Sur/);
    expect(meta?.textContent).toMatch(/2026-11-14/);
    expect(container.textContent).toContain("+1");

    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="trip-open-trip-1"]')?.click();
    });
    expect(onOpen).toHaveBeenCalledWith("trip-1");
  });
});

describe("GraphsTripsSection", () => {
  it("lists trip cards from API and opens detail with legs in position order", async () => {
    await act(async () => {
      root.render(<GraphsTripsSection />);
    });
    await flush();

    expect(container.querySelector('[data-testid="trip-card-trip-1"]')).toBeTruthy();

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="trip-open-trip-1"]')?.click();
    });
    await flush();

    expect(container.querySelector('[data-testid="trip-detail"]')).toBeTruthy();
    const legs = container.querySelectorAll('[data-testid="trip-legs"] [data-position]');
    expect([...legs].map((el) => el.getAttribute("data-position"))).toEqual(["0", "1", "2"]);
    expect(legs[0].textContent).toMatch(/Drive up/);
    expect(legs[1].textContent).toMatch(/Cabin/);
    expect(legs[2].textContent).toMatch(/Dinner/);
  });

  it("create flow posts title and shows new trip", async () => {
    await act(async () => {
      root.render(<GraphsTripsSection />);
    });
    await flush();

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="trip-new"]')?.click();
    });
    await flush();

    const titleInput = container.querySelector<HTMLInputElement>(
      '[data-testid="trip-create-title"]',
    );
    expect(titleInput).toBeTruthy();
    await act(async () => {
      setInput(titleInput!, "Coast run");
    });

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="trip-create-submit"]')?.click();
    });
    await flush();

    expect(createTrip).toHaveBeenCalled();
    expect(container.querySelector('[data-testid="trip-detail-title"]')?.textContent).toBe(
      "Coast run",
    );
  });

  it("add stop posts leg and refreshes detail", async () => {
    const refreshed: Trip = {
      ...sampleTrip,
      legs: [
        ...sampleTrip.legs,
        {
          id: "leg-new",
          trip_id: "trip-1",
          position: 3,
          leg_type: "activity",
          place_label: "Hike",
        },
      ],
    };
    getTrip.mockResolvedValueOnce({ trip: sampleTrip }).mockResolvedValue({ trip: refreshed });

    await act(async () => {
      root.render(<GraphsTripsSection />);
    });
    await flush();

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="trip-open-trip-1"]')?.click();
    });
    await flush();

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="trip-add-stop"]')?.click();
    });
    await flush();

    const place = container.querySelector<HTMLInputElement>('[data-testid="trip-add-place"]');
    await act(async () => {
      setInput(place!, "Hike");
    });

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="trip-add-submit"]')?.click();
    });
    await flush();

    expect(addTripLeg).toHaveBeenCalled();
    expect(container.textContent).toContain("Hike");
  });

  it("empty state shows copy and New trip", async () => {
    listTrips.mockResolvedValue({ trips: [] });
    await act(async () => {
      root.render(<GraphsTripsSection />);
    });
    await flush();

    expect(container.querySelector('[data-testid="graphs-trips-empty"]')).toBeTruthy();
    expect(container.textContent).toContain("No trips yet — plan one together.");
    expect(container.querySelector('[data-testid="trip-empty-new"]')).toBeTruthy();
  });

  it("Phase 4F: leg without plan shows Make it a plan; leg with plan shows pill", async () => {
    const mixed: Trip = {
      ...sampleTrip,
      legs: [
        {
          id: "leg-open",
          trip_id: "trip-1",
          position: 0,
          leg_type: "meal",
          place_label: "Dinner Friday",
          shared_plan_id: null,
        },
        {
          id: "leg-linked",
          trip_id: "trip-1",
          position: 1,
          leg_type: "lodging",
          place_label: "Cabin",
          shared_plan_id: "plan-existing",
        },
      ],
    };
    listTrips.mockResolvedValue({ trips: [mixed] });
    getTrip.mockResolvedValue({ trip: mixed });

    await openSampleDetail();

    expect(container.querySelector('[data-testid="trip-leg-make-plan-leg-open"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="trip-leg-make-plan-leg-open"]')?.textContent).toBe(
      "Make it a plan",
    );
    expect(container.querySelector('[data-testid="trip-leg-make-plan-leg-linked"]')).toBeNull();
    const pill = container.querySelector('[data-testid="trip-leg-plan-pill-leg-linked"]');
    expect(pill).toBeTruthy();
    expect(pill?.textContent).toBe("Plan");
  });

  it("Phase 4F: tap Make it a plan → API → plan pill with status", async () => {
    await openSampleDetail();

    const btn = container.querySelector<HTMLButtonElement>(
      '[data-testid="trip-leg-make-plan-leg-c"]',
    );
    expect(btn).toBeTruthy();

    await act(async () => {
      btn?.click();
    });
    await flush();

    expect(createPlanFromLeg).toHaveBeenCalledWith("trip-1", "leg-c", undefined);
    expect(container.querySelector('[data-testid="trip-leg-make-plan-leg-c"]')).toBeNull();
    const pill = container.querySelector('[data-testid="trip-leg-plan-pill-leg-c"]');
    expect(pill?.textContent).toBe("Plan · tentative");
    // getTrip not called again for create-plan path
    expect(getTrip).toHaveBeenCalledTimes(1);
  });

  it("Phase 4F: API error shows inline retry, no crash", async () => {
    createPlanFromLeg.mockRejectedValueOnce(new Error("server down"));
    await openSampleDetail();

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[data-testid="trip-leg-make-plan-leg-a"]')
        ?.click();
    });
    await flush();

    expect(container.querySelector('[data-testid="trip-leg-plan-error-leg-a"]')?.textContent).toBe(
      "Couldn't create plan — retry",
    );
    expect(container.querySelector('[data-testid="trip-detail"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="trip-leg-make-plan-leg-a"]')).toBeTruthy();
  });
});

describe("Phase 4D source contracts", () => {
  const rootDir = resolve(__dirname, "..");

  it("GraphsHome mounts Trips above filter pills", () => {
    const src = readFileSync(resolve(rootDir, "opalUi/GraphsHome.tsx"), "utf8");
    const tripsIdx = src.indexOf("<GraphsTripsSection");
    const lensesIdx = src.indexOf('className="graphs-lenses"');
    expect(tripsIdx).toBeGreaterThan(-1);
    expect(lensesIdx).toBeGreaterThan(tripsIdx);
  });

  it("productClient exposes list/get/create/addTripLeg/createPlanFromLeg", () => {
    const src = readFileSync(resolve(rootDir, "api/productClient.ts"), "utf8");
    expect(src).toMatch(/export async function listTrips/);
    expect(src).toMatch(/export async function getTrip/);
    expect(src).toMatch(/export async function createTrip/);
    expect(src).toMatch(/export async function addTripLeg/);
    expect(src).toMatch(/export async function createPlanFromLeg/);
    expect(src).toMatch(/\/api\/v1\/product\/trips/);
    expect(src).toMatch(/create-plan/);
  });

  it("C-01 drift literals stay absent from Phase 4D CSS block", () => {
    const css = readFileSync(resolve(rootDir, "styles.css"), "utf8");
    const block = css.slice(css.indexOf("/* Phase 4D"));
    for (const bad of ["#67ECFF", "#FF7EAA", "#FFD37E", "#7E8FA3", "#1E2B3F", "rgba(30,43,63)"]) {
      expect(block).not.toContain(bad);
    }
  });
});
