/**
 * Repair #19 polish P11-4 - THE HEAVY PERSONA (capture/test world).
 *
 * A booked-out user, provisioned ADDITIVELY as its own module: the
 * existing founder seed world (founderGraphSeed.ts, HumanSeedWorld)
 * is untouched and byte-stable - nothing here is imported by it.
 * This persona exists so density, collapse, horizon, and spine
 * behavior are exercised at the FULLEST graph, not the emptiest:
 *
 *   - 120 completed past plans across 14 months (past pills);
 *   - 42 invitation records: 16 pending and actionable, 14 the
 *     viewer declined, 12 expired (the declined + expired settle);
 *   - 3 circles, carried on the plans' who_label like the real
 *     contract carries them;
 *   - a live present: happening / ready / forming / month plans;
 *   - a substantial far plan (+74 days) carrying a real-shaped
 *     completion record, for the preparation-spine frame.
 *
 * Titles are human combinations (activity + place + people), never
 * run tags or machine-speak. Dates are generated relative to the
 * `now` the caller passes, so pinned-clock tests are exact.
 * This is a fixture world for tests and integrator captures; it is
 * NOT a backend account (see the polish-density report's honest
 * gap: backend provisioning needs a registered plan-writer under
 * the pattern-enforcement registry, a founder-visible event this
 * wave does not silently perform).
 */
import type { OpalPlanContract } from "../../api/productClient";

export const HEAVY_PERSONA = {
  name: "Robin Alvarez",
  handle: "robin-booked-out",
  circles: ["Close circle", "Work crew", "Family"],
} as const;

const PEOPLE = ["Maya", "Jordan", "Chanelle", "Sabrina", "Alex", "Nina", "Priya", "Marcus"];
const PAST_ACTIVITIES: Array<[string, string]> = [
  ["Dinner", "Juniper and Ivy"],
  ["Brunch", "Herb and Wood"],
  ["Farmers market run", "Oceanside Farmers Market"],
  ["Sunset picnic", "Tamarack Beach"],
  ["Coastal walk and coffee", "the coast path"],
  ["Gallery afternoon", "the Oceanside Museum of Art"],
  ["Rooftop drinks", "The Brick Hotel"],
  ["Book club night", "Maya's place"],
  ["Saturday ride", "the coastal road"],
  ["Kitchen night - pasta from scratch", "home"],
  ["Surf check and breakfast", "the pier"],
  ["Garden day", "the community garden"],
];

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString();
const label = (d: Date) =>
  d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }) +
  ", 7 PM";

function plan(partial: Partial<OpalPlanContract> & { id: string; title: string }): OpalPlanContract {
  return { status: "tentative", ...partial } as OpalPlanContract;
}

