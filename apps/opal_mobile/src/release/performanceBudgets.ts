/**
 * Performance budgets for Social Flow 12.
 * Derived for synthetic RN/Jest environment — not production SLA claims.
 */

export type BudgetKey =
  | "cold_start_ms"
  | "warm_start_ms"
  | "home_cached_ms"
  | "chats_list_ms"
  | "conversation_open_ms"
  | "plans_ms"
  | "you_ms"
  | "composer_ready_ms"
  | "needs_you_action_ms"
  | "reconnect_ms"
  | "sqlite_query_ms"
  | "snapshot_bytes"
  | "nav_cycle_ms";

/** Budgets in test/synthetic environment (generous for CI variance). */
export const PERFORMANCE_BUDGETS: Record<BudgetKey, number> = {
  cold_start_ms: 3000,
  warm_start_ms: 1500,
  home_cached_ms: 500,
  chats_list_ms: 800,
  conversation_open_ms: 800,
  plans_ms: 800,
  you_ms: 500,
  composer_ready_ms: 300,
  needs_you_action_ms: 400,
  reconnect_ms: 2000,
  sqlite_query_ms: 100,
  snapshot_bytes: 250_000,
  nav_cycle_ms: 200,
};

export type TimingSample = {
  key: BudgetKey;
  ms: number;
  withinBudget: boolean;
};

export function measureSync<T>(key: BudgetKey, fn: () => T): { result: T; sample: TimingSample } {
  const t0 = Date.now();
  const result = fn();
  const ms = Date.now() - t0;
  return {
    result,
    sample: {
      key,
      ms,
      withinBudget: ms <= PERFORMANCE_BUDGETS[key],
    },
  };
}

export function assertWithinBudget(sample: TimingSample): void {
  if (!sample.withinBudget) {
    throw new Error(
      `BUDGET_EXCEEDED ${sample.key}: ${sample.ms}ms > ${PERFORMANCE_BUDGETS[sample.key]}ms`,
    );
  }
}

/** Large synthetic data generators for list/pagination tests. */
export function generateChatIds(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `chat-${i.toString().padStart(4, "0")}`);
}

export function generateMessageBodies(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `Synthetic message ${i + 1}`);
}

export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = page * pageSize;
  return items.slice(start, start + pageSize);
}

export const PAGE_SIZE = 50;
