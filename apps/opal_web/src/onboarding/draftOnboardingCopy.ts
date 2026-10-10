/**
 * Optional LLM draft for Meet Opal / OpalWorking spoken bubbles.
 * Template floor always wins on timeout/error/no bearer. ~2.5s cap.
 * Paste W4 Phase 1 — identity + dash bans are mechanical gates on LLM text.
 */

import {
  assertOpalTalksToUser,
  scrubUserVisibleDashes,
} from "./identityVoice";

export type OnboardingCopyMoment =
  | "greeting"
  | "ask_people"
  | "ask_more"
  | "ask_when"
  | "ask_vibe"
  | "calendar_connected"
  | "calendar_dismissed"
  | "calendar_unavailable"
  | "taste_done"
  | "spots_ready"
  | "message_preview";

const DEFAULT_TIMEOUT_MS = 2500;

function acceptDraft(
  text: string,
  template: string,
  friend?: string,
): { text: string; source: "llm" | "template" } | null {
  const cleaned = scrubUserVisibleDashes(text);
  if (!cleaned || /thinking about your circle/i.test(cleaned)) {
    return null;
  }
  // Friend gate only when friend is provided (skipped for message_preview).
  const violations = assertOpalTalksToUser(cleaned, { friend });
  if (violations.some((v) => v.startsWith("friend-as-addressee"))) {
    return null;
  }
  return { text: cleaned || template, source: "llm" };
}

export async function draftOnboardingCopy(input: {
  moment: OnboardingCopyMoment;
  template: string;
  name?: string;
  vibe?: string;
  days?: string;
  spot?: string;
  when?: string;
  bearer?: string | null;
  timeoutMs?: number;
}): Promise<{ text: string; source: "llm" | "template" }> {
  const template = scrubUserVisibleDashes(input.template);
  if (!input.bearer || !template.trim()) {
    return { text: template, source: "template" };
  }

  const ctrl = new AbortController();
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch("/api/v1/product/intelligence/onboarding/copy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.bearer}`,
      },
      body: JSON.stringify({
        moment: input.moment,
        template,
        name: input.name ?? null,
        vibe: input.vibe ?? null,
        days: input.days ?? null,
        spot: input.spot ?? null,
        when: input.when ?? null,
      }),
      signal: ctrl.signal,
    });

    if (!res.ok) return { text: template, source: "template" };

    const data = (await res.json().catch(() => null)) as
      | { text?: string; source?: string }
      | null;

    const text = typeof data?.text === "string" ? data.text.trim() : "";
    // Paste W3 2.1 / W4 1.2 — never accept invented friction or friend-as-addressee.
    if (!text) {
      return { text: template, source: "template" };
    }

    const friend =
      input.moment === "message_preview" ? undefined : input.name;
    const accepted = acceptDraft(text, template, friend);
    if (!accepted) {
      return { text: template, source: "template" };
    }

    return {
      text: accepted.text,
      source: data?.source === "llm" ? "llm" : "template",
    };
  } catch {
    return { text: template, source: "template" };
  } finally {
    window.clearTimeout(timer);
  }
}
