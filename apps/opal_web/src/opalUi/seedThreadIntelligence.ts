/**
 * Local seed-aware thread intelligence — parse founder replies in seed chats
 * and return contextual Opal (and optional peer) responses. No UI chrome.
 */

export type SeedIntelMessage = {
  from: "me" | "them" | string;
  body: string;
  opalFilament?: boolean;
  opalSystemConsequence?: boolean;
  senderDisplayName?: string;
};

export type SeedIntelResult = {
  /** Opal filament / system consequence after the user message. */
  opal?: {
    body: string;
    signalLabel?: string;
  };
  /** Optional peer human reply (Alex, Maya voice, etc.). */
  peer?: {
    body: string;
    senderDisplayName: string;
  };
  /** Lock a confirmed time into the conversation CTA state. */
  confirmTime?: string;
  /** Updated plan pill / consequence label. */
  planLabel?: string;
};

const YES =
  /^(yes|yeah|yep|yup|sure|ok|okay|perfect|locked|lock it|let'?s do it|sounds good|do it|confirmed|confirm|i'?m in|im in|works for me)\b/i;
const NO =
  /^(no|nah|nope|can'?t|cannot|cancel|never mind|scratch that|not anymore)\b/i;
const TIME =
  /(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|\bafter\s+\d{1,2}|\bbefore\s+\d{1,2})/i;

function lastOpalProposal(recent: SeedIntelMessage[]): string | null {
  for (let i = recent.length - 1; i >= 0; i--) {
    const m = recent[i];
    if (!m) continue;
    if (m.opalFilament || m.opalSystemConsequence) {
      const body = (m.body || "").trim();
      if (body) return body;
    }
  }
  return null;
}

function lastPeerBody(recent: SeedIntelMessage[], name: string): string | null {
  const n = name.toLowerCase();
  for (let i = recent.length - 1; i >= 0; i--) {
    const m = recent[i];
    if (!m || m.from === "me") continue;
    if (m.opalFilament || m.opalSystemConsequence) continue;
    if ((m.senderDisplayName || "").toLowerCase() === n || m.from === "them") {
      return (m.body || "").trim() || null;
    }
  }
  return null;
}

function extractPlanSnippet(opalBody: string): string {
  // Prefer the concrete plan clause after an em/en dash (never split on ":" — times use it).
  const dash = opalBody.split(/\s*[—–-]\s*/);
  if (dash.length > 1) {
    const after = dash.slice(1).join(" — ").trim();
    if (after.length > 4) return after.replace(/\?+\s*$/, "").trim();
  }
  return opalBody.replace(/^got it\s*[—–-]?\s*/i, "").replace(/\?+\s*$/, "").trim();
}

function extractConfirmTime(plan: string): string | undefined {
  const m = plan.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
  if (!m) return undefined;
  let t = m[1].replace(/\s+/g, " ").trim();
  if (!/am|pm/i.test(t)) t = `${t} AM`;
  return t;
}

/** Map conversation id / display name → seed-chat-* key. */
export function seedChatKeyFrom(input: {
  conversationId?: string | null;
  displayName?: string | null;
}): string | null {
  const id = (input.conversationId || "").trim();
  if (/^seed-chat-/i.test(id)) return id;
  const n = (input.displayName || "").trim().toLowerCase();
  if (!n) return null;
  if (n === "chanelle" || n.startsWith("chanelle ")) return "seed-chat-chanelle";
  if (n === "maya" || n.startsWith("maya ")) return "seed-chat-maya";
  if (n === "juniper crew" || n === "saturday crew" || n.includes("juniper crew")) {
    return "seed-chat-juniper-crew";
  }
  if (n === "sabrina" || n.startsWith("sabrina ")) return "seed-chat-sabrina";
  if (n === "alex" || n.startsWith("alex ")) return "seed-chat-alex";
  return null;
}

/**
 * Interpret a founder reply in a seed thread and produce the next Opal/peer turn.
 * Returns null when there is nothing contextual to say (rare — prefer a soft ack).
 */
export function interpretSeedThreadReply(input: {
  chatKey: string;
  displayName: string;
  userBody: string;
  recent: SeedIntelMessage[];
}): SeedIntelResult | null {
  const body = (input.userBody || "").trim();
  if (!body) return null;
  const key = input.chatKey;
  const name = input.displayName || "them";
  const opalLast = lastOpalProposal(input.recent);
  const peerLast = lastPeerBody(input.recent, name);

  // —— Affirmative lock after an Opal plan proposal ——
  if (YES.test(body) && opalLast && /market|coast|juniper|7:30|10:30|drive|tonight|saturday/i.test(opalLast)) {
    const plan = extractPlanSnippet(opalLast);
    const confirmTime = extractConfirmTime(plan) || extractConfirmTime(opalLast);
    return {
      opal: {
        body: `Locked in! ${/saturday/i.test(opalLast) || /market|coast/i.test(plan) ? "Saturday " : ""}${plan}${/[.!?]$/.test(plan) ? "" : "."}`,
        signalLabel: `Locked in · ${plan}`,
      },
      confirmTime,
      planLabel: plan,
    };
  }

  // —— Soft no / cancel ——
  if (NO.test(body) && opalLast) {
    return {
      opal: {
        body: `Okay — I'll hold off on that. What timing works better for you${name ? ` and ${name}` : ""}?`,
        signalLabel: "Plan paused · waiting on a new time",
      },
    };
  }

  // —— Counter-proposal with a time ——
  const timeHit = body.match(TIME);
  if (timeHit && /free|after|before|works|can do|prefer|better|make/i.test(body)) {
    const raw = timeHit[1].replace(/\s+/g, " ").trim();
    if (/maya/i.test(key) || /market|coast/i.test(opalLast || peerLast || "")) {
      const afterHour = body.match(/after\s+(\d{1,2})/i);
      const adjusted = /after\s+10/i.test(body)
        ? "10:30 market, 12 coast drive"
        : afterHour
          ? `${afterHour[1]}:30 market, then coast`
          : `${raw} market, then coast`;
      return {
        opal: {
          body: `Got it — ${adjusted}?`,
          signalLabel: `Adjusted · ${adjusted}`,
        },
      };
    }
    if (/chanelle|juniper/i.test(key) || /juniper|7:30|dinner/i.test(opalLast || peerLast || "")) {
      return {
        opal: {
          body: `Got it — Juniper & Ivy · ${raw}${/am|pm/i.test(raw) ? "" : " PM"}?`,
          signalLabel: `Adjusted · Juniper & Ivy · ${raw}`,
        },
      };
    }
  }

  // —— Per-person contextual voices ——
  if (/maya/i.test(key)) {
    if (/coffee|market|coast|drive|saturday/i.test(body)) {
      return {
        peer: {
          body: "Love that — keep me posted on the exact start.",
          senderDisplayName: "Maya",
        },
        opal: {
          body: "I'll hold Saturday morning open for you two until you lock a start.",
          signalLabel: "Holding · farmers market + coast",
        },
      };
    }
    return {
      peer: {
        body: "Sounds good ✌️",
        senderDisplayName: "Maya",
      },
      opal: {
        body: opalLast
          ? `Still holding: ${extractPlanSnippet(opalLast)}. Say yes when you're ready.`
          : "Want me to tighten Saturday morning for you two?",
        signalLabel: "Waiting on your yes",
      },
    };
  }

  if (/chanelle/i.test(key)) {
    if (YES.test(body) || /table|juniper|see you|on my way/i.test(body)) {
      return {
        peer: {
          body: "Can't wait — see you there.",
          senderDisplayName: "Chanelle",
        },
        opal: {
          body: "Juniper & Ivy · Sat 7:30 PM is locked for you two.",
          signalLabel: "Locked in · Juniper & Ivy · Sat 7:30 PM",
        },
        confirmTime: "7:30 PM",
        planLabel: "Juniper & Ivy · 7:30 PM",
      };
    }
    return {
      peer: {
        body: "Just tell me if anything shifts.",
        senderDisplayName: "Chanelle",
      },
      opal: {
        body: "I'll keep Juniper & Ivy · Sat 7:30 warm until you confirm.",
        signalLabel: "Ready · Juniper & Ivy · Sat 7:30 PM",
      },
    };
  }

  if (/alex/i.test(key)) {
    if (/rooftop|shot|gallery|mexico|memory|trip graph|photo/i.test(body)) {
      return {
        peer: {
          body: "Right? That light was unreal — open Trip Graph if you want the whole set.",
          senderDisplayName: "Alex",
        },
        opal: {
          body: "Trip Graph · Mexico City — 14 memories ready when you are.",
          signalLabel: "Trip Graph · Mexico City — 14 memories",
        },
      };
    }
    return {
      peer: {
        body: "Yeah — still hits me too.",
        senderDisplayName: "Alex",
      },
      opal: {
        body: "Want me to pull up the Mexico City Trip Graph?",
        signalLabel: "Trip Graph · Mexico City",
      },
    };
  }

  if (/sabrina/i.test(key)) {
    if (/live|watch|photo|where|meet|coming/i.test(body)) {
      return {
        peer: {
          body: "I'm still here — tap Watch live if you want to see it.",
          senderDisplayName: "Sabrina",
        },
        opal: {
          body: "Sabrina is live nearby. Watch live is ready in this thread.",
          signalLabel: "Live nearby · Sabrina",
        },
      };
    }
    return {
      peer: {
        body: "Haha okay — pulling you in.",
        senderDisplayName: "Sabrina",
      },
      opal: {
        body: "She's nearby and live. Say the word if you want to meet up.",
        signalLabel: "Live nearby",
      },
    };
  }

  if (/juniper|crew/i.test(key)) {
    if (YES.test(body) || /7:30|in|works/i.test(body)) {
      return {
        opal: {
          body: "Noted — still waiting on Sam. 7:30 stays locked for the three who are in.",
          signalLabel: "7:30 locked · Waiting on Sam · 3 of 4",
        },
        planLabel: "3 of 4 going",
      };
    }
    return {
      opal: {
        body: "I'll ping the crew when Sam responds. 7:30 is the working time.",
        signalLabel: "7:30 locked · Waiting on Sam · 3 of 4",
      },
    };
  }

  // —— Generic contextual ack ——
  return {
    opal: {
      body: opalLast
        ? `Got it. Still working from: ${extractPlanSnippet(opalLast)}.`
        : peerLast
          ? `Noted — I'll keep that in mind with ${name}.`
          : "I'm here. Tell me what you want to lock or change.",
      signalLabel: "Listening",
    },
  };
}
