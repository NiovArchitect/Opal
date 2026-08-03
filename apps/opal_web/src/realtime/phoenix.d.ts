declare module "phoenix" {
  export type ChannelState = "closed" | "errored" | "joined" | "joining" | "leaving";

  export class Socket {
    constructor(endPoint: string, opts?: Record<string, unknown>);
    connect(): void;
    disconnect(callback?: () => void, code?: number, reason?: string): void;
    channel(topic: string, params?: Record<string, unknown>): Channel;
    isConnected(): boolean;
    onOpen(callback: () => void): void;
    onClose(callback: () => void): void;
    onError(callback: (error: unknown) => void): void;
    connectionState(): string;
  }

  export class Channel {
    join(timeout?: number): Push;
    leave(timeout?: number): Push;
    on(event: string, callback: (payload: unknown) => void): number;
    off(event: string, ref?: number): void;
    push(event: string, payload: Record<string, unknown>, timeout?: number): Push;
    state: ChannelState;
  }

  export class Push {
    receive(status: string, callback: (response?: unknown) => void): Push;
  }
}
