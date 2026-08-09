/**
 * THREAD-ANCHORED OPAL MOMENTS — presentation only.
 * Controls may be ephemeral; meaningful social state stays readable in history.
 * Not a second authority. Internal terminology only.
 */

export type ThreadOpalAge = "live" | "recent" | "historical";

export type ThreadOpalKind =
  | "recognition"
  | "result"
  | "set";

export type ThreadOpalMoment = {
  id: string;
  kind: ThreadOpalKind;
  label: string;
  detail?: string;
  age: ThreadOpalAge;
};

/** Demote live → recent → historical for aging (call as scenario advances). */
export function ageThreadMoments(
  moments: ThreadOpalMoment[],
): ThreadOpalMoment[] {
  return moments.map((m) => {
    if (m.age === "live") return { ...m, age: "recent" as const };
    if (m.age === "recent") return { ...m, age: "historical" as const };
    return m;
  });
}

export function appendThreadMoment(
  moments: ThreadOpalMoment[],
  next: Omit<ThreadOpalMoment, "age"> & { age?: ThreadOpalAge },
): ThreadOpalMoment[] {
  const aged = ageThreadMoments(moments);
  return [
    ...aged,
    {
      ...next,
      age: next.age ?? "live",
    },
  ];
}
