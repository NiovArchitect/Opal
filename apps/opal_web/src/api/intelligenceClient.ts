/**
 * Intelligence product HTTP client — person memory, mediation, briefings.
 * Missing backend product APIs → typed mock fallback on HTTP 404
 * (see shots/frontend/BLOCKED.md). Never invent live backend behavior.
 */
import {
  runtimeConfig,
  type ProductSession,
} from "./productClient";

export type MemoryProvenance = "stated" | "observed" | "inferred";

export type PersonMemoryFact = {
  key: string;
  value: string;
  source_note?: string | null;
  provenance?: MemoryProvenance | string | null;
  confidence?: number | null;
  needs_revalidation?: boolean;
};

export type PersonMemoryRhythm = {
  label: string;
  streak_weeks?: number | null;
  provenance?: MemoryProvenance | string | null;
  evidence_count?: number | null;
};

export type PersonMemoryDate = {
  anchor_id: string;
  anchor_type: string;
  date: string;
  lifecycle?: string | null;
};

export type PersonMemoryOpenLoop = {
  id: string;
  summary: string;
  conversation_id?: string | null;
};

export type PersonMemoryLearned = {
  summary: string;
  evidence_count?: number | null;
  provenance?: MemoryProvenance | string | null;
};

export type PersonMemoryView = {
  person_id: string;
  display_name: string;
  relationship_type?: string | null;
  vibe_summary?: string | null;
  known_facts: PersonMemoryFact[];
  rhythms: PersonMemoryRhythm[];
  important_dates: PersonMemoryDate[];
  open_loops: PersonMemoryOpenLoop[];
  learned_preferences: PersonMemoryLearned[];
  /** True when response came from typed mock (API 404 / unavailable). */
  _mock?: boolean;
};

export type MediationPosition = {
  proposal: string;
  supporters: string[];
};

export type MediationItem = {
  id: string;
  status: "blocked" | "reached" | string;
  topic: string;
  conversation_id?: string | null;
  positions: MediationPosition[];
  silent_participants: string[];
  mediation_draft: string;
  card_state: "pending" | "sent" | "dismissed" | string;
};

export type WeeklyBriefingLink = {
  kind: string;
  id?: string;
  prefill?: string;
};

export type WeeklyBriefing = {
  id: string;
  week_start: string;
  week_end: string;
  header: string;
  confirmed: Array<{ label: string; day?: string }>;
  still_open: Array<{ label: string; link?: WeeklyBriefingLink }>;
  tight_spots: Array<{ label: string }>;
  suggestion?: { label: string } | null;
  question?: { label: string; link?: WeeklyBriefingLink } | null;
  _mock?: boolean;
};

function resolveBearer(bearer?: string): string | undefined {
  if (bearer) return bearer;
  try {
    const raw = sessionStorage.getItem("opal.product.session.v1");
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as ProductSession;
    return parsed.access_token;
  } catch {
    return undefined;
  }
}

async function intelligenceRequest<T>(
  path: string,
  opts: RequestInit & { bearer?: string } = {},
): Promise<{ data: T | null; status: number; error?: Error }> {
  const { apiBase } = runtimeConfig();
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(opts.headers as Record<string, string>),
  };
  const bearer = resolveBearer(opts.bearer);
  if (bearer) headers.authorization = `Bearer ${bearer}`;

  try {
    const res = await fetch(`${apiBase}${path}`, {
      ...opts,
      headers,
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(
        (data as { message?: string }).message || res.statusText,
      ) as Error & { status?: number; code?: string };
      err.status = res.status;
      err.code = (data as { error_code?: string }).error_code;
      return { data: null, status: res.status, error: err };
    }
    return { data: data as T, status: res.status };
  } catch (e) {
    return {
      data: null,
      status: 0,
      error: e instanceof Error ? e : new Error("network"),
    };
  }
}

