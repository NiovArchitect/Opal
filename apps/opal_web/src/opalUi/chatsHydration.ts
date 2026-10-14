/**
 * Chats list composition — prefer-real / seed-off law (Pass 1).
 *
 * Seed on → founder plan-pill rows remapped onto live conversation ids.
 * Seed off → live rows only (never seed-chat-* as current social state).
 *
 * Physical path (URL seed → session → onboarding → member shell → Chats)
 * must paint FOUNDER_PHONE_CHAT_ROWS_MIN without Playwright session injection.
 * Diagnostics land on window.__opalSeedPipeline + console only — never UI.
 */
import type { ChatsHomeRow } from "./ChatsHome";
import {
  FOUNDER_CHATS_PLAN_PILL_ROWS,
  FOUNDER_PHONE_CHAT_ROWS_MIN,
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
 * PRODUCTION / EMPTY never include seed-chat-* fixture ids as the list body.
 * Seed on always paints ≥ FOUNDER_PHONE_CHAT_ROWS_MIN coherent fixtures
 * (hard fallback to FOUNDER_CHATS_PLAN_PILL_ROWS when remap under-delivers).
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
    const fixtureRows = FOUNDER_CHATS_PLAN_PILL_ROWS;
    const remapped = remapFounderChatRowsToLive(
      fixtureRows,
      liveRows.map((r) => ({
        id: r.id,
        name: r.name,
        kind: r.kind,
        memberCount: r.memberCount,
      })),
    );
    let rows = mergeChatRowsWithCreated(remapped, created);
    let hardFallback = false;
    if (rows.length < FOUNDER_PHONE_CHAT_ROWS_MIN) {
      hardFallback = true;
      rows = mergeChatRowsWithCreated(
        fixtureRows.map((r) => ({ ...r })),
        created,
      );
    }
    const diagnostics: FounderChatComposeDiagnostics = {
      seedEnabled: true,
      liveRows: liveRows.length,
      fixtureRows: fixtureRows.length,
      composedRows: remapped.length,
      paintedRows: rows.length,
      hardFallback,
      path: "physical_compose",
      names: rows.map((r) => r.name),
    };
    logFounderChatCompose(diagnostics);
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
