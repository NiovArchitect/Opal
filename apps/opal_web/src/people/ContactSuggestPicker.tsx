/**
 * Contact suggest / pick UI for first-run and Find People.
 *
 * TRUST GUARANTEE: the full address book is never uploaded. Native (or
 * Contact Picker API) returns candidates for on-device display only; only the
 * contact the user explicitly taps is passed to onSelect → invite APIs.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  requestNativeContacts,
  shouldUseNativeContactsBridge,
  type NativeContactRow,
} from "../nativeHostBridge";

export type SelectedDeviceContact = {
  contact_id: string;
  name: string;
  phone?: string;
  email?: string;
  organization?: string;
  /** Device birthday when present — syncs to Celebrations with provenance observed. */
  birthday?: { month: number; day: number; year?: number | null } | null;
  source: "contacts";
};

type Props = {
  /** Live query from the name input (fuzzy match). */
  query: string;
  enabled?: boolean;
  onSelect: (person: SelectedDeviceContact) => void;
  /** One-time note when permission denied (parent stores "shown" flag). */
  onDeniedOnce?: (message: string) => void;
  /** Compact = inline under Meet Opal composer; sheet = full list. */
  variant?: "inline" | "sheet";
  openSheet?: boolean;
  onCloseSheet?: () => void;
};

function disambiguation(c: NativeContactRow): string {
  const bits: string[] = [];
  if (c.phones[0]) bits.push(c.phones[0]);
  else if (c.emails[0]) bits.push(c.emails[0]);
  if (c.organization) bits.push(c.organization);
  return bits.join(" · ");
}

function toSelected(c: NativeContactRow): SelectedDeviceContact {
  return {
    contact_id: c.id,
    name: c.name,
    phone: c.phones[0] || undefined,
    email: c.emails[0] || undefined,
    organization: c.organization,
    birthday: c.birthday || undefined,
    source: "contacts",
  };
}

async function tryWebContactPicker(): Promise<SelectedDeviceContact | null> {
  const nav = navigator as Navigator & {
    contacts?: {
      select: (
        props: string[],
        opts: { multiple: boolean },
      ) => Promise<Array<{ name?: string[]; tel?: string[]; email?: string[] }>>;
    };
  };
  if (!nav.contacts?.select) return null;
  try {
    const rows = await nav.contacts.select(["name", "tel", "email"], {
      multiple: false,
    });
    const row = rows?.[0];
    if (!row) return null;
    const name = ((row.name && row.name[0]) || "").trim();
    if (!name) return null;
    const tel = (row.tel || []).find((t) => t && t.trim())?.trim();
    const email = (row.email || []).find((e) => e && e.trim())?.trim();
    return {
      contact_id: `web-${name.toLowerCase().replace(/\s+/g, "-")}-${tel || email || "x"}`,
      name,
      phone: tel,
      email,
      source: "contacts",
    };
  } catch {
    return null;
  }
}

