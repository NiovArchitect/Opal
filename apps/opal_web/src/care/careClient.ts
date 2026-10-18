/**
 * Repair #18 Division B (B4/B5) — care rotation + household pod client.
 *
 * Thin typed wrappers over the product API. Every function returns the
 * backend's ONE explicit projection for its surface (rotation contract,
 * pod contract, context contract, plan contract); views render those
 * outputs and never re-derive state.
 */
import { getOpalApiBaseUrl, loadBrowserAccessToken } from "../api/productClient";

export type CareCheckIn = {
  id: string;
  rotation_id: string;
  occurrence_key: string;
  assignee_user_id: string | null;
  slot_user_id: string | null;
  window_start_at: string;
  window_end_at: string;
  status: "scheduled" | "open" | "done" | "missed" | "covered" | "cancelled" | string;
  done_by_user_id: string | null;
  done_at: string | null;
  note: string | null;
  handoff_from_user_id: string | null;
  handoff_to_user_id: string | null;
  handoff_at: string | null;
  handoff_reason: string | null;
  missed_surfaced_at: string | null;
};

export type CareRotation = {
  id: string;
  subject_label: string;
  subject_user_id: string | null;
  subject_visible: boolean;
  created_by_user_id: string;
  admin_user_id: string;
  member_user_ids: string[];
  pending_member_user_ids: string[];
  next_assignee_index: number;
  cadence: { frequency: string; weekdays?: number[]; local_time: string; window_hours: number };
  timezone: string;
  conversation_id: string | null;
  status: "active" | "paused" | "ended" | string;
  viewer_is_member: boolean;
  viewer_is_admin: boolean;
  check_ins: CareCheckIn[];
};

export type Household = {
  id: string;
  label: string;
  home_label: string;
  created_by_user_id: string;
  timezone: string;
  status: string;
  active_member_user_ids: string[];
  pending_member_user_ids: string[];
  viewer_status: string | null;
  viewer_is_primary: boolean;
  plan_defaults: {
    participant_user_ids: string[];
    location: string;
    timezone: string;
  };
};

export type PlanFromContext = {
  id: string;
  title: string;
  status: string;
  source: string;
  location: string | null;
  timezone: string;
  plan_type: string;
  created_by_user_id: string;
  participants: { user_id: string; role: string; response_state: string }[];
};

export type PlanningContext = {
  context_kind: "pod" | "household" | "solo" | "connected" | string;
  pod: Household | null;
  plan_defaults: {
    participant_user_ids: string[];
    location: string;
    timezone: string;
    context_label: string;
    household_id: string;
  } | null;
  attention_slots_used_today: number;
  proactive_threads_enabled: boolean;
};

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const base = getOpalApiBaseUrl();
  const token = loadBrowserAccessToken();
  const res = await fetch(`${base}/api/v1/product${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: body == null ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `request failed (${res.status})`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return data as T;
}

// --- Care rotations ---

export async function listCareRotations(): Promise<CareRotation[]> {
  const data = await call<{ rotations: CareRotation[] }>("GET", "/care-rotations");
  return data.rotations;
}

export async function createCareRotation(input: {
  subject_label: string;
  member_user_ids: string[];
  cadence: CareRotation["cadence"];
  timezone: string;
  conversation_id?: string;
}): Promise<CareRotation> {
  const data = await call<{ rotation: CareRotation }>("POST", "/care-rotations", input);
  return data.rotation;
}

export async function fetchCareRotation(id: string): Promise<CareRotation> {
  const data = await call<{ rotation: CareRotation }>("GET", `/care-rotations/${id}`);
  return data.rotation;
}

export async function acceptCareRotation(id: string): Promise<CareRotation> {
  const data = await call<{ rotation: CareRotation }>("POST", `/care-rotations/${id}/accept`);
  return data.rotation;
}

export async function completeCheckIn(
  rotationId: string,
  occurrenceKey: string,
  note?: string,
): Promise<CareCheckIn> {
  const data = await call<{ check_in: CareCheckIn }>(
    "POST",
    `/care-rotations/${rotationId}/check-ins/${encodeURIComponent(occurrenceKey)}/complete`,
    note ? { note } : {},
  );
  return data.check_in;
}

export async function passCheckIn(
  rotationId: string,
  occurrenceKey: string,
  toUserId?: string,
  reason?: string,
): Promise<CareCheckIn> {
  const data = await call<{ check_in: CareCheckIn }>(
    "POST",
    `/care-rotations/${rotationId}/check-ins/${encodeURIComponent(occurrenceKey)}/pass`,
    { to_user_id: toUserId ?? null, reason: reason ?? null },
  );
  return data.check_in;
}

// --- Household pods + context ---

export async function listHouseholds(): Promise<Household[]> {
  const data = await call<{ households: Household[] }>("GET", "/households");
  return data.households;
}

export async function createHousehold(input: {
  label: string;
  home_label?: string;
  timezone?: string;
  invite_user_ids: string[];
}): Promise<Household> {
  const data = await call<{ household: Household }>("POST", "/households", input);
  return data.household;
}

export async function acceptHousehold(id: string): Promise<Household> {
  const data = await call<{ household: Household }>("POST", `/households/${id}/accept`);
  return data.household;
}

export async function setPrimaryHousehold(id: string): Promise<Household> {
  const data = await call<{ household: Household }>("POST", `/households/${id}/primary`);
  return data.household;
}

export async function acceptSupplyPlan(householdId: string): Promise<PlanFromContext> {
  const data = await call<{ plan: PlanFromContext }>(
    "POST",
    `/households/${householdId}/supply-plan/accept`,
  );
  return data.plan;
}

export async function createPlanFromContext(input: {
  context: "pod" | "none";
  title: string;
  participant_user_ids?: string[];
  location?: string;
  plan_type?: "in_person" | "virtual";
}): Promise<PlanFromContext> {
  const data = await call<{ plan: PlanFromContext }>("POST", "/plans/from-context", input);
  return data.plan;
}

export async function fetchPlanningContext(): Promise<PlanningContext> {
  const data = await call<{ context: PlanningContext }>("GET", "/context");
  return data.context;
}
