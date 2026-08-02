/**
 * Opal product tokens — UI/UX Pro Max (Chat & Messaging + Dark OLED + Inter)
 * filtered by Opal product truth (private Social OS, no scores, no ads).
 * See apps/opal_web/design-system/MASTER.md
 */
export const tokens = {
  color: {
    bg: "#0B0F14",
    surface: "#121A24",
    chatPane: "#0E141C",
    bubbleOut: "#1D4ED8",
    bubbleIn: "#1A2332",
    border: "rgba(255,255,255,0.08)",
    text: "#F8FAFC",
    muted: "#8B9CB3",
    accent: "#2563EB",
    accentSoft: "#60A5FA",
    online: "#059669",
    warn: "#FBBF24",
    danger: "#DC2626",
  },
  font: {
    sans: '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  radius: {
    md: 12,
    lg: 16,
    bubble: 18,
  },
  motion: {
    durationMs: 200,
    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
  },
} as const;

export const PRODUCT_COPY = {
  appName: "Opal",
  tagline: "Private messages. Plans that move.",
  emptyNeedsYou: "Nothing needs you right now.",
  emptyChats: "No conversations yet.",
  composerPlaceholder: "Message",
} as const;
