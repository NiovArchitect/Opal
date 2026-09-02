/**
 * Call surfaces  -  exact dated authorities:
 *   Incoming 618:581 · Audio 618:599 · Video 618:620 · Group 618:642
 * Presentation only. Real AV dependency-gated. NO DOCK.
 * Portaled to document.body.
 *
 * Geometry is absolute inside a locked 390×844 stage so Figma x/y/w/h
 * equal stage-relative (and viewport-absolute when viewport is 390×844).
 */
import React from "react";
import { createPortal } from "react-dom";

export type CallKind = "incoming" | "audio" | "video" | "group";
export type CallDirection = "incoming" | "outgoing";

type Props = {
  kind: CallKind;
  /** Event-owned direction. Incoming UI (Answer/Decline) only when direction===incoming. */
  direction?: CallDirection;
  peerName: string;
  peerAvatarSrc?: string;
  isGroup?: boolean;
  memberCount?: number;
  participants?: string[];
  onDecline: () => void;
  onAnswer?: () => void;
  onEnd: () => void;
  onMute?: () => void;
  onToggleVideo?: () => void;
  onSpeaker?: () => void;
  muted?: boolean;
  videoOn?: boolean;
  speakerOn?: boolean;
};

const DEFAULT_GROUP_PARTICIPANTS = ["Sadeil", "Chanelle", "Maya", "Jordan"];

/** Exact Figma tile geometry within control rails (video/group). */
/** Tile left within rail (rail at x=16). Viewport x = 16 + left → 22/108/194/280. */
const VIDEO_TILES = [
  { id: "mute", label: "Mute", x: 6, testId: "call-mute" },
  { id: "video", label: "Video", x: 92, testId: "call-video-toggle" },
  { id: "speaker", label: "Speaker", x: 178, testId: "call-speaker" },
  { id: "end", label: "End", x: 264, testId: "call-end" },
] as const;

function ControlTile({
  testId,
  label,
  tone,
  pressed,
  onClick,
  end,
}: {
  testId: string;
  label: string;
  tone: "cyan" | "violet" | "aqua" | "coral" | "rail";
  pressed?: boolean;
  onClick?: () => void;
  end?: boolean;
}) {
  return (
    <button
      type="button"
      className={`call-exact-tile call-tone-${tone}${pressed ? " is-on" : ""}${end ? " is-end" : ""}`}
      data-testid={testId}
      data-tone={tone}
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
    >
      <span className="call-exact-tile-label">{label}</span>
    </button>
  );
}