export function heavyPersonaPlans(now: Date = new Date()): OpalPlanContract[] {
  const plans: OpalPlanContract[] = [];

  // 120 past plans: 10 a month for 12 months, plus 10 in each of
  // the two months before that (which collapse into a year pill
  // once they age past the 12-month month-pill window at capture
  // time - the generator spreads 14 months so both pill kinds are
  // exercised as time passes).
  let n = 0;
  for (let monthBack = 0; monthBack < 14; monthBack++) {
    const perMonth = 10;
    for (let i = 0; i < perMonth && n < 120; i++, n++) {
      const start = new Date(now.getTime() - monthBack * 30 * DAY - (i + 2) * DAY - 3 * 3_600_000);
      const [activity, place] = PAST_ACTIVITIES[n % PAST_ACTIVITIES.length];
      const person = PEOPLE[n % PEOPLE.length];
      plans.push(
        plan({
          id: `heavy-past-${n}`,
          title: `${activity} with ${person}`,
          status: "completed",
          location: place,
          time_label: label(start),
          start_at: iso(start),
          completed_at: iso(new Date(start.getTime() + 2 * 3_600_000)),
          created_at: iso(new Date(start.getTime() - 5 * DAY)),
          who_label: `${person} and ${PEOPLE[(n + 3) % PEOPLE.length]}`,
          going_count: 3,
          total_count: 4,
          viewer_state: "accepted",
        }),
      );
    }
  }

  // Invitations the viewer declined - they settle.
  for (let i = 0; i < 14; i++) {
    const start = new Date(now.getTime() + ((i % 5) - 1) * 6 * DAY);
    plans.push(
      plan({
        id: `heavy-declined-${i}`,
        title: `${PAST_ACTIVITIES[(i + 2) % PAST_ACTIVITIES.length][0]} with ${PEOPLE[(i + 1) % PEOPLE.length]}`,
        status: "tentative",
        location: PAST_ACTIVITIES[(i + 2) % PAST_ACTIVITIES.length][1],
        time_label: label(start),
        start_at: iso(start),
        created_at: iso(new Date(start.getTime() - 9 * DAY)),
        viewer_state: "declined",
        who_label: PEOPLE[(i + 1) % PEOPLE.length],
      }),
    );
  }
  // Invitations that expired unanswered - they settle.
  for (let i = 0; i < 12; i++) {
    const start = new Date(now.getTime() - (i + 4) * DAY);
    plans.push(
      plan({
        id: `heavy-expired-${i}`,
        title: `${PAST_ACTIVITIES[(i + 5) % PAST_ACTIVITIES.length][0]} with ${PEOPLE[(i + 4) % PEOPLE.length]}`,
        status: "expired",
        location: PAST_ACTIVITIES[(i + 5) % PAST_ACTIVITIES.length][1],
        time_label: label(start),
        start_at: iso(start),
        created_at: iso(new Date(start.getTime() - 12 * DAY)),
        viewer_state: "pending",
        who_label: PEOPLE[(i + 4) % PEOPLE.length],
      }),
    );
  }
  // Pending, actionable invitations (needs the viewer).
  for (let i = 0; i < 16; i++) {
    const start = new Date(now.getTime() + (2 + i) * DAY);
    plans.push(
      plan({
        id: `heavy-pending-${i}`,
        title: `${PAST_ACTIVITIES[(i + 1) % PAST_ACTIVITIES.length][0]} with ${PEOPLE[i % PEOPLE.length]}`,
        status: "tentative",
        location: PAST_ACTIVITIES[(i + 1) % PAST_ACTIVITIES.length][1],
        time_label: label(start),
        start_at: iso(start),
        created_at: iso(new Date(now.getTime() - (i % 4) * DAY)),
        viewer_state: "pending",
        who_label: PEOPLE[i % PEOPLE.length],
      }),
    );
  }

  // The living present.
  const at = (days: number, hours = 0) => new Date(now.getTime() + days * DAY + hours * 3_600_000);
  plans.push(
    plan({
      id: "heavy-happening",
      title: "Farmers market run with Maya",
      status: "live",
      location: "Oceanside Farmers Market",
      time_label: "Today",
      start_at: iso(at(0, -1)),
      created_at: iso(at(-3)),
      viewer_state: "accepted",
      who_label: "Maya and Jordan",
      going_count: 3,
      total_count: 3,
    }),
    plan({
      id: "heavy-ready-week",
      title: "Dinner at Juniper and Ivy with Chanelle",
      status: "agreed",
      location: "Juniper and Ivy",
      time_label: label(at(3)),
      start_at: iso(at(3)),
      created_at: iso(at(-6)),
      viewer_state: "accepted",
      who_label: "Chanelle",
      going_count: 2,
      total_count: 2,
    }),
    plan({
      id: "heavy-ready-month",
      title: "Gallery afternoon with Nina",
      status: "agreed",
      location: "the Oceanside Museum of Art",
      time_label: label(at(18)),
      start_at: iso(at(18)),
      created_at: iso(at(-2)),
      viewer_state: "accepted",
      who_label: "Nina",
    }),
    plan({
      id: "heavy-forming",
      title: "Coastal walk and coffee with Priya",
      status: "tentative",
      location: null,
      time_label: label(at(5)),
      start_at: iso(at(5)),
      created_at: iso(at(-1)),
      viewer_state: "accepted",
      who_label: "Priya",
    }),
  );

  // The horizon: far plans, one of them substantial with a spine.
  plans.push(heavySubstantialPlan(now));
  plans.push(
    plan({
      id: "heavy-far-birthday",
      title: "Birthday dinner for Marcus",
      status: "agreed",
      location: "Herb and Wood",
      time_label: label(at(52)),
      start_at: iso(at(52)),
      created_at: iso(at(-4)),
      viewer_state: "accepted",
      who_label: "Marcus and the Work crew",
    }),
  );
  return plans;
}

/** The substantial far plan: a long weekend, +74 days, with a real-
 *  shaped completion record (the R16 step vocabulary) for the
 *  preparation spine. Steps carry only statuses the completion
 *  machinery itself writes - nothing here claims a booking was
 *  made: the ride and food steps wait on people, honestly. */
export function heavySubstantialPlan(now: Date = new Date()): OpalPlanContract {
  const start = new Date(now.getTime() + 74 * DAY);
  return plan({
    id: "heavy-far-joshua-tree",
    title: "A long weekend in Joshua Tree with the whole crew",
    status: "agreed",
    location: "Joshua Tree",
    time_label: label(start),
    start_at: iso(start),
    created_at: iso(new Date(now.getTime() - 2 * DAY)),
    viewer_state: "accepted",
    who_label: "Maya, Jordan, Sabrina, Alex and the Close circle",
    going_count: 5,
    total_count: 6,
    completion: {
      driven_at: iso(new Date(now.getTime() - 2 * DAY)),
      steps: [
        { id: "calendar", status: "projected" },
        { id: "restaurants", status: "running" },
        { id: "food", status: "collecting" },
        { id: "ride", status: "offer" },
        { id: "follow_through", status: "registered" },
      ],
    },
  });
}
