/**
 * Listener / navigation stability harness for SF12.
 * Detects unbounded growth in synthetic navigation loops.
 */

export type NavDestination = "home" | "chats" | "conversation" | "plans" | "you";

export class ListenerRegistry {
  private listeners = new Map<string, Set<() => void>>();
  private accountId: string | null = null;

  setAccount(accountId: string | null) {
    if (this.accountId && accountId !== this.accountId) {
      this.clearAll();
    }
    this.accountId = accountId;
  }

  subscribe(topic: string, cb: () => void): () => void {
    if (!this.listeners.has(topic)) this.listeners.set(topic, new Set());
    this.listeners.get(topic)!.add(cb);
    return () => {
      this.listeners.get(topic)?.delete(cb);
    };
  }

  clearAll() {
    this.listeners.clear();
  }

  count(): number {
    let n = 0;
    for (const set of this.listeners.values()) n += set.size;
    return n;
  }

  topics(): string[] {
    return [...this.listeners.keys()];
  }
}

export function runNavigationCycles(
  registry: ListenerRegistry,
  cycles: number,
  path: NavDestination[] = ["home", "chats", "conversation", "home"],
): { finalListeners: number; maxListeners: number } {
  let max = 0;
  for (let i = 0; i < cycles; i++) {
    const unsubs: Array<() => void> = [];
    for (const dest of path) {
      const topic = `nav:${dest}`;
      const unsub = registry.subscribe(topic, () => undefined);
      unsubs.push(unsub);
    }
    max = Math.max(max, registry.count());
    // Proper cleanup after leaving surface
    unsubs.forEach((u) => u());
  }
  return { finalListeners: registry.count(), maxListeners: max };
}

export function runAccountSwitchCycles(
  registry: ListenerRegistry,
  cycles: number,
): { finalListeners: number } {
  for (let i = 0; i < cycles; i++) {
    registry.setAccount(`account-a`);
    const u1 = registry.subscribe("session", () => undefined);
    registry.setAccount(`account-b`);
    // switch must clear
    if (registry.count() !== 0) {
      throw new Error("CROSS_ACCOUNT_LISTENER_RETENTION");
    }
    const u2 = registry.subscribe("session", () => undefined);
    u2();
    u1(); // already cleared on switch — should be no-op safe
    registry.clearAll();
  }
  return { finalListeners: registry.count() };
}