export function CallSurface({
  kind,
  direction,
  peerName,
  peerAvatarSrc,
  memberCount = 4,
  participants,
  onDecline,
  onAnswer,
  onEnd,
  onMute,
  onToggleVideo,
  onSpeaker,
  muted = false,
  videoOn = true,
  speakerOn = true,
}: Props) {
  const initial = peerName.slice(0, 1).toUpperCase();
  const resolvedDirection: CallDirection =
    direction ?? (kind === "incoming" ? "incoming" : "outgoing");
  // FW-D1: Answer/Decline only for true inbound. Never for user-initiated outgoing.
  const isIncoming = resolvedDirection === "incoming" && kind === "incoming";
  const isVideo = kind === "video";
  const isAudio = kind === "audio";
  const isGroupCall = kind === "group";
  const groupNames = (participants?.length ? participants : DEFAULT_GROUP_PARTICIPANTS).slice(
    0,
    4,
  );

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") (isIncoming ? onDecline : onEnd)();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isIncoming, onDecline, onEnd]);

  // FW-D2: immersive call owns the viewport — mark body so underlying thread chrome cannot paint through.
  React.useEffect(() => {
    document.body.dataset.callSurfaceOpen = "1";
    document.body.dataset.callDirection = resolvedDirection;
    return () => {
      delete document.body.dataset.callSurfaceOpen;
      delete document.body.dataset.callDirection;
    };
  }, [resolvedDirection]);

  const figma =
    kind === "incoming"
      ? "618:581"
      : kind === "audio"
        ? "618:599"
        : kind === "video"
          ? "618:620"
          : "618:642";

  const title =
    kind === "incoming"
      ? `${peerName} is calling`
      : isGroupCall
        ? peerName || "Juniper crew"
        : peerName;

  const subtitle = isIncoming
    ? "Direct connection · audio call"
    : isGroupCall
      ? `${memberCount} people · exact group membership`
      : isVideo
        ? "Video call · 00:12"
        : "00:12";

  const tileHandlers: Record<string, (() => void) | undefined> = {
    mute: onMute,
    video: onToggleVideo,
    speaker: onSpeaker,
    end: onEnd,
  };
  const tilePressed: Record<string, boolean | undefined> = {
    mute: muted,
    video: videoOn,
    speaker: speakerOn,
  };

  const railIcon: Record<string, string> = {
    mute: "/figma-v2/calls/icon-mute.svg",
    video: "/figma-v2/calls/icon-video.svg",
    speaker: "/figma-v2/calls/icon-speaker.svg",
    end: "/figma-v2/calls/icon-end.svg",
  };

  const railTiles = (railY: number, railTestId: string) => (
    <div
      className="call-exact-rail"
      data-testid={railTestId}
      data-control-order="mute-video-speaker-end"
      data-flip="false"
      style={{ top: railY }}
    >
      {VIDEO_TILES.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`call-exact-rail-tile call-tone-${t.id === "mute" ? "cyan" : t.id === "video" ? "violet" : t.id === "speaker" ? "aqua" : "coral"}${t.id === "end" ? " is-end" : ""}${
            tilePressed[t.id] ? " is-on" : ""
          }`}
          style={{ left: t.x }}
          data-testid={t.testId}
          aria-label={t.label}
          aria-pressed={tilePressed[t.id]}
          onClick={tileHandlers[t.id]}
        >
          <img className="call-exact-rail-icon" src={railIcon[t.id]} alt="" width={18} height={18} aria-hidden />
          <span className="call-exact-rail-label">{t.label}</span>
        </button>
      ))}
    </div>
  );

  const node = (
    <div
      className={`call-surface call-surface-${kind} call-exact-390`}
      data-testid="call-surface"
      data-call-kind={kind}
      data-call-direction={resolvedDirection}
      data-av-transport="DEPENDENCY"
      data-outgoing-ringing-ui="NOT_CURRENT_AUTHORITY"
      data-figma-node={figma}
      data-member-nav="false"
      data-dock="false"
      data-flip-present="false"
      data-stage-w="390"
      data-stage-h="844"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="call-surface-bg" aria-hidden />

      {/* Title / subtitle  -  shared top band */}
      <p
        className="call-exact-title"
        data-testid="call-status"
        data-figma-rect={isIncoming ? "20,76,350,38" : "20,76,350,38"}
      >
        {title}
      </p>
      <p className="call-exact-subtitle" data-testid="call-meta">
        {subtitle}
      </p>

      {isIncoming ? (
        <>
          {/* 618:581 identity 160×160 @115,188 */}
          <div className="call-exact-incoming-avatar" data-testid="call-incoming-avatar">
            {peerAvatarSrc ? (
              <img src={peerAvatarSrc} alt="" />
            ) : (
              <span>{initial}</span>
            )}
          </div>
          <h1 className="call-exact-incoming-name" data-testid="call-incoming-name">
            {peerName}
          </h1>
          <div className="call-exact-incoming-assist" data-testid="call-opal-assist">
            <p className="call-assist-title">Opal Assist · preference on</p>
            <p className="call-assist-body">
              Activates for this call when participants allow it.
            </p>
            <p className="call-assist-disclosure">
              Opal may help remember plans and preferences. No hidden recording or transcription.
            </p>
          </div>
          <button
            type="button"
            className="call-exact-decline"
            data-testid="call-decline"
            data-figma-rect="34,632,150,56"
            onClick={onDecline}
          >
            <img
              className="call-exact-decline-icon"
              src="/figma-v2/calls/icon-decline.svg"
              alt=""
              width={18}
              height={18}
              aria-hidden
            />
            Decline
          </button>
          <button
            type="button"
            className="call-exact-answer"
            data-testid="call-answer"
            data-figma-rect="206,632,150,56"
            onClick={() => onAnswer?.()}
          >
            <img
              className="call-exact-answer-icon"
              src="/figma-v2/calls/icon-answer.svg"
              alt=""
              width={18}
              height={18}
              aria-hidden
            />
            Answer
          </button>
        </>
      ) : null}

      {isAudio ? (
        <>
          {/* 618:599 portrait 24,132 342×404 */}
          <div
            className="call-exact-audio-portrait"
            data-testid="call-audio-portrait"
            data-figma-rect="24,132,342,404"
          >
            {peerAvatarSrc ? (
              <img src={peerAvatarSrc} alt="" />
            ) : (
              <span className="call-exact-audio-fallback">{initial}</span>
            )}
          </div>
          {/* Assist 20,554 350×76 */}
          <div
            className="call-exact-audio-assist"
            data-testid="call-opal-assist"
            data-figma-rect="20,554,350,76"
          >
            <p className="call-assist-title">Opal Assist</p>
            <p className="call-assist-on">On for both of you</p>
            <p className="call-assist-body">Helps remember useful preferences and plans.</p>
          </div>
          {/* Mute / Video / Speaker row  -  cyan / violet / aqua */}
          <div data-testid="call-controls" data-control-order="mute-video-speaker" data-flip="false">
            <ControlTile
              testId="call-mute"
              label="Mute"
              tone="cyan"
              pressed={muted}
              onClick={onMute}
            />
            <ControlTile
              testId="call-video-toggle"
              label="Video"
              tone="violet"
              pressed={videoOn}
              onClick={onToggleVideo}
            />
            <ControlTile
              testId="call-speaker"
              label="Speaker"
              tone="aqua"
              pressed={speakerOn}
              onClick={onSpeaker}
            />
          </div>
          <button
            type="button"
            className="call-exact-audio-end call-tone-coral"
            data-testid="call-end"
            data-figma-rect="146,736,98,46"
            aria-label="End"
            onClick={onEnd}
          >
            End
          </button>
        </>
      ) : null}

      {isVideo ? (
        <>
          {/* Remote video 16,154 358×458  -  dark truthful state (no fabricated feed) */}
          <div
            className="call-exact-video-stage"
            data-testid="call-video-stage"
            data-figma-rect="16,154,358,458"
            data-video-truth="dark_stage"
          >
            <span className="call-exact-video-peer-name">{peerName}</span>
            <div className="call-exact-video-self" aria-hidden>
              <span className="call-exact-video-self-label">You</span>
            </div>
          </div>
          {/* Assist 20,626 350×50 */}
          <div
            className="call-exact-video-assist"
            data-testid="call-opal-assist"
            data-figma-rect="20,626,350,50"
          >
            <p className="call-assist-title">Opal Assist · on</p>
            <p className="call-assist-on">Both allowed</p>
          </div>
          {railTiles(692, "call-controls")}
        </>
      ) : null}

      {isGroupCall ? (
        <>
          {/* Participants 168×166  -  Figma shows dark tiles + names, no photography */}
          <div
            className="call-exact-group-slot"
            data-testid="call-group-slot-0"
            data-participant={groupNames[0]}
            data-figma-rect="20,162,168,166"
            style={{ left: 20, top: 162 }}
          >
            <span className="call-exact-group-name">{groupNames[0]}</span>
          </div>
          <div
            className="call-exact-group-slot"
            data-testid="call-group-slot-1"
            data-participant={groupNames[1]}
            data-figma-rect="202,162,168,166"
            style={{ left: 202, top: 162 }}
          >
            <span className="call-exact-group-name">{groupNames[1]}</span>
          </div>
          <div
            className="call-exact-group-slot"
            data-testid="call-group-slot-2"
            data-participant={groupNames[2]}
            data-figma-rect="20,346,168,166"
            style={{ left: 20, top: 346 }}
          >
            <span className="call-exact-group-name">{groupNames[2]}</span>
          </div>
          <div
            className="call-exact-group-slot"
            data-testid="call-group-slot-3"
            data-participant={groupNames[3]}
            data-figma-rect="202,346,168,166"
            style={{ left: 202, top: 346 }}
          >
            <span className="call-exact-group-name">{groupNames[3]}</span>
          </div>
          <div
            className="call-exact-group-assist"
            data-testid="call-opal-assist"
            data-figma-rect="20,532,350,72"
          >
            <p className="call-assist-title">Opal Assist</p>
            <p className="call-assist-body">
              Only active when required group consent exists.
            </p>
          </div>
          {railTiles(636, "call-controls")}
          <p className="call-exact-group-footer" data-testid="call-group-leave-law">
            Leaving the call does not leave the group or any Graph.
          </p>
        </>
      ) : null}
    </div>
  );

  if (typeof document === "undefined") return node;
  return createPortal(node, document.body);
}
