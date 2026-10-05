/**
 * Geometric ETA + convoy coordination for Graph detail.
 * Matches TravelProvider haversine (~30 km/h urban avg). Not traffic ETA.
 */

import type { ShareMode, TravelState } from "./journeyPresence";
import { visibleToOthers, type JourneyPresence } from "./journeyPresence";

export const AVG_SPEED_KMH = 30;
export const LEAVE_BUFFER_MINUTES = 15;

export type LatLng = { lat: number; lng: number };

export type GeometricEta = {
  distanceMeters: number;
  durationMinutes: number;
  estimateClass: "geometric_estimate";
  trafficAware: false;
  provider: "haversine";
};

export type ConvoyMember = {
  userId: string;
  displayName: string;
  travelState: TravelState;
  shareMode: ShareMode;
  /** ISO arrival or null when unknown / not sharing */
  arrivesAt?: string | null;
  /** Minutes away when sharing and not arrived */
  minutesAway?: number | null;
  arrivedAt?: string | null;
  avatarTone?: string;
};

export type ConvoyRow = {
  userId: string;
  displayName: string;
  line: string;
  sortKey: number; // earliest arrival first; Infinity last
  travelState: TravelState;
  location: ReturnType<typeof visibleToOthers>["location"];
};

function deg2rad(d: number) {
  return (d * Math.PI) / 180;
}

/** Haversine distance in meters. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const r = 6_371_000;
  const dlat = deg2rad(b.lat - a.lat);
  const dlon = deg2rad(b.lng - a.lng);
  const x =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(deg2rad(a.lat)) * Math.cos(deg2rad(b.lat)) * Math.sin(dlon / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/** Geometric travel estimate — honest, not traffic. */
export function geometricEta(origin: LatLng, dest: LatLng): GeometricEta {
  const distanceMeters = Math.round(haversineMeters(origin, dest));
  const durationMinutes = Math.max(1, Math.round((distanceMeters / 1000 / AVG_SPEED_KMH) * 60));
  return {
    distanceMeters,
    durationMinutes,
    estimateClass: "geometric_estimate",
    trafficAware: false,
    provider: "haversine",
  };
}

export function formatClock(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** Best time to leave = reservation − travel − 15m buffer. */
export function bestTimeToLeave(
  reservationAt: Date,
  travelMinutes: number,
  bufferMinutes = LEAVE_BUFFER_MINUTES,
): Date {
  return new Date(reservationAt.getTime() - (travelMinutes + bufferMinutes) * 60_000);
}

export function youdArrive(now: Date, travelMinutes: number): Date {
  return new Date(now.getTime() + travelMinutes * 60_000);
}

/** Convoy status line — privacy: never assume "Not left yet" when not sharing. */
export function convoyStatusLine(member: ConvoyMember, now = new Date()): string {
  const presence: JourneyPresence = {
    graphId: "convoy",
    userId: member.userId,
    participationState: "going",
    travelState: member.travelState,
    shareMode: member.shareMode,
    eta: member.arrivesAt || null,
    arrivedAt: member.arrivedAt || null,
  };
  const view = visibleToOthers(presence, now);

  if (member.travelState === "arrived") {
    const at = member.arrivedAt ? formatClock(new Date(member.arrivedAt)) : null;
    return at ? `Arrived ✓ ${at}` : "Arrived ✓";
  }

  if (view.location === "not_shared" || view.location === "expired") {
    return "Not sharing location";
  }

  if (member.travelState === "on_the_way") {
    if (member.arrivesAt) {
      return `On the way · Arrives ${formatClock(new Date(member.arrivesAt))}`;
    }
    if (member.minutesAway != null) {
      return `On the way · ${member.minutesAway} min away`;
    }
    return "On the way";
  }

  if (member.travelState === "not_started" || member.travelState === "getting_ready") {
    if (member.minutesAway != null) {
      return `Not left yet · ${member.minutesAway} min away`;
    }
    return "Not left yet";
  }

  return "Status unknown";
}

export function sortConvoyByArrival(members: ConvoyMember[], now = new Date()): ConvoyRow[] {
  const rows: ConvoyRow[] = members.map((m) => {
    const presence: JourneyPresence = {
      graphId: "convoy",
      userId: m.userId,
      participationState: "going",
      travelState: m.travelState,
      shareMode: m.shareMode,
      eta: m.arrivesAt || null,
      arrivedAt: m.arrivedAt || null,
    };
    const view = visibleToOthers(presence, now);
    let sortKey = Number.POSITIVE_INFINITY;
    if (m.travelState === "arrived" && m.arrivedAt) {
      sortKey = Date.parse(m.arrivedAt);
    } else if (view.location !== "not_shared" && view.location !== "expired" && m.arrivesAt) {
      sortKey = Date.parse(m.arrivesAt);
    } else if (
      view.location !== "not_shared" &&
      view.location !== "expired" &&
      m.minutesAway != null
    ) {
      sortKey = now.getTime() + m.minutesAway * 60_000;
    }
    return {
      userId: m.userId,
      displayName: m.displayName,
      line: `${m.displayName} — ${convoyStatusLine(m, now)}`,
      sortKey,
      travelState: m.travelState,
      location: view.location,
    };
  });
  return rows.sort((a, b) => a.sortKey - b.sortKey || a.displayName.localeCompare(b.displayName));
}

/** Juniper & Ivy Little Italy fixture coords + founder walk members. */
export const JUNIPER_VENUE: LatLng = { lat: 32.7231, lng: -117.1683 };

/** Founder self near Little Italy (~12–18 min geometric). */
export const FOUNDER_ORIGIN_FIXTURE: LatLng = { lat: 32.7503, lng: -117.16 };

export function juniperReservationTonight(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(19, 30, 0, 0);
  if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
  return d;
}

export function buildJuniperConvoyFixture(now = new Date()): ConvoyMember[] {
  const reservation = juniperReservationTonight(now);
  // Arrived members sort by past arrival; en-route by projected arrival.
  const jordanArrived = new Date(now.getTime() - 10 * 60_000);
  const chanelleArrives = new Date(
    Math.min(reservation.getTime() - 8 * 60_000, now.getTime() + 12 * 60_000),
  );
  const sabrinaArrives = new Date(now.getTime() + 18 * 60_000);
  return [
    {
      userId: "jordan",
      displayName: "Jordan",
      travelState: "arrived",
      shareMode: "eta",
      arrivedAt: jordanArrived.toISOString(),
      arrivesAt: jordanArrived.toISOString(),
      avatarTone: "#FFC86B",
    },
    {
      userId: "chanelle",
      displayName: "Chanelle",
      travelState: "on_the_way",
      shareMode: "eta",
      arrivesAt: chanelleArrives.toISOString(),
      minutesAway: Math.max(
        1,
        Math.round((chanelleArrives.getTime() - now.getTime()) / 60_000),
      ),
      avatarTone: "#6EE7F5",
    },
    {
      userId: "sabrina",
      displayName: "Sabrina",
      travelState: "not_started",
      shareMode: "eta",
      minutesAway: 18,
      arrivesAt: sabrinaArrives.toISOString(),
      avatarTone: "#FF6B9D",
    },
    {
      userId: "alex",
      displayName: "Alex",
      travelState: "not_started",
      shareMode: "none",
      avatarTone: "#8B5CF6",
    },
  ];
}
