import React from "react";
import { tapCallMicrophone } from "../realtime/CallClient";

/**
 * Repair #19 polish, Cluster F (P10a) - participant states on the
 * connected call surface, in the indicator language, driven ONLY
 * by real call signals:
 *
 * - "You - Muted": TRUE. The surface's own mute state, wired to
 *   CallClient.setMuted (the local track's enabled flag).
 * - "You - Speaking": TRUE, from this device's real microphone
 *   level. The hook below reads the live call mic's clone (the
 *   same tap Assist uses) through an AnalyserNode and reports
 *   speaking while the measured level is over threshold, with a
 *   short hold so the word does not flicker. No stream, no level,
 *   no claim: when the tap is unavailable the row simply carries
 *   no speaking state.
 * - The peer's muted / speaking states: HONESTLY ABSENT. The
 *   stack exposes no remote signal to this surface - CallClient
 *   never surfaces remote-track mute events and no channel
 *   message carries a peer's mute - so the peer row renders the
 *   peer's name and the connected truth only, never an invented
 *   mute or speaking state. (Wiring point for a future wave:
 *   CallClient's peer connection ontrack / track.onmute plus a
 *   call-channel "mute" push.)
 *
 * Presentation pick (novelty review, see polish-incall-report):
 * quiet rows with state WORDS, not avatar halos or waveform bars.
 * A halo pulse per speaker would borrow the live pulse's signature
 * for a second meaning and would demand a peer signal we do not
 * have; words in the indicator language stay truthful and calm.
 */
export type ParticipantStateModel = {
  selfLabel: "Muted" | "Speaking" | "On call";
  selfTone: "muted" | "speaking" | "oncall";
  peerLabel: "On call";
};

export function participantStateModel(input: {
  muted: boolean;
  selfSpeaking: boolean;
}): ParticipantStateModel {
  if (input.muted) return { selfLabel: "Muted", selfTone: "muted", peerLabel: "On call" };
  if (input.selfSpeaking)
    return { selfLabel: "Speaking", selfTone: "speaking", peerLabel: "On call" };
  return { selfLabel: "On call", selfTone: "oncall", peerLabel: "On call" };
}

const SPEAKING_RMS_THRESHOLD = 0.045;
const SPEAKING_HOLD_MS = 400;

/**
 * This device's speaking state from its real mic level. Polls for
 * the live call's mic tap (the CallClient registers it when media
 * starts), then samples the analyser on an interval - no render
 * loop, no audio is recorded or sent anywhere by this hook.
 */
export function useLocalSpeaking(callId: string | null, enabled: boolean, muted: boolean): boolean {
  const [speaking, setSpeaking] = React.useState(false);

  React.useEffect(() => {
    if (!enabled || !callId || muted) {
      setSpeaking(false);
      return;
    }
    let stopped = false;
    let ctx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let stream: MediaStream | null = null;
    let lastAbove = 0;
    const data = new Uint8Array(128);

    const acquireTimer = window.setInterval(() => {
      if (stopped || analyser) return;
      const tapped = tapCallMicrophone(callId);
      if (!tapped) return;
      try {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        ctx = new Ctor();
        const source = ctx.createMediaStreamSource(tapped);
        analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        stream = tapped;
      } catch {
        analyser = null;
      }
    }, 500);

    const sampleTimer = window.setInterval(() => {
      if (stopped || !analyser) return;
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      const now = Date.now();
      if (rms >= SPEAKING_RMS_THRESHOLD) lastAbove = now;
      setSpeaking(rms >= SPEAKING_RMS_THRESHOLD || now - lastAbove < SPEAKING_HOLD_MS);
    }, 160);

    return () => {
      stopped = true;
      window.clearInterval(acquireTimer);
      window.clearInterval(sampleTimer);
      stream?.getTracks().forEach((track) => track.stop());
      void ctx?.close().catch(() => {});
      setSpeaking(false);
    };
  }, [callId, enabled, muted]);

  return speaking;
}

export function ParticipantStates({
  peerName,
  muted,
  selfSpeaking,
}: {
  peerName: string;
  muted: boolean;
  selfSpeaking: boolean;
}) {
  const model = participantStateModel({ muted, selfSpeaking });
  return (
    <div className="call-participants" data-testid="call-participants">
      <p className="call-participant" data-testid="call-participant-self">
        <span
          className="call-participant-dot"
          data-participant-tone={model.selfTone}
          aria-hidden
        />
        <span className="call-participant-name">You</span>
        <span className="call-participant-state" data-testid="call-self-state">
          {model.selfLabel}
        </span>
      </p>
      <p className="call-participant" data-testid="call-participant-peer">
        <span className="call-participant-dot" data-participant-tone="oncall" aria-hidden />
        <span className="call-participant-name">{peerName}</span>
        <span className="call-participant-state" data-testid="call-peer-state">
          {model.peerLabel}
        </span>
      </p>
    </div>
  );
}
