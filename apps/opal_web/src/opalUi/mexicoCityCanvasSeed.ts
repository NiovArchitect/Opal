/**
 * Founder-seed Mexico City trip canvas — mirrors OpalCore.Trips.seed_mexico_city_canvas.
 * Real venues only. Loose time labels. Explicit free blocks. Subgroup RSVPs.
 */

export type CanvasRsvpState = "in" | "interested" | "passed";

export type CanvasPerson = {
  id: string;
  name: string;
  initial: string;
};

export type CanvasActivity = {
  id: string;
  venue_name: string;
  venue_area?: string | null;
  activity_kind: string;
  vibe_tags: string[];
  notes?: string | null;
  description?: string | null;
  cuisine?: string | null;
  price_tier?: string | null;
  responses: Array<{ user_id: string; state: CanvasRsvpState }>;
  /** Why Opal suggested this — Phase D one-liner. */
  why?: string | null;
};

export type CanvasTimeBlock = {
  id: string;
  position: number;
  slot: string;
  time_label: string;
  block_kind: "activity" | "free" | "transit" | "meal" | string;
  title?: string | null;
  notes?: string | null;
  activities: CanvasActivity[];
};

export type CanvasDay = {
  id: string;
  day_index: number;
  on_date?: string | null;
  label: string;
  notes?: string | null;
  time_blocks: CanvasTimeBlock[];
};

export type CanvasTrip = {
  id: string;
  title: string;
  destination_label: string;
  starts_on: string;
  ends_on: string;
  participants: CanvasPerson[];
  days: CanvasDay[];
  /** Inline care moments — Phase D. */
  opal_noticed: string[];
};

export const MEXICO_CITY_CANVAS_PEOPLE: CanvasPerson[] = [
  { id: "seed-you", name: "You", initial: "Y" },
  { id: "seed-alex", name: "Alex", initial: "A" },
  { id: "seed-maya", name: "Maya", initial: "M" },
  { id: "seed-chanelle", name: "Chanelle", initial: "C" },
];

const P = MEXICO_CITY_CANVAS_PEOPLE;
const you = P[0].id;
const alex = P[1].id;
const maya = P[2].id;
const chanelle = P[3].id;

function r(
  rows: Array<[string, CanvasRsvpState]>,
): Array<{ user_id: string; state: CanvasRsvpState }> {
  return rows.map(([user_id, state]) => ({ user_id, state }));
}

