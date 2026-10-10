import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CREATE_DOCK_EXPOSED, PRODUCT_PUBLIC_NAME } from "./brand";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

describe("S0 shell navigation foundation", () => {
  it("keeps Home Chats Graphs You as live tabs", () => {
    const app = readFileSync(resolve(root, "src/OpalApp.tsx"), "utf8");
    expect(app).toMatch(/id: "home".*label: "Home"/s);
    expect(app).toMatch(/id: "chats".*label: "Chats"/s);
    expect(app).toMatch(/id: "graphs".*label: "Graphs"/s);
    expect(app).toMatch(/id: "you".*label: "You"/s);
    expect(app).toMatch(/member-tabbar/);
    expect(app).toMatch(/member-tab-\$\{t\.id\}/);
  });

  it("does not ship a dead create control", () => {
    expect(CREATE_DOCK_EXPOSED).toBe(false);
    const app = readFileSync(resolve(root, "src/OpalApp.tsx"), "utf8");
    expect(app).toMatch(/data-create-dock=\{CREATE_DOCK_EXPOSED \? "exposed" : "deferred"\}/);
    expect(app).not.toMatch(/onClick=\{\(\) => \{\s*\/\* TODO create/);
  });

  it("customer shell uses Opal Graph public name", () => {
    expect(PRODUCT_PUBLIC_NAME).toBe("Opal Graph");
    const app = readFileSync(resolve(root, "src/OpalApp.tsx"), "utf8");
    expect(app).toMatch(/PRODUCT_PUBLIC_NAME/);
    expect(app).toMatch(/OpalWordmark/);
  });
});
