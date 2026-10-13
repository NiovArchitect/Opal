/**
 * Post-OTP permission bootstrap — own clean screen before Meet Opal payoff.
 * Explains value; Allow triggers real native/browser capability requests.
 * Not now is allowed. Already-granted decisions persist via saveMeetOpalPermissions.
 * Browser without ReactNativeWebView stays honest for contacts.
 */
import React, { useMemo, useState } from "react";
import {
  HOLY_SHIT_COPY,
  MEET_OPAL_PERMISSION_ORDER,
  loadMeetOpalPermissions,
  saveMeetOpalPermissions,
  type MeetOpalPermissionKind,
} from "./holyShitCopy";
import { BRAND_ASSETS } from "../brand/brand";
import {
  requestNativeContacts,
  shouldUseNativeContactsBridge,
} from "../nativeHostBridge";
import { getDeviceCoords } from "../device/deviceLocation";

type PermDecision = "pending" | "allowed" | "skipped";

type Props = {
  userId?: string | null;
  onContinue: () => void;
};

function permCopyFor(kind: MeetOpalPermissionKind): { title: string; why: string } {
  switch (kind) {
    case "contacts":
      return { title: HOLY_SHIT_COPY.permContactsTitle, why: HOLY_SHIT_COPY.permContactsWhy };
    case "notifications":
      return {
        title: HOLY_SHIT_COPY.permNotificationsTitle,
        why: HOLY_SHIT_COPY.permNotificationsWhy,
      };
    case "location":
      return { title: HOLY_SHIT_COPY.permLocationTitle, why: HOLY_SHIT_COPY.permLocationWhy };
  }
}

function initialDecisions(): Record<MeetOpalPermissionKind, PermDecision> {
  const saved = loadMeetOpalPermissions();
  const base: Record<MeetOpalPermissionKind, PermDecision> = {
    contacts: "pending",
    notifications: "pending",
    location: "pending",
  };
  if (!saved) return base;
  for (const kind of MEET_OPAL_PERMISSION_ORDER) {
    const v = saved[kind];
    if (v === "allowed" || v === "skipped") base[kind] = v;
  }
  return base;
}