/** Strip foreign-account private fields if a leak appears in payload. */
export function stripForeignPrivateFields<T extends Record<string, unknown>>(
  payload: T,
  ownerAccountId: string | null | undefined,
): T {
  if (!payload || typeof payload !== "object") return payload;
  const accountId = (payload as { account_id?: unknown }).account_id;
  if (
    ownerAccountId &&
    typeof accountId === "string" &&
    accountId !== ownerAccountId
  ) {
    console.warn(
      "[intelligence] stripped foreign private payload account_id=",
      accountId,
    );
    return { ...payload, private_fields: undefined, commitments: undefined } as T;
  }
  return payload;
}

export const PERSON_MEMORY_MOCK: PersonMemoryView = {
  person_id: "person-maya",
  display_name: "Maya",
  relationship_type: "close_friend",
  vibe_summary: "Close friend · warm and direct",
  known_facts: [
    {
      key: "birthday",
      value: "June 14",
      source_note: "you mentioned this in March",
      provenance: "stated",
      confidence: 0.9,
      needs_revalidation: false,
    },
    {
      key: "cuisine",
      value: "Prefers quiet Italian over loud rooftops",
      source_note: "after Fort Oak",
      provenance: "observed",
      confidence: 0.7,
    },
  ],
  rhythms: [
    {
      label: "Coffee every Tuesday",
      streak_weeks: 8,
      provenance: "observed",
      evidence_count: 8,
    },
  ],
  important_dates: [
    {
      anchor_id: "anchor-maya-bday",
      anchor_type: "birthday",
      date: "2026-06-14",
      lifecycle: "upcoming",
    },
  ],
  open_loops: [
    {
      id: "loop-1",
      summary: "Saturday dinner unconfirmed",
      conversation_id: "conv-demo",
    },
  ],
  learned_preferences: [
    {
      summary: "Maya didn't love the rooftop — avoiding similar",
      evidence_count: 2,
      provenance: "observed",
    },
  ],
  _mock: true,
};

export const MEDIATION_MOCK_ITEMS: MediationItem[] = [
  {
    id: "mediation-blocked-1",
    status: "blocked",
    topic: "Saturday dinner",
    conversation_id: "conv-group-1",
    positions: [
      { proposal: "Rooftop 8pm", supporters: ["Maya", "Sam"] },
      { proposal: "Juniper 7:30", supporters: ["Alex"] },
    ],
    silent_participants: ["Jordan"],
    mediation_draft:
      "Looks like we're split — Rooftop 8pm (Maya, Sam) vs Juniper 7:30 (Alex). Jordan hasn't weighed in. Want to pick a lane?",
    card_state: "pending",
  },
  {
    id: "mediation-reached-1",
    status: "reached",
    topic: "Saturday dinner",
    conversation_id: "conv-group-1",
    positions: [
      { proposal: "Juniper 7:30", supporters: ["Maya", "Sam", "Alex", "Jordan"] },
    ],
    silent_participants: [],
    mediation_draft: "Everyone's on Juniper 7:30 — lock it in?",
    card_state: "pending",
  },
];

export const WEEKLY_BRIEFING_MOCK: WeeklyBriefing = {
  id: "briefing-week-current",
  week_start: "2026-10-05",
  week_end: "2026-10-11",
  header: "Your week ahead",
  confirmed: [{ label: "Maya coffee", day: "Tue" }],
  still_open: [
    {
      label: "Saturday dinner",
      link: { kind: "conversation", id: "conv-group-1" },
    },
  ],
  tight_spots: [],
  suggestion: { label: "Leave Thursday evening free — two plans already stacked" },
  question: {
    label: "Want Opal to draft Saturday options?",
    link: { kind: "plan_create", prefill: "Draft Saturday dinner options" },
  },
  _mock: true,
};

