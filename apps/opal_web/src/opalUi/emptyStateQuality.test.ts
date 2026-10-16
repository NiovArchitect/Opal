import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PRODUCT_COPY } from "../designTokens";

const root = resolve(dirname(fileURLToPath(import.meta.url)));

describe("Pass 1F empty state quality", () => {
  it("PRODUCT_COPY invites world-building", () => {
    expect(PRODUCT_COPY.emptyHomeTitle).toMatch(/Your world starts here/i);
    expect(PRODUCT_COPY.emptyHomeBody).toMatch(/Connect people and moments/i);
    expect(PRODUCT_COPY.emptyGraphs).toMatch(/Shared experiences will appear/i);
    expect(PRODUCT_COPY.emptyChats).toMatch(/conversations will live here/i);
    const blob = [
      PRODUCT_COPY.emptyHomeTitle,
      PRODUCT_COPY.emptyHomeBody,
      PRODUCT_COPY.emptyGraphs,
      PRODUCT_COPY.emptyChats,
      PRODUCT_COPY.emptyChatsInvite,
    ]
      .join(" ")
      .toLowerCase();
    expect(blob).not.toMatch(/no posts/);
    expect(blob).not.toMatch(/no graphs found/);
    expect(blob).not.toMatch(/nothing is here/);
  });

  it("Home / Graphs / Chats render PRODUCT_COPY empties", () => {
    const home = readFileSync(resolve(root, "GraphSocialHome.tsx"), "utf8");
    const graphs = readFileSync(resolve(root, "GraphsHome.tsx"), "utf8");
    const chats = readFileSync(resolve(root, "ChatsHome.tsx"), "utf8");
    expect(home).toMatch(/PRODUCT_COPY\.emptyHomeTitle/);
    expect(home).toMatch(/data-testid="home-empty"/);
    expect(graphs).toMatch(/PRODUCT_COPY\.emptyGraphs/);
    // F12-12: empty keeps its testid; load errors get their own honest error
    // testid instead of rendering the empty state on failure.
    expect(graphs).toMatch(/graphs-home-empty/);
    expect(graphs).toMatch(/graphs-home-error/);
    expect(chats).toMatch(/PRODUCT_COPY\.emptyChats/);
    expect(chats).toMatch(/data-testid="chats-home-empty"/);
    expect(graphs).not.toMatch(/No Graphs in this lens yet/);
    expect(chats).not.toMatch(/No conversations yet\. Start with someone you know/);
  });

  it("Attention open uses openChat (no dead setActiveChatId-only path)", () => {
    const app = readFileSync(resolve(root, "../OpalApp.tsx"), "utf8");
    expect(app).toMatch(/Seen ≠ resolved|Seen != resolved|do not clear badge by opening Attention/i);
    expect(app).toMatch(/void openChat\(conversationId\)/);
  });
});
