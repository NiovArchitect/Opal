import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

describe("realtime client architecture", () => {
  it("depends on official phoenix package", () => {
    const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
    expect(pkg.dependencies.phoenix).toBeTruthy();
  });

  it("centralizes socket ticket and channel join", () => {
    const rt = readFileSync(resolve(root, "src/realtime/RealtimeClient.ts"), "utf8");
    expect(rt).toMatch(/fetchSocketTicket/);
    expect(rt).toMatch(/conversation:\$\{/);
    expect(rt).toMatch(/history:sync/);
    expect(rt).toMatch(/message:new/);
    expect(rt).not.toMatch(/localStorage\.setItem\([^)]*ticket/);
    expect(rt).toMatch(/sessionStorage/);
  });

  it("OpalApp starts realtime and joins on open chat", () => {
    const app = readFileSync(resolve(root, "src/OpalApp.tsx"), "utf8");
    expect(app).toMatch(/productRealtime\.start/);
    expect(app).toMatch(/joinConversation/);
    expect(app).toMatch(/leaveConversation/);
    expect(app).toMatch(/productRealtime\.stop/);
  });

  it("HTTP product create path broadcasts message:new", () => {
    const ctrl = readFileSync(
      resolve(
        root,
        "../opal_core/lib/opal_core_web/controllers/conversation_controller.ex",
      ),
      "utf8",
    );
    expect(ctrl).toMatch(/message:new/);
    expect(ctrl).toMatch(/Endpoint\.broadcast/);
  });
});
