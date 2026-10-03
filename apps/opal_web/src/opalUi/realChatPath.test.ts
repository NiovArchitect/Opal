import { describe, expect, it } from "vitest";
import { normalizePhoneInput } from "../api/productClient";
import {
  conversationDisplayName,
  isInternalConversationLabel,
  isSeedFixtureConversation,
  isSeedLeakMessage,
  isTestResidueConversation,
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

  it("recognizes forwarded seed memories as leakage", () => {
    expect(
      isSeedLeakMessage("Forwarded Memory: Golden hour hike with the crew. [seed-nina-hike]"),
    ).toBe(true);
    expect(isSeedLeakMessage("Hey — can you meet tomorrow?")).toBe(false);
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

  it("hides soak / P046gate / Multi speaker residue but keeps Fort Oak", () => {
    expect(
      isTestResidueConversation({
        id: "ace99adc-db67-4258-9d95-f612246c6c84",
        name: "Walk B",
        preview: "shell-geo unread 1790997848885",
      }),
    ).toBe(false);
    expect(
      isTestResidueConversation({
        name: "Multi speaker msy0uy9n",
        preview: "A again: locking 7:30",
      }),
    ).toBe(true);
    expect(
      isTestResidueConversation({
        name: "Direct, Second",
        preview: "P046gate",
      }),
    ).toBe(true);
    expect(
      isTestResidueConversation({
        name: "Soak soak7-msttwuhs",
        preview: "SOAK-HEARTBEAT-20m",
      }),
    ).toBe(true);
  });
});