export function ContactSuggestPicker({
  query,
  enabled = true,
  onSelect,
  onDeniedOnce,
  variant = "inline",
  openSheet = false,
  onCloseSheet,
}: Props) {
  const [matches, setMatches] = useState<NativeContactRow[]>([]);
  const [sheetRows, setSheetRows] = useState<NativeContactRow[]>([]);
  const [sheetQuery, setSheetQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [deniedNoteShown, setDeniedNoteShown] = useState(false);
  const lastQuery = useRef("");
  const native = useMemo(() => shouldUseNativeContactsBridge(), []);

  const handleDenied = useCallback(
    (message?: string) => {
      if (deniedNoteShown) return;
      setDeniedNoteShown(true);
      onDeniedOnce?.(
        message ||
          "You can enable contacts later in Settings to pick people directly.",
      );
    },
    [deniedNoteShown, onDeniedOnce],
  );

  // Debounced search as the user types
  useEffect(() => {
    if (!enabled || !native) return;
    const q = query.trim();
    if (q.length < 2) {
      setMatches([]);
      return;
    }
    if (q === lastQuery.current) return;
    const t = window.setTimeout(() => {
      lastQuery.current = q;
      void (async () => {
        setBusy(true);
        const res = await requestNativeContacts({
          mode: "search",
          query: q,
          limit: 12,
        });
        setBusy(false);
        if (res.status === "denied") {
          handleDenied(res.message);
          setMatches([]);
          return;
        }
        if (res.status === "ok") setMatches(res.contacts);
        else setMatches([]);
      })();
    }, 220);
    return () => window.clearTimeout(t);
  }, [query, enabled, native, handleDenied]);

  // Full alphabetical sheet
  useEffect(() => {
    if (!openSheet) return;
    void (async () => {
      setBusy(true);
      if (native) {
        const res = await requestNativeContacts({ mode: "pick", limit: 200 });
        setBusy(false);
        if (res.status === "denied") {
          handleDenied(res.message);
          // Fall back to browser Contact Picker if present
          const picked = await tryWebContactPicker();
          if (picked) onSelect(picked);
          onCloseSheet?.();
          return;
        }
        if (res.status === "ok") setSheetRows(res.contacts);
        else setSheetRows([]);
        return;
      }
      setBusy(false);
      const picked = await tryWebContactPicker();
      if (picked) onSelect(picked);
      else handleDenied();
      onCloseSheet?.();
    })();
  }, [openSheet, native, handleDenied, onSelect, onCloseSheet]);

  const visibleSheet = useMemo(() => {
    const q = sheetQuery.trim().toLowerCase();
    if (!q) return sheetRows;
    return sheetRows.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phones.some((p) => p.includes(q.replace(/\s/g, ""))) ||
        (c.organization || "").toLowerCase().includes(q),
    );
  }, [sheetRows, sheetQuery]);

  if (!enabled) return null;

  return (
    <>
      {variant === "inline" && matches.length > 0 ? (
        <ul
          className="hs-contact-suggest"
          data-testid="contact-suggest-list"
          role="listbox"
          aria-label="Matching contacts"
        >
          {matches.map((c) => {
            const detail = disambiguation(c);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  className="hs-contact-suggest-row"
                  data-testid={`contact-suggest-${c.id}`}
                  role="option"
                  onClick={() => onSelect(toSelected(c))}
                >
                  <span className="hs-contact-suggest-name">{c.name}</span>
                  {detail ? (
                    <span className="hs-contact-suggest-detail">{detail}</span>
                  ) : (
                    <span className="hs-contact-suggest-detail muted">
                      No phone number — add one to invite
                    </span>
                  )}
                </button>
              </li>
            );
          })}
          {busy ? (
            <li className="hs-contact-suggest-busy" aria-live="polite">
              Searching contacts…
            </li>
          ) : null}
        </ul>
      ) : null}

      {openSheet ? (
        <div
          className="hs-contact-sheet"
          data-testid="contact-pick-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="Choose from contacts"
        >
          <header className="hs-contact-sheet-header">
            <h2>Contacts</h2>
            <button
              type="button"
              className="btn ghost"
              data-testid="contact-pick-close"
              onClick={() => onCloseSheet?.()}
            >
              Close
            </button>
          </header>
          <input
            className="hs-meet-input hs-contact-sheet-search"
            data-testid="contact-pick-search"
            placeholder="Search"
            value={sheetQuery}
            onChange={(e) => setSheetQuery(e.target.value)}
            autoComplete="off"
          />
          {busy ? (
            <p className="hs-contact-suggest-busy" aria-live="polite">
              Loading contacts…
            </p>
          ) : (
            <ul className="hs-contact-sheet-list" role="listbox">
              {visibleSheet.map((c) => {
                const detail = disambiguation(c);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="hs-contact-suggest-row"
                      data-testid={`contact-pick-${c.id}`}
                      onClick={() => {
                        onSelect(toSelected(c));
                        onCloseSheet?.();
                      }}
                    >
                      <span className="hs-contact-suggest-name">{c.name}</span>
                      {detail ? (
                        <span className="hs-contact-suggest-detail">{detail}</span>
                      ) : (
                        <span className="hs-contact-suggest-detail muted">
                          No phone number — add one to invite
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
              {!visibleSheet.length ? (
                <li className="hs-contact-suggest-busy">No matches</li>
              ) : null}
            </ul>
          )}
        </div>
      ) : null}
    </>
  );
}
