/**
 * Dated Direct 618:348 / Group 618:451 CONTENT geometry.
 * Human bubbles + Opal intelligence plates at exact Figma rects.
 * Dynamic copy fills slots; chrome geometry is fixed.
 */
import React from "react";

export type DatedMsg = {
  id: string;
  body: string;
  from?: "me" | "them" | string;
  senderName?: string;
  isOpal?: boolean;
};

type DirectProps = {
  mode: "direct";
  peerName: string;
  messages: DatedMsg[];
  plate: {
    title?: string | null;
    when?: string | null;
    provider?: string | null;
    leave?: string | null;
    travel?: string | null;
    availability?: string | null;
  };
};

type GroupProps = {
  mode: "group";
  messages: DatedMsg[];
  plate: {
    goingLine?: string | null;
    arrivalLine?: string | null;
    provider?: string | null;
  };
};

type Props = DirectProps | GroupProps;

function firstSelf(messages: DatedMsg[]) {
  return messages.find((m) => !m.isOpal && (m.from === "me" || /you/i.test(m.senderName || "")));
}
function firstPeer(messages: DatedMsg[], excludeNames: string[] = []) {
  return messages.find(
    (m) =>
      !m.isOpal &&
      m.from !== "me" &&
      !/you/i.test(m.senderName || "") &&
      !excludeNames.some((n) => (m.senderName || "").toLowerCase().includes(n.toLowerCase())),
  );
}
function byName(messages: DatedMsg[], name: string) {
  return messages.find(
    (m) => !m.isOpal && (m.senderName || "").toLowerCase().includes(name.toLowerCase()),
  );
}

export function DatedConversationContent(props: Props) {
  if (props.mode === "direct") {
    const you = firstSelf(props.messages);
    const peer = firstPeer(props.messages);
    const youBody = you?.body || "Juniper tonight?";
    const peerBody = peer?.body || "I can do 7:30.";
    const peerLabel = props.peerName || peer?.senderName || "Chanelle";
    const p = props.plate;
    return (
      <div className="dated-conv dated-direct" data-testid="dated-direct-content" data-figma="618:348">
        <div
          className="dated-bubble dated-you-bubble"
          data-testid="dated-you-bubble"
          data-figma-rect="20,154,238,64"
        >
          <span className="dated-bubble-label">You</span>
          <p className="dated-bubble-body">{youBody}</p>
        </div>
        <div
          className="dated-bubble dated-peer-bubble"
          data-testid="dated-peer-bubble"
          data-figma-rect="114,232,256,64"
          data-sender-name={peerLabel}
        >
          <span className="dated-bubble-label">{peerLabel}</span>
          <p className="dated-bubble-body">{peerBody}</p>
        </div>
        <div
          className="dated-opal-consequence"
          data-testid="dated-opal-consequence"
          data-figma-rect="20,324,350,350"
          data-figma-node="618:371"
        >
          <p className="dated-opal-kicker" data-testid="dated-opal-kicker">
            Opal lined this up
          </p>
          <div className="dated-opal-hero" data-testid="dated-opal-juniper-slot">
            <div
              className="dated-opal-thumb"
              data-testid="dated-opal-juniper-thumb"
              data-figma-node="618:376"
              data-figma-rect="34,386,108,86"
            >
              {/* Founder-seed visual: exact Figma 618:376 fill. Live domain media may hydrate later. */}
              <img
                src="/figma-v2/direct/opal-direct-juniper-618-376.png"
                alt=""
                width={108}
                height={86}
                draggable={false}
              />
            </div>
            <div>
              <p className="dated-opal-title">{p.title || "Juniper & Ivy"}</p>
              <p className="dated-opal-when">{p.when || "Saturday · 7:30 PM"}</p>
            </div>
          </div>
          <div className="dated-opal-slots">
            <div className="dated-opal-slot" data-testid="dated-opal-provider-slot">
              {p.provider || "Table ready"}
            </div>
            <div className="dated-opal-slot" data-testid="dated-opal-leave-slot">
              {p.leave || "Leave 6:55 PM"}
            </div>
            <div className="dated-opal-slot" data-testid="dated-opal-travel-slot">
              {p.travel || "18 min drive"}
            </div>
            <div className="dated-opal-slot" data-testid="dated-opal-availability-slot">
              {p.availability || `${peerLabel} is free`}
            </div>
          </div>
          <p className="dated-opal-quiet" data-testid="dated-opal-quiet">
            Nothing else to do right now.
          </p>
        </div>
      </div>
    );
  }

  // Group 618:451
  const maya = byName(props.messages, "Maya") || firstPeer(props.messages);
  const jordan =
    byName(props.messages, "Jordan") ||
    firstPeer(props.messages, [maya?.senderName || "Maya"]);
  const sabrina =
    byName(props.messages, "Sabrina") ||
    firstPeer(props.messages, [maya?.senderName || "", jordan?.senderName || ""]);
  const g = props.plate;

  return (
    <div className="dated-conv dated-group" data-testid="dated-group-content" data-figma="618:451">
      <div
        className="dated-bubble dated-maya-bubble"
        data-testid="dated-maya-bubble"
        data-figma-rect="20,230,250,58"
        data-sender-name="Maya"
      >
        <span className="dated-bubble-label">Maya</span>
        <p className="dated-bubble-body">{maya?.body || "I can do Saturday."}</p>
      </div>
      <div
        className="dated-bubble dated-jordan-bubble"
        data-testid="dated-jordan-bubble"
        data-figma-rect="94,300,276,58"
        data-sender-name="Jordan"
      >
        <span className="dated-bubble-label">Jordan</span>
        <p className="dated-bubble-body">{jordan?.body || "Running a little behind."}</p>
      </div>
      <div
        className="dated-bubble dated-sabrina-bubble"
        data-testid="dated-sabrina-bubble"
        data-figma-rect="20,370,250,58"
        data-sender-name="Sabrina"
      >
        <span className="dated-bubble-label">Sabrina</span>
        <p className="dated-bubble-body">{sabrina?.body || "I'm in."}</p>
      </div>
      <div
        className="dated-opal-update"
        data-testid="dated-opal-update"
        data-figma-rect="20,456,350,156"
        data-figma-node="618:471"
      >
        <p className="dated-opal-kicker" data-testid="dated-opal-group-kicker">
          ✦ Opal update
        </p>
        <p className="dated-opal-line dated-opal-headline" data-testid="dated-opal-going">
          {g.goingLine || "3 of 4 are going"}
        </p>
        <p className="dated-opal-line dated-opal-support" data-testid="dated-opal-arrival">
          {g.arrivalLine || "Jordan may arrive around 7:40 PM."}
        </p>
        <div className="dated-opal-slot dated-opal-reservation" data-testid="dated-opal-group-provider">
          {g.provider || "Reservation held"}
        </div>
      </div>
    </div>
  );
}

/** Map live thread messages into DatedMsg for the dated layer. */
export function toDatedMessages(
  messages: Array<{
    id: string;
    body: string;
    from?: string;
    senderUserId?: string;
    opalFilament?: boolean;
    opalSystemConsequence?: boolean;
  }>,
  speakerNameById: Map<string, string>,
): DatedMsg[] {
  return messages.map((m) => ({
    id: m.id,
    body: m.body,
    from: m.from,
    senderName: speakerNameById.get(m.id),
    isOpal: !!(m.opalFilament || m.opalSystemConsequence || m.id.startsWith("opal-")),
  }));
}
