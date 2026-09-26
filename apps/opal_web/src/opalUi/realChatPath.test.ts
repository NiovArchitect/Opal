import { describe, expect, it } from "vitest";
import { normalizePhoneInput } from "../api/productClient";
import {
  conversationDisplayName,
  isInternalConversationLabel,
  isSeedFixtureConversation,
} from "./realChatPath";

describe("slice #1 phone normalization", () => {
  it("maps both founder variants to the same E.164", () => {
    expect(normalizePhoneInput("+12025550102")).toBe("+12025550102");
    expect(normalizePhoneInput("2025550102")).toBe("+12025550102");
    expect(normalizePhoneInput("+1 202 555 0102")).toBe("+12025550102");
    expect(normalizePhoneInput("12025550102")).toBe("+12025550102");
  });
});

describe("no-seed chat identity", () => {
  it("never uses a connection- label as the header", () => {
    expect(isInternalConversationLabel("connection-47aa5856-b599fcd7")).toBe(true);
    expect(
      conversationDisplayName("connection-47aa5856-b599fcd7", ["Founder"]),
    ).toBe("Founder");
    expect(conversationDisplayName("connection-47aa5856-b599fcd7", [])).toBe("Direct");
    expect(conversationDisplayName("Saturday dinner", ["Maya"])).toBe("Saturday dinner");
  });

  it("treats seed-only peer sets as fixture conversations", () => {
    expect(
      isSeedFixtureConversation([
        { id: "f0c4a4e1-1111-4111-8111-c4a4e1100001" },
      ]),
    ).toBe(true);
    expect(
      isSeedFixtureConversation([{ id: "b599fcd7-7a97-4736-8221-86e0a6d8dc7a" }]),
    ).toBe(false);
  });
});
