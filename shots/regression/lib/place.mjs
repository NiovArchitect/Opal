/**
 * B1 shared extraction helpers: read the ONE explicit place projection
 * (place object) out of any surface payload that carries a plan, and
 * fail loudly when a surface carries no place object at all - a surface
 * re-deriving place from the location string is the B1 defect class.
 */
export function extractPlace(obj, depth = 0) {
  if (!obj || typeof obj !== "object" || depth > 6) return null;
  // The projection object itself (kind/label shape).
  if ((obj.kind === "virtual" || obj.kind === "physical") && "label" in obj) return obj;
  const p = obj.place;
  if (p && typeof p === "object" && typeof p.kind === "string") return p;
  for (const key of ["plan", "plan_projection", "place_projection", "journey", "alignment"]) {
    if (obj[key] && typeof obj[key] === "object") {
      const got = extractPlace(obj[key], depth + 1);
      if (got) return got;
    }
  }
  return null;
}

/** The chats-list / thread plan_projection for one conversation row. */
export function chatsRowPlace(row) {
  if (!row || typeof row !== "object") return null;
  const proj = row.plan_projection || row.plan || null;
  if (proj && typeof proj === "object") {
    if (proj.place && typeof proj.place === "object") return proj.place;
    // A projection carrying a bare plan_type but no place object is the
    // dual-authority shape B1 removes; report it as missing.
    return null;
  }
  return null;
}
