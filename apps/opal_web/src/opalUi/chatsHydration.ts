/**
 * Chats list composition — prefer-real / seed-off law (Pass 1).
 *
 * Seed on → founder plan-pill rows remapped onto live conversation ids.
 * Seed off → live rows only (never seed-chat-* as current social state).
 */
import type { ChatsHomeRow } from "./ChatsHome";
import {
  FOUNDER_CHATS_PLAN_PILL_ROWS,
  remapFounderChatRowsToLive,
} from "./founderChatsPlanPills";
import { isFounderSeedEnabled } from "./founderGraphSeed";
import {
  mergeChatRowsWithCreated,
  type CreatedPlanSurface,
} from "./graphSurfaceInterop";
import {
  isSeedFixtureConversation,
  isTestResidueConversation,
} from "./realChatPath";

export type ChatsHydrationMode =
  | "FOUNDER_FIXTURE"
  | "PRODUCTION_HYDRATION"
  | "EMPTY";

export type LiveChatListInput = {
  id: string;
  name: string;
  kind: "direct" | "group";
  memberCount?: number;
  peers?: Array<{ id?: string | null }>;
  preview?: string;
  title?: string;
};

export type ComposeChatsResult = {
  mode: ChatsHydrationMode;
  rows: ChatsHomeRow[];
};

/**
 * Filter live conversations that must never paint on seed-off product path.
 */
export function filterLiveChatsForProduct(
  live: LiveChatListInput[],
  founderSeedEnabled: boolean,
): LiveChatListInput[] {
  return live.filter((c) => {
    if (isTestResidueConversation({ id: c.id, title: c.title || c.name, name: c.name, preview: c.preview })) {
      return false;
    }
    if (!founderSeedEnabled && isSeedFixtureConversation(c.peers || [])) {
      return false;
    }
    return true;
  });
}

/**
 * Compose Chats home rows.
 * PRODUCTION / EMPTY never include seed-chat-* fixture ids as the list body.
 */
export function composeChatsList(opts: {
  liveRows: ChatsHomeRow[];
  createdPlans?: CreatedPlanSurface[];
  founderSeedEnabled?: boolean;
  /** Optional raw live chats for seed-fixture peer filtering before row map. */
  liveChats?: LiveChatListInput[];
}): ComposeChatsResult {
  const seedOn = opts.founderSeedEnabled ?? isFounderSeedEnabled();
  const created = opts.createdPlans || [];

  let liveRows = opts.liveRows;
  if (opts.liveChats) {
    const allowed = new Set(
      filterLiveChatsForProduct(opts.liveChats, seedOn).map((c) => c.id),
    );
    liveRows = liveRows.filter((r) => allowed.has(r.id));
  } else if (!seedOn) {
    liveRows = liveRows.filter((r) => !/^seed-chat-/i.test(r.id));
  }

  if (seedOn) {
    const remapped = remapFounderChatRowsToLive(
      FOUNDER_CHATS_PLAN_PILL_ROWS,
      liveRows.map((r) => ({
        id: r.id,
        name: r.name,
        kind: r.kind,
        memberCount: r.memberCount,
      })),
    );
    const rows = mergeChatRowsWithCreated(remapped, created);
    return { mode: "FOUNDER_FIXTURE", rows };
  }

  const rows = mergeChatRowsWithCreated(liveRows, created);
  if (!rows.length) {
    return { mode: "EMPTY", rows: [] };
  }
  return { mode: "PRODUCTION_HYDRATION", rows };
}

export function isSeedChatRowId(id: string | null | undefined): boolean {
  if (!id) return false;
  return /^seed-chat-/i.test(id);
}
