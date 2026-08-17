import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CHATS, THREADS } from "./data";
import { FIRST_RUN_STEPS } from "./onboarding/FirstRunExperience";
import { FORBIDDEN_COPY, PRODUCT_COPY } from "./designTokens";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("product surface language + identity", () => {
  it("user-visible product copy never uses forbidden phrases", () => {
    const visible = [
      ...Object.values(PRODUCT_COPY),
      ...FIRST_RUN_STEPS.flatMap((s) => [s.kicker, s.title, s.body]),
      ...CHATS.flatMap((c) => [c.name, c.preview, c.contextLine ?? "", c.signalLabel ?? ""]),
      ...Object.values(THREADS)
        .flat()
        .flatMap((m) => [m.body, m.signal?.label ?? ""]),
    ]
      .join("\n")
      .toLowerCase();

    for (const phrase of FORBIDDEN_COPY) {
      expect(visible).not.toContain(phrase);
    }
    expect(visible).not.toMatch(/\bprivate conversation\b/);
  });

  it("source shell does not hardcode weak header subtitle", () => {
    const app = readFileSync(resolve(root, "src/OpalApp.tsx"), "utf8");
    expect(app).not.toMatch(/Private conversation/);
    expect(app).toMatch(/contextLine/);
  });

  it("has social signals as journey state, not identity subtitles", () => {
    expect(CHATS.length).toBeGreaterThanOrEqual(3);
    // Signals optional; quiet conversations may have none.
    expect(CHATS.some((c) => c.signalLabel)).toBe(true);
    expect(CHATS.some((c) => !c.signalLabel)).toBe(true);
    // 1:1 demo chats must not put journey labels under the peer name.
    const jordan = CHATS.find((c) => c.id === "jordan");
    expect(jordan?.contextLine).toBeFalsy();
    expect(THREADS.jordan?.some((m) => m.signal)).toBe(true);
  });

  it("shell treats Opal moments as distinct from human bubbles", () => {
    const app = readFileSync(resolve(root, "src/OpalApp.tsx"), "utf8");
    const css = readFileSync(resolve(root, "src/styles.css"), "utf8");
    expect(app).toMatch(/opal-moment/);
    expect(app).not.toMatch(/contextLine:\s*data\.signals/);
    expect(css).toMatch(/\.opal-moment/);
  });

  it("first-run experience is multi-step with Motion and reduced-motion", () => {
    expect(FIRST_RUN_STEPS.length).toBeGreaterThanOrEqual(4);
    expect(FIRST_RUN_STEPS[0]?.title.toLowerCase()).toMatch(/opal graph|people|world/);
    const onboard = readFileSync(
      resolve(root, "src/onboarding/FirstRunExperience.tsx"),
      "utf8",
    );
    expect(onboard).toMatch(/useReducedMotion/);
    expect(onboard).toMatch(/from ["']motion\/react["']/);
    expect(onboard).toMatch(/fr00|fr05|fr09/);
  });

  it("anti-WhatsApp: no green bubble palette in CSS", () => {
    const css = readFileSync(resolve(root, "src/styles.css"), "utf8").toLowerCase();
    expect(css).not.toMatch(/#25d366|#128c7e|#075e54/);
    expect(css).toMatch(/5ed6e8|futura|lumen|glow/);
  });

  it("anti-calendar: product shell is not a scheduling dashboard", () => {
    const app = readFileSync(resolve(root, "src/OpalApp.tsx"), "utf8").toLowerCase();
    expect(app).not.toMatch(/calendar grid|week view|gantt|crm/);
    expect(app).toMatch(/chats/);
  });

  it("public assets never say demo", () => {
    for (const f of ["index.html", "public/robots.txt"]) {
      const text = readFileSync(resolve(root, f), "utf8").toLowerCase();
      expect(text, f).not.toMatch(/\bdemo\b/);
    }
  });
});
