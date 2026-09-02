/**
 * Shared Graph chrome titles for 618:674 list ↔ 618:758 detail identity.
 * Prevents defaulting unrelated Graphs to Juniper & Ivy.
 */
export const GRAPH_AUTHORITY_CHROME: Record<
  string,
  { title: string; whenLine: string; signalLine: string }
> = {
  "seed-chanelle-juniper": {
    title: "Juniper & Ivy",
    whenLine: "Tonight · 7:30 PM · Chanelle",
    signalLine: "Ready · leave 6:55",
  },
  "seed-maya-graph-coast": {
    title: "Mexico City",
    whenLine: "Fri → Sun · Chanelle",
    signalLine: "Both free · stay taking shape",
  },
  "seed-alex-graph-gallery": {
    title: "Family Saturday",
    whenLine: "Kids + family · Saturday",
    signalLine: "3 in · beach → tacos → sunset",
  },
  "seed-near-rooftop": {
    title: "Rooftop Jazz",
    whenLine: "Saved idea · nearby",
    signalLine: "Open · no one asked yet",
  },
};

export function resolveGraphPlaceTitle(card: {
  id: string;
  title?: string;
  placeLine?: string;
} | null | undefined): string {
  if (!card) return "Graph";
  const chrome = GRAPH_AUTHORITY_CHROME[card.id];
  if (chrome) return chrome.title;
  if (card.id === "seed-chanelle-juniper" || /juniper/i.test(card.title || "")) {
    return "Juniper & Ivy";
  }
  const parts = (card.placeLine || "").split("·").map((s) => s.trim()).filter(Boolean);
  const place = parts.find(
    (p) =>
      !/^(tonight|saturday|sunday|friday|thursday|monday|tuesday|wednesday|thu|fri|sat|sun|\d{1,2}:\d{2})/i.test(
        p,
      ),
  );
  if (place) return place;
  const cleaned = (card.title || "").replace(/Conversation became a Graph/i, "").trim();
  return cleaned || "Graph";
}
