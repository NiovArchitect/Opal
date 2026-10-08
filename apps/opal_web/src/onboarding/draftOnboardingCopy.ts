/**
 * Optional LLM draft for Meet Opal / OpalWorking spoken bubbles.
 * Template floor always wins on timeout/error/no bearer. ~2.5s cap.
 */

export type OnboardingCopyMoment =
  | "greeting"
  | "ask_people"
  | "ask_more"
  | "ask_when"
  | "ask_vibe"
  | "calendar_connected"
  | "calendar_dismissed"
  | "taste_done"
  | "spots_ready"
  | "message_preview";

const DEFAULT_TIMEOUT_MS = 2500;

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
  const template = input.template;
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
    if (!text) return { text: template, source: "template" };

    return {
      text,
      source: data?.source === "llm" ? "llm" : "template",
    };
  } catch {
    return { text: template, source: "template" };
  } finally {
    window.clearTimeout(timer);
  }
}