/** Canonical founder-seed 4-day Mexico City canvas. */
export function buildMexicoCityCanvasSeed(): CanvasTrip {
  return {
    id: "seed-trip-mexico-city",
    title: "Mexico City",
    destination_label: "Mexico City",
    starts_on: "2026-10-14",
    ends_on: "2026-10-17",
    participants: P,
    opal_noticed: [
      "Opal noticed Maya's not a morning person — Saturday market energy stays afternoon-friendly for her track.",
      "Chanelle always picks the food spots — Pujol was her vibe.",
    ],
    days: [
      {
        id: "seed-day-0",
        day_index: 0,
        on_date: "2026-10-14",
        label: "Thu 14",
        notes: "Landing day — soft edges only.",
        time_blocks: [
          {
            id: "seed-b0-free",
            position: 0,
            slot: "afternoon",
            time_label: "afternoon-ish",
            block_kind: "free",
            title: "Settle in",
            notes: "Explicit free time after the flight.",
            activities: [],
          },
          {
            id: "seed-b0-meal",
            position: 1,
            slot: "evening",
            time_label: "~8pm",
            block_kind: "meal",
            title: "First dinner",
            activities: [
              {
                id: "seed-act-contramar",
                venue_name: "Contramar",
                venue_area: "Roma Norte",
                activity_kind: "meal",
                vibe_tags: ["seafood", "lively", "classic"],
                cuisine: "seafood",
                price_tier: "$$$",
                description: "Iconic seafood — tuna tostadas, lively room.",
                why: "Suggested because: Chanelle (foodie), group (arrive-night energy).",
                responses: r([
                  [you, "in"],
                  [alex, "in"],
                  [maya, "in"],
                  [chanelle, "interested"],
                ]),
              },
            ],
          },
        ],
      },
      {
        id: "seed-day-1",
        day_index: 1,
        on_date: "2026-10-15",
        label: "Fri 15",
        time_blocks: [
          {
            id: "seed-b1-am",
            position: 0,
            slot: "morning",
            time_label: "morning-ish",
            block_kind: "activity",
            title: "Market + photo split",
            activities: [
              {
                id: "seed-act-market",
                venue_name: "Mercado de San Juan",
                venue_area: "Centro",
                activity_kind: "activity",
                vibe_tags: ["market", "foodie", "early"],
                description: "Specialty market morning for the food-forward subgroup.",
                why: "Suggested because: Chanelle (foodie), You (early).",
                responses: r([
                  [you, "in"],
                  [chanelle, "in"],
                  [alex, "passed"],
                  [maya, "interested"],
                ]),
              },
              {
                id: "seed-act-rooftop",
                venue_name: "Rooftop golden hour — Roma",
                venue_area: "Roma Norte",
                activity_kind: "activity",
                vibe_tags: ["photography", "golden_hour"],
                description: "Alex photography track — meet the others later.",
                why: "Suggested because: Alex (golden hour / photography).",
                responses: r([
                  [alex, "in"],
                  [maya, "interested"],
                  [you, "passed"],
                  [chanelle, "passed"],
                ]),
              },
            ],
          },
          {
            id: "seed-b1-free",
            position: 1,
            slot: "afternoon",
            time_label: "free afternoon",
            block_kind: "free",
            title: "Breathing room",
            activities: [],
          },
          {
            id: "seed-b1-pujol",
            position: 2,
            slot: "evening",
            time_label: "7:30",
            block_kind: "meal",
            title: "Together dinner",
            activities: [
              {
                id: "seed-act-pujol",
                venue_name: "Pujol",
                venue_area: "Polanco",
                activity_kind: "meal",
                vibe_tags: ["fine_dining", "reservation", "together"],
                cuisine: "mexican",
                price_tier: "$$$$",
                description: "Enrique Olvera tasting — reservation-first together dinner.",
                why: "Suggested because: Chanelle (foodie), group (Saturday-free evening).",
                responses: r([
                  [you, "in"],
                  [alex, "in"],
                  [maya, "in"],
                  [chanelle, "in"],
                ]),
              },
            ],
          },
        ],
      },
      {
        id: "seed-day-2",
        day_index: 2,
        on_date: "2026-10-16",
        label: "Sat 16",
        time_blocks: [
          {
            id: "seed-b2-split",
            position: 0,
            slot: "morning",
            time_label: "morning-ish",
            block_kind: "activity",
            title: "Split morning → lunch meetup",
            activities: [
              {
                id: "seed-act-teotihuacan",
                venue_name: "Teotihuacan day trip",
                venue_area: "Teotihuacan",
                activity_kind: "activity",
                vibe_tags: ["ruins", "outdoors"],
                description: "Pyramids day trip — optional split from city cooking class.",
                why: "Suggested because: Alex + You (outdoors), group free Saturday.",
                responses: r([
                  [you, "in"],
                  [alex, "in"],
                  [maya, "passed"],
                  [chanelle, "in"],
                ]),
              },
              {
                id: "seed-act-cooking",
                venue_name: "Casa Jacaranda cooking class",
                venue_area: "Roma Norte",
                activity_kind: "activity",
                vibe_tags: ["cooking", "intimate"],
                description: "Maya track — regroup for lunch.",
                why: "Suggested because: Maya (cooking / stay-in-city).",
                responses: r([
                  [maya, "in"],
                  [chanelle, "interested"],
                  [you, "passed"],
                  [alex, "passed"],
                ]),
              },
            ],
          },
          {
            id: "seed-b2-lunch",
            position: 1,
            slot: "afternoon",
            time_label: "~1pm",
            block_kind: "meal",
            title: "Lunch together",
            activities: [
              {
                id: "seed-act-quintonil",
                venue_name: "Quintonil",
                venue_area: "Polanco",
                activity_kind: "meal",
                vibe_tags: ["contemporary", "reunion"],
                cuisine: "mexican",
                price_tier: "$$$$",
                description: "Regroup lunch after the split morning.",
                why: "Suggested because: group (reunion), Chanelle (foodie).",
                responses: r([
                  [you, "in"],
                  [alex, "in"],
                  [maya, "in"],
                  [chanelle, "interested"],
                ]),
              },
            ],
          },
          {
            id: "seed-b2-free",
            position: 2,
            slot: "evening",
            time_label: "evening",
            block_kind: "free",
            title: "Open night",
            activities: [],
          },
        ],
      },
      {
        id: "seed-day-3",
        day_index: 3,
        on_date: "2026-10-17",
        label: "Sun 17",
        time_blocks: [
          {
            id: "seed-b3-brunch",
            position: 0,
            slot: "morning",
            time_label: "late morning",
            block_kind: "meal",
            title: "Send-off brunch",
            activities: [
              {
                id: "seed-act-rosetta",
                venue_name: "Panadería Rosetta",
                venue_area: "Roma Norte",
                activity_kind: "meal",
                vibe_tags: ["bakery", "casual", "daylight"],
                cuisine: "bakery",
                price_tier: "$$",
                description: "Daylight bakery send-off before the airport.",
                why: "Suggested because: group (depart morning), soft landing.",
                responses: r([
                  [you, "in"],
                  [alex, "in"],
                  [maya, "in"],
                  [chanelle, "in"],
                ]),
              },
            ],
          },
          {
            id: "seed-b3-transit",
            position: 1,
            slot: "afternoon",
            time_label: "afternoon",
            block_kind: "transit",
            title: "Airport push",
            notes: "Roma → AICM · ~35 min drive — loose, no minute-level schedule.",
            activities: [],
          },
        ],
      },
    ],
  };
}

