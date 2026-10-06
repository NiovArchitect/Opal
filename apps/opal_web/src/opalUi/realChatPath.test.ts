import { describe, expect, it } from "vitest";
import { normalizePhoneInput } from "../api/productClient";
import {
  conversationDisplayName,
  isBadConversationDisplay,
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
  it("flags Founder/Conversation/empty as bad display labels", () => {
    expect(isBadConversationDisplay("Conversation")).toBe(true);
    expect(isBadConversationDisplay("Founder")).toBe(true);
    expect(isBadConversationDisplay("Founder, Founder")).toBe(true);
    expect(isBadConversationDisplay("")).toBe(true);
    expect(isBadConversationDisplay("Direct")).toBe(true);
    expect(isBadConversationDisplay("Chanelle")).toBe(false);
    expect(isBadConversationDisplay("Maya")).toBe(false);
  });

  it("never uses a connection- label as the header", () => {
    expect(isInternalConversationLabel("connection-47aa5856-b599fcd7")).toBe(true);
    // Auth-default "Founder" / empty peers → empty (seed overlay must supply the name).
    // Never paint the word "Conversation".
    expect(
      conversationDisplayName("connection-47aa5856-b599fcd7", ["Founder"]),
    ).toBe("");
    expect(
      conversationDisplayName("connection-47aa5856-b599fcd7", [
        "Founder",
        "Founder",
        "Founder",
      ]),
    ).toBe("");
    expect(conversationDisplayName("connection-47aa5856-b599fcd7", [])).toBe("");
    expect(conversationDisplayName("Founder", ["Founder"])).toBe("");
    expect(conversationDisplayName("Founder", [])).toBe("");
    expect(conversationDisplayName("Conversation", [])).toBe("");
    expect(conversationDisplayName("Saturday dinner", ["Maya"])).toBe("Saturday dinner");
    expect(conversationDisplayName("Founder", ["Maya"])).toBe("Maya");
    expect(conversationDisplayName("Chanelle", ["Chanelle"])).toBe("Chanelle");
    // Real peer names always win over junk titles
    expect(
      conversationDisplayName("connection-abc", ["Chanelle", "Maya"]),
    ).toBe("Chanelle, Maya");
    // names.join is restored — peers are the honest signal when title is junk
    expect(conversationDisplayName("", ["Sabrina", "Alex"])).toBe("Sabrina, Alex");
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
    expect(
      isTestResidueConversation({
        name: "Crew with Maya Chen msxrqseb",
        preview: "Group hello msxrqseb",
      }),
    ).toBe(true);
  });
});
