import React, { useMemo, useState } from "react";
import { createInvitation, normalizePhoneInput } from "../api/productClient";
import { ContactSuggestPicker } from "./ContactSuggestPicker";
import { shouldUseNativeContactsBridge } from "../nativeHostBridge";

export type FindPeopleMode = "chooser" | "manual" | "contacts" | "confirm" | "done";

type SelectedPerson = {
  id: string;
  label: string;
  phone: string;
  /** Device contact id when chosen from the phone address book (snapshot + link). */
  contact_id?: string;
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
  const [manualLabel, setManualLabel] = useState("");
  const [selected, setSelected] = useState<SelectedPerson[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [contactDenied, setContactDenied] = useState(false);
  const [contactDeniedOnce, setContactDeniedOnce] = useState(false);
  const [contactSheetOpen, setContactSheetOpen] = useState(false);

  const canConfirm = selected.length > 0;

  const pickerSupported = useMemo(() => {
    if (shouldUseNativeContactsBridge()) return true;
    if (typeof navigator === "undefined") return false;
    const nav = navigator as Navigator & {
      contacts?: { select: (props: string[], opts: { multiple: boolean }) => Promise<unknown[]> };
    };
    return Boolean(nav.contacts && typeof nav.contacts.select === "function");
  }, []);

  if (!open) return null;

  const reset = () => {
    setMode("chooser");
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

  const addManualNameOnly = () => {
    setError(null);
    const label = manualLabel.trim();
    if (!label) {
      setError("Type a name, or select from contacts.");
      return;
    }
    setSelected((prev) => {
      if (prev.some((p) => p.label.toLowerCase() === label.toLowerCase())) return prev;
      return [
        ...prev,
        {
          id: `manual-name-${label.toLowerCase().replace(/\s+/g, "-")}`,
          label,
          phone: "",
          source: "manual",
        },
      ];
    });
    setMode("confirm");
    setStatus("Name saved. Opal will resolve their number from contacts when available.");
  };

  const tryContactPicker = async () => {
    setError(null);
    setContactDenied(false);
    // Prefer native Expo contacts bridge (iOS WKWebView) — browser Contact Picker is Chromium-only.
    if (shouldUseNativeContactsBridge()) {
      setContactSheetOpen(true);
      setMode("manual");
      return;
    }
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
      setStatus("Contact access is not available here. Type a name instead — never a phone number.");
      if (!contactDeniedOnce) {
        setContactDeniedOnce(true);
        setContactDenied(true);
      }
      return;
    }
    try {
      const rows = await nav.contacts.select(["name", "tel"], { multiple: true });
      const next: SelectedPerson[] = [];
      for (const row of rows || []) {
        const label = ((row.name && row.name[0]) || "").trim();
        if (!label) continue;
        const tel = (row.tel || []).find((t) => t && t.trim());
        let phone = "";
        if (tel) {
          try {
            phone = normalizePhoneInput(tel);
          } catch {
            phone = tel.trim();
          }
        }
        next.push({
          id: `pick-${phone || label.toLowerCase().replace(/\s+/g, "-")}`,
          label,
          phone,
          source: "picker",
        });
      }
      if (!next.length) {
        setStatus("No contacts selected. Type a name instead.");
        setMode("manual");
        return;
      }
      setSelected(next);
      setMode("confirm");
    } catch {
      setContactDenied(true);
      setContactDeniedOnce(true);
      setMode("manual");
      setStatus("You can enable contacts later in Settings to pick people directly.");
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
        if (!person.phone) {
          setStatus(`${person.label} saved by name. Invite when their number is available.`);
          continue;
        }
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
                Type a name
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
                Contact access was not available. Type a name instead.
              </p>
            ) : null}
            <label className="field">
              <span>Their name</span>
              <input
                value={manualLabel}
                onChange={(e) => setManualLabel(e.target.value)}
                placeholder="Jordan"
                autoComplete="name"
                data-testid="find-people-name-only"
              />
            </label>
            {/*
              TRUST: ContactSuggestPicker never uploads the address book —
              only the tapped contact is added to `selected` for invite.
            */}
            <ContactSuggestPicker
              query={manualLabel}
              enabled
              onSelect={(person) => {
                let phone = person.phone || "";
                if (phone) {
                  try {
                    phone = normalizePhoneInput(phone);
                  } catch {
                    /* keep raw */
                  }
                }
                setSelected((prev) => {
                  if (prev.some((p) => p.contact_id === person.contact_id)) return prev;
                  return [
                    ...prev,
                    {
                      id: person.contact_id,
                      label: person.name,
                      phone,
                      contact_id: person.contact_id,
                      source: "contacts",
                    },
                  ];
                });
                setMode("confirm");
                setStatus(
                  phone
                    ? null
                    : `${person.name} has no phone number — add one to invite.`,
                );
              }}
              onDeniedOnce={(msg) => {
                setContactDeniedOnce(true);
                setContactDenied(true);
                setStatus(msg);
              }}
              openSheet={contactSheetOpen}
              onCloseSheet={() => setContactSheetOpen(false)}
            />
            {error ? <p className="error-line">{error}</p> : null}
            {status ? (
              <p className="status-line" role="status">
                {status}
              </p>
            ) : null}
            <div className="find-people-actions">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setContactSheetOpen(true);
                }}
              >
                Choose from contacts
              </button>
              <button type="button" className="btn primary" onClick={addManualNameOnly}>
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