export function formatTripDateRange(starts?: string | null, ends?: string | null): string {
  if (!starts && !ends) return "";
  const parts = (iso: string) => {
    const d = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return { month: iso, day: "" };
    return {
      month: d.toLocaleDateString("en-US", { month: "short" }),
      day: String(d.getDate()),
    };
  };
  if (starts && ends && starts !== ends) {
    const a = parts(starts);
    const b = parts(ends);
    if (a.month === b.month) return `${a.month} ${a.day}–${b.day}`;
    return `${a.month} ${a.day}–${b.month} ${b.day}`;
  }
  const one = parts(starts || ends || "");
  return `${one.month} ${one.day}`.trim();
}

export function daySummaryLine(day: CanvasDay): string {
  const parts: string[] = [];
  for (const b of day.time_blocks) {
    if (b.block_kind === "free") {
      parts.push(b.title || "Free");
      continue;
    }
    if (b.block_kind === "transit") {
      parts.push(b.title || b.notes || "Transit");
      continue;
    }
    const act = b.activities[0];
    if (act) {
      const t =
        b.block_kind === "meal" && /7:30|8pm|1pm/i.test(b.time_label)
          ? `${act.venue_name} ${b.time_label}`
          : act.venue_name;
      parts.push(t);
    } else if (b.title) {
      parts.push(b.title);
    }
  }
  const head = day.label.split("·")[0]?.trim() || day.label;
  return `${head}: ${parts.join(" → ")}`;
}

export function rsvpCounts(activity: CanvasActivity) {
  const inIds = activity.responses.filter((r) => r.state === "in").map((r) => r.user_id);
  const interested = activity.responses.filter((r) => r.state === "interested").map((r) => r.user_id);
  const passed = activity.responses.filter((r) => r.state === "passed").map((r) => r.user_id);
  return { inIds, interested, passed };
}

export function personName(people: CanvasPerson[], id: string): string {
  return people.find((p) => p.id === id)?.name || "Someone";
}

export function subgroupLine(
  activity: CanvasActivity,
  people: CanvasPerson[],
): string | null {
  const { inIds, passed } = rsvpCounts(activity);
  if (inIds.length === 0 && passed.length === 0) return null;
  if (inIds.length > 0 && passed.length > 0) {
    const going = inIds.map((id) => personName(people, id)).join(" + ");
    const out = passed.map((id) => personName(people, id)).join(" + ");
    return `${going} ${inIds.length === 1 ? "is" : "are"} going · ${out} sitting this out`;
  }
  return null;
}
