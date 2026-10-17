/**
 * Repair #18 (A-web) - plan card contract rendering helpers.
 *
 * The backend owns plan truth: attendance comes from the ONE counter
 * (JourneyAuthority.attendance_contract - going_count / interested_count /
 * total_count / viewer_state, present on a plan payload only when
 * PlanParticipant rows exist) and the conflict line comes from the
 * F18-03 conflict object on the plan payload ({with_plan_id, title,
 * time_label} or null). These helpers ONLY format those carried fields.
 * They never count participants, never compare times, and never invent
 * a number or an overlap the payload did not carry: absent fields
 * render nothing.
 */

export type PlanContractLike = {
  going_count?: number | null;
  interested_count?: number | null;
  total_count?: number | null;
  viewer_state?: string | null;
  conflict?: {
    with_plan_id?: string | null;
    title?: string | null;
    time_label?: string | null;
  } | null;
};

function count(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

/**
 * Attendance line from the contract, e.g. "3 of 4 going" or
 * "3 of 4 going - 1 interested". Null when the payload carries no
 * counts (no participant rows) - the row does not exist then.
 */
export function attendanceLineFromContract(
  plan: PlanContractLike | null | undefined,
): string | null {
  if (!plan) return null;
  const going = count(plan.going_count);
  const total = count(plan.total_count);
  if (going === null || total === null || total === 0) return null;
  const interested = count(plan.interested_count) ?? 0;
  const base = `${going} of ${total} going`;
  return interested > 0 ? `${base} - ${interested} interested` : base;
}

/**
 * Conflict line from the contract, in the C1 calm form:
 * "This overlaps with {other plan title} at {time}."
 * The time part is omitted when the payload carries no time label.
 * Null when the payload carries no conflict object.
 */
export function conflictLineFromContract(
  plan: PlanContractLike | null | undefined,
): string | null {
  const conflict = plan?.conflict;
  if (!conflict || typeof conflict !== "object") return null;
  const title = (conflict.title || "").trim();
  if (!title) return null;
  const time = (conflict.time_label || "").trim();
  return time
    ? `This overlaps with ${title} at ${time}.`
    : `This overlaps with ${title}.`;
}
