import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { formatUnread } from "./dockUnreadDisplay";

describe("formatUnread", () => {
  it('formats 9 as "9" and 10 as "9+"', () => {
    expect(formatUnread(9)).toBe("9");
    expect(formatUnread(10)).toBe("9+");
    expect(formatUnread(1)).toBe("1");
    expect(formatUnread(395)).toBe("9+");
  });

  it("DockUnread source is dockUnreadCount; 9+ is formatting only", () => {
    const app = readFileSync(resolve(__dirname, "../OpalApp.tsx"), "utf8");
    expect(app).toMatch(/dockUnreadCount\(/);
    expect(app).toMatch(/formatUnread\(/);
    expect(app).toMatch(/function DockUnread/);
    // Not a hardcoded product-truth badge string independent of count
    expect(app).not.toMatch(/dock-chats-unread[^>]*>\s*9\+/);
  });
});