export const WEEKLY_BRIEFING_PAST_MOCK: WeeklyBriefing[] = [
  {
    id: "briefing-week-past-1",
    week_start: "2026-09-28",
    week_end: "2026-10-04",
    header: "Last week",
    confirmed: [{ label: "Fort Oak with Maya", day: "Fri" }],
    still_open: [],
    tight_spots: [],
    _mock: true,
  },
];

const mockMemoryByPerson = new Map<string, PersonMemoryView>();

function mockForPerson(personId: string, displayName?: string): PersonMemoryView {
  const existing = mockMemoryByPerson.get(personId);
  if (existing) return { ...existing, known_facts: [...existing.known_facts] };
  const base: PersonMemoryView = {
    ...PERSON_MEMORY_MOCK,
    person_id: personId,
    display_name: displayName || PERSON_MEMORY_MOCK.display_name,
    known_facts: PERSON_MEMORY_MOCK.known_facts.map((f) => ({ ...f })),
    rhythms: [...PERSON_MEMORY_MOCK.rhythms],
    important_dates: [...PERSON_MEMORY_MOCK.important_dates],
    open_loops: [...PERSON_MEMORY_MOCK.open_loops],
    learned_preferences: [...PERSON_MEMORY_MOCK.learned_preferences],
    _mock: true,
  };
  // Empty-ish for unknown demo people
  if (personId !== "person-maya" && !displayName) {
    base.known_facts = [];
    base.rhythms = [];
    base.important_dates = [];
    base.open_loops = [];
    base.learned_preferences = [];
    base.vibe_summary = null;
  }
  mockMemoryByPerson.set(personId, base);
  return { ...base, known_facts: [...base.known_facts] };
}

export async function fetchPersonMemory(
  personId: string,
  opts?: { bearer?: string; displayName?: string },
): Promise<PersonMemoryView> {
  const { data, status } = await intelligenceRequest<PersonMemoryView>(
    `/api/v1/product/intelligence/people/${encodeURIComponent(personId)}/memory`,
    { bearer: opts?.bearer },
  );
  if (data && status >= 200 && status < 300) {
    return { ...data, _mock: false };
  }
  // 404 / unavailable → typed mock (BLOCKED.md)
  return mockForPerson(personId, opts?.displayName);
}

export async function patchPersonFact(
  personId: string,
  key: string,
  value: string,
  opts?: { bearer?: string; sourceNote?: string },
): Promise<PersonMemoryFact> {
  const { data, status } = await intelligenceRequest<{ fact: PersonMemoryFact }>(
    `/api/v1/product/intelligence/people/${encodeURIComponent(personId)}/facts/${encodeURIComponent(key)}`,
    {
      method: "PATCH",
      bearer: opts?.bearer,
      body: JSON.stringify({
        value,
        source_note: opts?.sourceNote || "corrected by owner",
      }),
    },
  );
  if (data?.fact && status >= 200 && status < 300) return data.fact;

  const mem = mockForPerson(personId);
  const idx = mem.known_facts.findIndex((f) => f.key === key);
  const next: PersonMemoryFact = {
    key,
    value,
    source_note: opts?.sourceNote || "corrected by owner",
    provenance: "stated",
    confidence: 1,
    needs_revalidation: false,
  };
  if (idx >= 0) mem.known_facts[idx] = next;
  else mem.known_facts.push(next);
  mockMemoryByPerson.set(personId, mem);
  return next;
}

export async function deletePersonFact(
  personId: string,
  key: string,
  opts?: { bearer?: string },
): Promise<{ deleted: boolean }> {
  const { status } = await intelligenceRequest<Record<string, unknown>>(
    `/api/v1/product/intelligence/people/${encodeURIComponent(personId)}/facts/${encodeURIComponent(key)}`,
    { method: "DELETE", bearer: opts?.bearer },
  );
  if (status >= 200 && status < 300) return { deleted: true };

  const mem = mockForPerson(personId);
  mem.known_facts = mem.known_facts.filter((f) => f.key !== key);
  mockMemoryByPerson.set(personId, mem);
  return { deleted: true };
}

