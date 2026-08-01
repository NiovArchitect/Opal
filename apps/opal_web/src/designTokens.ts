/**
 * Design tokens aligned with SF11/12 mobile shell + UI/UX Pro Max filters:
 * calm dark shell, no AI purple/pink gradients, WCAG-oriented contrast.
 */
export const tokens = {
  color: {
    bg: "#0B0F14",
    surface: "#121A24",
    border: "#2A3544",
    text: "#F8FAFC",
    muted: "#94A3B8",
    accent: "#2563EB",
    accentSoft: "#60A5FA",
    warn: "#FBBF24",
    danger: "#F87171",
  },
  space: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 40,
  },
  radius: {
    md: 12,
    lg: 16,
  },
  font: {
    sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  motion: {
    durationMs: 200,
    // CSS prefers-reduced-motion handled in stylesheet
  },
} as const;

export const PRODUCT_COPY = {
  tagline: "Private Social OS",
  hero: "Opal understands your conversations and helps life move forward.",
  notList: [
    "Not a public social network",
    "Not a relationship score",
    "Not a chatbot dashboard",
    "Not advertising-driven discovery",
  ],
  honesty:
    "Public demo uses synthetic fixtures only. Opal’s authoritative runtime remains Elixir/OTP with governed Python AI. This web surface does not replace mobile or server authority.",
} as const;
