import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import { FIND_PEOPLE_COPY } from "./FindPeopleFlow";

const root = resolve(__dirname, "..");

describe("SF18 find people copy and wiring", () => {
  it("empty-state copy is social and non-technical", () => {
    expect(FIND_PEOPLE_COPY.emptyTitle).toMatch(/people will show up/i);
    expect(FIND_PEOPLE_COPY.permissionLine).toBe(
      "Only the people you select are invited.",
    );
    expect(FIND_PEOPLE_COPY.permissionLine).not.toMatch(/address book|upload|scan|AI/i);
    expect(FIND_PEOPLE_COPY.skip).toMatch(/skip/i);
    // no em dashes
    expect(FIND_PEOPLE_COPY.permissionLine).not.toMatch(/—/);
  });

  it("FindPeopleFlow is wired into OpalApp", () => {
    const app = readFileSync(resolve(root, "OpalApp.tsx"), "utf8");
    expect(app).toMatch(/FindPeopleFlow/);
    expect(app).toMatch(/empty-people/);
    expect(app).toMatch(/Find people you know|People you know/);
    // Product-facing empty state strings must not use em dashes.
    expect(app).toMatch(/Your people will show up here/);
    expect(app).not.toMatch(/Your people will show up here[^\n]*—/);
  });

  it("product client supports people and share preview", () => {
    const client = readFileSync(resolve(root, "api/productClient.ts"), "utf8");
    expect(client).toMatch(/listPeople/);
    expect(client).toMatch(/previewInviteShare/);
    expect(client).toMatch(/invite_source/);
  });
});