export function PermissionBootstrapPage({ userId, onContinue }: Props) {
  const [permBusy, setPermBusy] = useState<MeetOpalPermissionKind | null>(null);
  const [permDecisions, setPermDecisions] = useState(initialDecisions);
  const [contactsHint, setContactsHint] = useState<string | null>(null);

  const allDecided = useMemo(
    () =>
      MEET_OPAL_PERMISSION_ORDER.every(
        (kind) => permDecisions[kind] === "allowed" || permDecisions[kind] === "skipped",
      ),
    [permDecisions],
  );

  const markPerm = (kind: MeetOpalPermissionKind, decision: PermDecision) => {
    setPermDecisions((prev) => {
      const next = { ...prev, [kind]: decision };
      saveMeetOpalPermissions(next, userId ?? undefined);
      return next;
    });
  };

  const requestPermission = async (kind: MeetOpalPermissionKind) => {
    if (permBusy) return;
    if (permDecisions[kind] !== "pending") return;
    setPermBusy(kind);
    try {
      if (kind === "contacts") {
        if (shouldUseNativeContactsBridge()) {
          const res = await requestNativeContacts({ mode: "search", query: "a", limit: 1 });
          if (res.status === "denied") {
            setContactsHint(HOLY_SHIT_COPY.contactsUnavailableTyping);
            markPerm(kind, "skipped");
            return;
          }
          markPerm(kind, "allowed");
          return;
        }
        const nav = navigator as Navigator & {
          contacts?: {
            select: (props: string[], opts: { multiple: boolean }) => Promise<unknown>;
          };
        };
        if (nav.contacts?.select) {
          try {
            await nav.contacts.select(["name", "tel"], { multiple: false });
            markPerm(kind, "allowed");
          } catch {
            markPerm(kind, "skipped");
          }
          return;
        }
        // Honest browser fallback — no fake contact access.
        setContactsHint(HOLY_SHIT_COPY.contactsUnavailableTyping);
        markPerm(kind, "skipped");
        return;
      }
      if (kind === "notifications") {
        try {
          if (typeof Notification !== "undefined" && Notification.requestPermission) {
            const result = await Notification.requestPermission();
            markPerm(kind, result === "granted" ? "allowed" : "skipped");
            return;
          }
        } catch {
          /* adapt */
        }
        markPerm(kind, "skipped");
        return;
      }
      if (kind === "location") {
        const coords = await getDeviceCoords({ forceRefresh: true });
        markPerm(kind, coords ? "allowed" : "skipped");
        return;
      }
      markPerm(kind, "allowed");
    } finally {
      setPermBusy(null);
    }
  };

  return (
    <div
      className="hs-meet-opal hs-permission-bootstrap"
      data-testid="permission-bootstrap"
      data-first-run-stage="permission_bootstrap"
      role="main"
      aria-label="Permissions"
    >
      <div className="hs-meet-atmosphere" aria-hidden />
      <div className="hs-meet-top">
        <span className="hs-meet-skip-spacer" aria-hidden />
        <div className="hs-meet-orb-wrap">
          <img
            className="hs-perm-bootstrap-lockup"
            src={`${BRAND_ASSETS.opalCharacter}?v=founder-reality-repair-2`}
            alt=""
            width={88}
            height={88}
            draggable={false}
            data-brand-role="character-lockup"
            data-brand-source="opal-character"
            data-testid="permission-bootstrap-lockup"
          />
        </div>
      </div>

      <div className="hs-meet-scroll">
        <div className="hs-meet-thread">
          <div className="hs-line hs-line-opal" data-testid="permission-bootstrap-intro">
            <div className="hs-line-body">
              <p className="hs-greeting-headline">Set up what Opal can use</p>
              <p className="hs-greeting-subhead">
                Choose what you&apos;re comfortable sharing. You can change this later.
              </p>
            </div>
          </div>

          <div className="hs-perm-composer hs-meet-section" data-testid="hs-permissions">
            <ul className="hs-perm-list" data-testid="hs-perm-list">
              {MEET_OPAL_PERMISSION_ORDER.map((kind) => {
                const copy = permCopyFor(kind);
                const decision = permDecisions[kind];
                return (
                  <li
                    key={kind}
                    className="hs-perm-row"
                    data-testid={`hs-perm-row-${kind}`}
                    data-perm-kind={kind}
                    data-perm-decision={decision}
                  >
                    <div className="hs-perm-row-copy">
                      <span className="hs-perm-row-title">{copy.title}</span>
                      <span className="hs-perm-row-why">{copy.why}</span>
                    </div>
                    <div className="hs-perm-row-actions" role="group" aria-label={copy.title}>
                      {decision === "allowed" ? (
                        <button
                          type="button"
                          className="hs-pill hs-pill-primary hs-perm-allow hs-perm-granted"
                          data-testid={`hs-perm-allow-${kind}`}
                          data-perm-state="granted"
                          aria-pressed="true"
                          disabled
                        >
                          Allowed
                        </button>
                      ) : decision === "skipped" ? (
                        <button
                          type="button"
                          className="hs-pill hs-perm-skip hs-perm-not-now"
                          data-testid={`hs-perm-skip-${kind}`}
                          data-perm-state="declined"
                          aria-pressed="true"
                          disabled
                        >
                          Not now
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="hs-pill hs-pill-primary hs-perm-allow"
                            data-testid={`hs-perm-allow-${kind}`}
                            data-perm-state="pending"
                            disabled={permBusy === kind}
                            onClick={() => void requestPermission(kind)}
                          >
                            {HOLY_SHIT_COPY.permAllow}
                          </button>
                          <button
                            type="button"
                            className="hs-pill hs-perm-skip hs-perm-not-now"
                            data-testid={`hs-perm-skip-${kind}`}
                            data-perm-state="pending"
                            disabled={permBusy === kind}
                            onClick={() => markPerm(kind, "skipped")}
                          >
                            {HOLY_SHIT_COPY.permNotNow}
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {contactsHint ? (
              <p className="hs-contacts-status" role="status" data-testid="permission-bootstrap-contacts-hint">
                {contactsHint}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="hs-meet-sticky-continue">
        <button
          type="button"
          className="hs-meet-send hs-meet-send-block"
          data-testid="permission-bootstrap-continue"
          disabled={!allDecided}
          onClick={onContinue}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
