import React, { useMemo, useState } from "react";
import { createInvitation, normalizePhoneInput } from "../api/productClient";

export type FindPeopleMode = "chooser" | "manual" | "contacts" | "confirm" | "done";

type SelectedPerson = {
  id: string;
  label: string;
  phone: string;
  source: "manual" | "contacts" | "picker";
};

type Props = {
  open: boolean;
  onClose: () => void;
  bearer?: string;
  onInvited?: () => void;
};

/** Contact / select trust (founder-approved). Selected-only invites; no continuous sync language. */
export const FIND_PEOPLE_COPY = {
  emptyTitle: "Your people will show up here",
  emptyBody: "Invite someone you know to begin.",
  permissionLine: "Only the people you select are invited.",
  chooserIntro: "Choose people you already know.",
  skip: "Skip for now",
} as const;

const PERMISSION_LINE = FIND_PEOPLE_COPY.permissionLine;

export function FindPeopleFlow({ open, onClose, bearer, onInvited }: Props) {
  const [mode, setMode] = useState<FindPeopleMode>("chooser");
  const [manualPhone, setManualPhone] = useState("");
  const [manualLabel, setManualLabel] = useState("");
  const [selected, setSelected] = useState<SelectedPerson[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [contactDenied, setContactDenied] = useState(false);

  const canConfirm = selected.length > 0;

  const pickerSupported = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    const nav = navigator as Navigator & {
      contacts?: { select: (props: string[], opts: { multiple: boolean }) => Promise<unknown[]> };
    };
    return Boolean(nav.contacts && typeof nav.contacts.select === "function");
  }, []);

  if (!open) return null;

  const reset = () => {
    setMode("chooser");
    setManualPhone("");
    setManualLabel("");
    setSelected([]);
    setError(null);
    setShareUrl(null);
    setStatus(null);
    setContactDenied(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const addManual = () => {
    setError(null);
    try {
      const phone = normalizePhoneInput(manualPhone);
      if (!phone || phone.length < 11) {
        setError("Enter a valid phone number.");
        return;
      }
      const label = manualLabel.trim() || "Someone you know";
      setSelected((prev) => {
        if (prev.some((p) => p.phone === phone)) return prev;
        return [
          ...prev,
          {
            id: `manual-${phone}`,
            label,
            phone,
            source: "manual",
          },
        ];
      });
      setMode("confirm");
    } catch {
      setError("Enter a valid phone number.");
    }
  };

  const tryContactPicker = async () => {
    setError(null);
    setContactDenied(false);
    const nav = navigator as Navigator & {
      contacts?: {
        select: (
          props: string[],
          opts: { multiple: boolean },
        ) => Promise<Array<{ name?: string[]; tel?: string[] }>>;
      };
    };
    if (!nav.contacts?.select) {
      setMode("manual");
      setStatus("Contact access is not available here. Invite with a number instead.");
      return;
    }
    try {
      const rows = await nav.contacts.select(["name", "tel"], { multiple: true });
      const next: SelectedPerson[] = [];
      for (const row of rows || []) {
        const tel = (row.tel || []).find((t) => t && t.trim());
        if (!tel) continue;
        let phone: string;
        try {
          phone = normalizePhoneInput(tel);
        } catch {
          continue;
        }
        const label = (row.name && row.name[0]) || "Someone you know";
        next.push({
          id: `pick-${phone}`,
          label,
          phone,
          source: "picker",
        });
      }
      if (!next.length) {
        setStatus("No phone numbers found in that selection.");
        setMode("manual");
        return;
      }
      setSelected(next);
      setMode("confirm");
    } catch {
      setContactDenied(true);
      setMode("manual");
      setStatus("You can still invite someone with their number.");
    }
  };

  const confirmInvites = async () => {
    if (!canConfirm || busy) return;
    setBusy(true);
    setError(null);
    setStatus("Sending invitation…");
    try {
      let lastShare: string | null = null;
      for (const person of selected) {
        const res = await createInvitation(
          person.phone,
          person.label,
          "Want to connect on Opal?",
          bearer,
          person.source === "manual" ? "manual" : "selected_contact",
        );
        const token = (res as { share?: { token?: string } }).share?.token;
        if (token) {
          lastShare = `${window.location.origin}/?invite=${encodeURIComponent(token)}`;
        }
      }
      setShareUrl(lastShare);
      setMode("done");
      setStatus("Invitation ready. They choose whether to accept.");
      onInvited?.();
    } catch (e) {
      setError((e as Error).message || "Could not invite this person.");
      setStatus(null);
    } finally {
      setBusy(false);
    }
  };

  const copyShare = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setStatus("Link copied.");
    } catch {
      setStatus("Copy the link manually.");
    }
  };

  const shareNative = async () => {
    if (!shareUrl || !navigator.share) return;
    try {
      await navigator.share({
        title: "Opal",
        text: "Join me on Opal. Life starts in conversation.",
        url: shareUrl,
      });
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="find-people-overlay" role="dialog" aria-modal="true" aria-labelledby="find-people-title">
      <div className="find-people-sheet lumen-card">
        <header className="find-people-header">
          <h2 id="find-people-title">People you know</h2>
          <button type="button" className="btn ghost" onClick={close} aria-label="Close">
            Close
          </button>
        </header>

        {mode === "chooser" ? (
          <div className="find-people-body">
            <p className="lede muted-lede">Your people will show up here.</p>
            <p className="permission-line">{PERMISSION_LINE}</p>
            <div className="find-people-actions">
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  if (pickerSupported) void tryContactPicker();
                  else {
                    setMode("manual");
                    setStatus("Invite with a number, or share a link after.");
                  }
                }}
              >
                Select from contacts
              </button>
              <button type="button" className="btn" onClick={() => setMode("manual")}>
                Invite manually
              </button>
              <button type="button" className="btn ghost" onClick={close}>
                Skip for now
              </button>
            </div>
          </div>
        ) : null}

        {mode === "manual" ? (
          <div className="find-people-body">
            <p className="permission-line">{PERMISSION_LINE}</p>
            {contactDenied ? (
              <p className="status-line" role="status">
                Contact access was not available. Invite with a number instead.
              </p>
            ) : null}
            <label className="field">
              <span>Their name</span>
              <input
                value={manualLabel}
                onChange={(e) => setManualLabel(e.target.value)}
                placeholder="Jordan"
                autoComplete="name"
              />
            </label>
            <label className="field">
              <span>Phone number</span>
              <input
                value={manualPhone}
                onChange={(e) => setManualPhone(e.target.value)}
                placeholder="+1 202 555 0102"
                inputMode="tel"
                autoComplete="tel"
              />
            </label>
            {error ? <p className="error-line">{error}</p> : null}
            {status ? (
              <p className="status-line" role="status">
                {status}
              </p>
            ) : null}
            <div className="find-people-actions">
              <button type="button" className="btn primary" onClick={addManual}>
                Continue
              </button>
              <button type="button" className="btn ghost" onClick={() => setMode("chooser")}>
                Back
              </button>
            </div>
          </div>
        ) : null}

        {mode === "confirm" ? (
          <div className="find-people-body">
            <p className="lede">Confirm who to invite</p>
            <p className="muted-lede">Nothing is sent until you confirm.</p>
            <ul className="selected-people">
              {selected.map((p) => (
                <li key={p.id}>
                  <strong>{p.label}</strong>
                  <span className="muted-lede"> {p.phone}</span>
                </li>
              ))}
            </ul>
            {error ? <p className="error-line">{error}</p> : null}
            {status ? (
              <p className="status-line" role="status">
                {status}
              </p>
            ) : null}
            <div className="find-people-actions">
              <button
                type="button"
                className="btn primary"
                disabled={!canConfirm || busy}
                onClick={() => void confirmInvites()}
              >
                {busy ? "Sending…" : "Send invitation"}
              </button>
              <button type="button" className="btn ghost" onClick={() => setMode("chooser")}>
                Back
              </button>
            </div>
          </div>
        ) : null}

        {mode === "done" ? (
          <div className="find-people-body">
            <p className="lede">Invitation ready</p>
            <p className="muted-lede">They choose whether to accept. No relationship is created until they do.</p>
            {shareUrl ? (
              <div className="share-box">
                <code className="share-url">{shareUrl}</code>
                <div className="find-people-actions">
                  <button type="button" className="btn" onClick={() => void copyShare()}>
                    Copy link
                  </button>
                  {"share" in navigator ? (
                    <button type="button" className="btn" onClick={() => void shareNative()}>
                      Share
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
            {status ? (
              <p className="status-line" role="status">
                {status}
              </p>
            ) : null}
            <div className="find-people-actions">
              <button type="button" className="btn primary" onClick={close}>
                Done
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}


