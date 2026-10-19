/**
 * Repair #19 BS-11 — the CONVERSATION SHARE SHEET. Before this, the
 * conversation overflow's Share handed the platform share sheet /
 * clipboard the bare text "Opal chat: <title> (<anchor>)" — a
 * reference that resolves to nothing for whoever receives it.
 *
 * This sheet is W13's plan share card law applied to a
 * conversation: the recipient gets a real card's worth of details —
 * the conversation's title, the anchor it is filed under, and the
 * anchor plan's own card lines when there is one — and the sheet's
 * ONE action is Copy details (exactly the lines the card shows).
 * There is no fabricated link: a conversation carries no share URL,
 * and the card says in words what sharing it means. Message content
 * is never on the card — a conversation with Opal is private to its
 * account, and the card states that too.
 */
import React, { useState } from "react";
import { OrbMark } from "../../brand/orb/OrbMark";
import { TopLayer } from "../TopLayer";
import type { ConversationShareCardProjection } from "../../c2/shell/projections";
import { useDismissableSurface } from "./useDismissable";

export function ConversationShareSheet({
  card,
  onClose,
}: {
  card: ConversationShareCardProjection;
  onClose: () => void;
}) {
  const [note, setNote] = useState<string | null>(null);
  const panelRef = useDismissableSurface<HTMLDivElement>({ open: true, onClose });
  const copy = async () => {
    const text = card.textLines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setNote("Copied. Paste it anywhere to share these details.");
    } catch {
      setNote("Copy was not available here. The details above are the full card.");
    }
  };
  return (
    <TopLayer band="sheet">
      <div className="c2s-scrim" onClick={onClose}>
        <div
          ref={panelRef}
          className="c2s-sheet"
          role="dialog"
          aria-modal="true"
          aria-label={`Share ${card.title}`}
          data-testid="conversation-share-sheet"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="c2s-sheet-title">Share this chat</p>
          <article className="c2-plan-card r19-share-card" data-testid="conversation-share-card">
            <div className="c2-plan-card-top">
              <span className="c1-kicker">OPAL CHAT</span>
              <span className="r19-share-brand" aria-hidden>
                <OrbMark size={44} />
                <span className="r19-share-wordmark">Opal</span>
              </span>
            </div>
            <h3 className="c2-plan-title">{card.title}</h3>
            {card.anchorLine ? <p className="c2-plan-where">{card.anchorLine}</p> : null}
            {card.plan ? (
              <div data-testid="conversation-share-plan">
                <p className="c2-plan-when">{card.plan.title}</p>
                <p className="c2-plan-where">{card.plan.stateLabel}</p>
                {card.plan.whenLine ? <p className="c2-plan-where">{card.plan.whenLine}</p> : null}
                {card.plan.whereLine ? <p className="c2-plan-where">{card.plan.whereLine}</p> : null}
              </div>
            ) : null}
            <p className="c2-plan-where">
              This shares the chat's details. The conversation itself stays private to your
              account — nothing here opens it.
            </p>
          </article>
          <button
            type="button"
            className="c2s-btn-primary"
            data-testid="conversation-share-copy"
            onClick={() => void copy()}
            style={{ marginTop: 12, width: "100%" }}
          >
            Copy details
          </button>
          {note ? (
            <p className="c2s-card-line" data-testid="conversation-share-note" role="status">
              {note}
            </p>
          ) : null}
          <button type="button" className="c2s-btn-text" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </TopLayer>
  );
}
