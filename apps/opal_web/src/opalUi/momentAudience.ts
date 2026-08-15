/**
 * Pass 23 — Social Moment audience selector (human language only).
 *
 * Who can see this?
 * Friends | Jordan + Maya | Group | Only me
 *
 * No ACL jargon. Server remains authority.
 */

export type MomentVisibility = "friends" | "specific_people" | "group" | "private";

export type AudienceOption = {
  visibility: MomentVisibility;
  label: string;
  description: string;
};

export const AUDIENCE_OPTIONS: AudienceOption[] = [
  {
    visibility: "friends",
    label: "Friends",
    description: "People you're connected with on Opal",
  },
  {
    visibility: "specific_people",
    label: "Specific people",
    description: "Only people you choose",
  },
  {
    visibility: "group",
    label: "Group",
    description: "A conversation you're in",
  },
  {
    visibility: "private",
    label: "Only me",
    description: "Just you",
  },
];

export type AudiencePreviewInput = {
  visibility: MomentVisibility;
  audienceLabels?: string[];
  audienceUserIds?: string[];
  groupLabel?: string | null;
  friendCount?: number | null;
};

/** Human answer to: Who can see this? */
export function whoCanSeeThis(input: AudiencePreviewInput): string {
  switch (input.visibility) {
    case "private":
      return "Only me";
    case "friends": {
      const n = input.friendCount;
      if (typeof n === "number" && n > 0) return `Friends · ${n} people`;
      return "Friends";
    }
    case "specific_people": {
      const labels = (input.audienceLabels || []).filter(Boolean);
      if (labels.length > 0) return labels.join(" + ");
      const n = (input.audienceUserIds || []).length;
      if (n === 0) return "Selected people";
      if (n === 1) return "1 person";
      return `${n} people`;
    }
    case "group":
      return input.groupLabel?.trim() || "Group";
    default:
      return "Only me";
  }
}

export function isTechnicalAudienceLanguage(text: string): boolean {
  return /\b(acl|policy class|relationship authority|visibility scope|audience_user_ids)\b/i.test(
    text,
  );
}

/** Pass 18 holds closed by Pass 23 product surface (product claim). */
export const PASS18_AUDIENCE_UX_CLOSED = true as const;
export const PASS18_REALTIME_ROUTING_CLOSED = true as const;