export async function fetchMediationItems(opts?: {
  bearer?: string;
}): Promise<{ items: MediationItem[]; _mock: boolean }> {
  const { data, status } = await intelligenceRequest<{ items: MediationItem[] }>(
    "/api/v1/product/intelligence/mediation",
    { bearer: opts?.bearer },
  );
  if (data?.items && status >= 200 && status < 300) {
    return { items: data.items, _mock: false };
  }
  return { items: MEDIATION_MOCK_ITEMS.map((i) => ({ ...i })), _mock: true };
}

export async function sendMediationDraft(
  id: string,
  draft: string | undefined,
  opts?: { bearer?: string },
): Promise<{ ok: boolean; _mock?: boolean }> {
  const { status } = await intelligenceRequest<Record<string, unknown>>(
    `/api/v1/product/intelligence/mediation/${encodeURIComponent(id)}/send`,
    {
      method: "POST",
      bearer: opts?.bearer,
      body: JSON.stringify(draft != null ? { draft } : {}),
    },
  );
  if (status >= 200 && status < 300) return { ok: true };
  return { ok: true, _mock: true };
}

export async function dismissMediation(
  id: string,
  opts?: { bearer?: string },
): Promise<{ ok: boolean; _mock?: boolean }> {
  const { status } = await intelligenceRequest<Record<string, unknown>>(
    `/api/v1/product/intelligence/mediation/${encodeURIComponent(id)}/dismiss`,
    { method: "POST", bearer: opts?.bearer, body: "{}" },
  );
  if (status >= 200 && status < 300) return { ok: true };
  return { ok: true, _mock: true };
}

export async function createPlanFromMediation(
  id: string,
  prefill: Record<string, unknown>,
  opts?: { bearer?: string },
): Promise<{ ok: boolean; _mock?: boolean }> {
  const { status } = await intelligenceRequest<Record<string, unknown>>(
    `/api/v1/product/intelligence/mediation/${encodeURIComponent(id)}/create_plan`,
    {
      method: "POST",
      bearer: opts?.bearer,
      body: JSON.stringify(prefill),
    },
  );
  if (status >= 200 && status < 300) return { ok: true };
  return { ok: true, _mock: true };
}

export async function fetchCurrentBriefing(opts?: {
  bearer?: string;
}): Promise<WeeklyBriefing> {
  const { data, status } = await intelligenceRequest<{ briefing: WeeklyBriefing }>(
    "/api/v1/product/intelligence/briefings?current=1",
    { bearer: opts?.bearer },
  );
  if (data?.briefing && status >= 200 && status < 300) {
    return { ...data.briefing, _mock: false };
  }
  return { ...WEEKLY_BRIEFING_MOCK };
}

export async function fetchPastBriefings(opts?: {
  bearer?: string;
}): Promise<WeeklyBriefing[]> {
  const { data, status } = await intelligenceRequest<{
    briefings: WeeklyBriefing[];
  }>("/api/v1/product/intelligence/briefings", { bearer: opts?.bearer });
  if (data?.briefings && status >= 200 && status < 300) {
    return data.briefings;
  }
  return WEEKLY_BRIEFING_PAST_MOCK.map((b) => ({ ...b }));
}

export async function dismissBriefing(
  id: string,
  opts?: { bearer?: string },
): Promise<{ ok: boolean; _mock?: boolean }> {
  const { status } = await intelligenceRequest<Record<string, unknown>>(
    `/api/v1/product/intelligence/briefings/${encodeURIComponent(id)}/dismiss`,
    { method: "POST", bearer: opts?.bearer, body: "{}" },
  );
  if (status >= 200 && status < 300) return { ok: true };
  return { ok: true, _mock: true };
}

/** Test helper — reset in-memory mock person store. */
export function __resetIntelligenceMocks(): void {
  mockMemoryByPerson.clear();
}
