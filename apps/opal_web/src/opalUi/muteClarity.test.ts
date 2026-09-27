import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

describe("conversation mute clarity", () => {
  it("puts the action in conversation options and the state on a muted bell", () => {
    const header = readFileSync(resolve(root, "src/opalUi/GraphPeopleThread.tsx"), "utf8");
    const list = readFileSync(resolve(root, "src/opalUi/ChatsHome.tsx"), "utf8");

    expect(header).toMatch(/Mute notifications/);
    expect(header).toMatch(/Unmute notifications/);
    expect(header).toMatch(/Until you turn it back on/);
    expect(header).toMatch(/data-testid="conversation-options"/);
    expect(header).toMatch(/data-testid="muted-state"/);
    expect(header).not.toMatch(/>\s*Mute\s*</);
    expect(header).not.toMatch(/>\s*Unmute\s*</);

    expect(list).toMatch(/data-testid="chat-muted-state"/);
    expect(list).toMatch(/Notifications muted/);
    expect(list).not.toMatch(/onToggleMute/);
    expect(list).not.toMatch(/>\s*Mute\s*</);
  });
});
