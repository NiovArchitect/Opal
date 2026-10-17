/**
 * Chats list composition — prefer-real / seed-off law (Pass 1).
 *
 * Seed on → live rows only (Repair #18: fixture rows are never painted;
 * plan pills come from the backend projection on the live row).
 * Seed off → live rows only (never seed-chat-* as current social state).
 *
 * Repair #17 — seed content is DATA, not behavior. A fixture row that did
 * NOT remap onto a real backend conversation is dropped, never painted:
 * a `seed-chat-*` id is not an openable conversation on any path. The
 * backend founder seed (founder-communication-seed) creates the real
 * conversations the fixture rows bind to, so the walk list is real.
 * Diagnostics land on window.__opalSeedPipeline + console only — never UI.
 */
import type { ChatsHomeRow } from "./ChatsHome";
/* Repair #18: fixture rows are no longer imported here - seed mode
 * composes from live rows only (see composeChatsList). */
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
  /** Evidence-only pipeline counters (never render in consumer UI). */
  diagnostics?: FounderChatComposeDiagnostics;
};

export type FounderChatComposeDiagnostics = {
  seedEnabled: boolean;
  liveRows: number;
  fixtureRows: number;
  composedRows: number;
  paintedRows: number;
  hardFallback: boolean;
  path: "physical_compose" | "production";
  names: string[];
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

function logFounderChatCompose(diag: FounderChatComposeDiagnostics) {
  if (typeof window === "undefined") return;
  try {
    const w = window as Window & {
      __opalSeedPipeline?: Record<string, unknown>;
    };
    w.__opalSeedPipeline = {
      ...(w.__opalSeedPipeline || {}),
      chatsCompose: diag,
      at: Date.now(),
    };
    console.info("[opal-seed]", { step: "composeChatsList", ...diag });
  } catch {
    /* ignore */
  }
}

/**
 * Compose Chats home rows.
 * No mode ever includes a seed-chat-* fixture id as a list row: fixture
 * rows survive composition ONLY when remapped onto a real conversation id.
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
    // Repair #18 (F18-01/02): seed mode NO LONGER paints fixture rows.
    // The list renders the live rows - whose plan pills are derived in
    // OpalApp from the backend projection (attendance contract) - in
    // seed mode exactly as in production. Fixture chrome may supply
    // names and avatars elsewhere, but never a row, a count, or a state:
    // a conversation with no projection renders no pill.
    const rows = mergeChatRowsWithCreated(liveRows, created);
    const diagnostics: FounderChatComposeDiagnostics = {
      seedEnabled: true,
      liveRows: liveRows.length,
      fixtureRows: 0,
      composedRows: liveRows.length,
      paintedRows: rows.length,
      hardFallback: false,
      path: "physical_compose",
      names: rows.map((r) => r.name),
    };
    logFounderChatCompose(diagnostics);
    if (!rows.length) {
      return { mode: "EMPTY", rows: [], diagnostics };
    }
    return { mode: "FOUNDER_FIXTURE", rows, diagnostics };
  }

  const rows = mergeChatRowsWithCreated(liveRows, created);
  if (!rows.length) {
    return {
      mode: "EMPTY",
      rows: [],
      diagnostics: {
        seedEnabled: false,
        liveRows: liveRows.length,
        fixtureRows: 0,
        composedRows: 0,
        paintedRows: 0,
        hardFallback: false,
        path: "production",
        names: [],
      },
    };
  }
  return {
    mode: "PRODUCTION_HYDRATION",
    rows,
    diagnostics: {
      seedEnabled: false,
      liveRows: liveRows.length,
      fixtureRows: 0,
      composedRows: rows.length,
      paintedRows: rows.length,
      hardFallback: false,
      path: "production",
      names: rows.map((r) => r.name),
    },
  };
}

export function isSeedChatRowId(id: string | null | undefined): boolean {
  if (!id) return false;
  return /^seed-chat-/i.test(id);
}
