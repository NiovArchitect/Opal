/**
 * Native contacts acquisition for WebView first-run / Find People.
 *
 * TRUST GUARANTEE (App Store / privacy):
 * The full address book NEVER leaves the device. Only contacts the user
 * explicitly selects are returned to the WebView (and only those may be
 * posted to product invite APIs). Search/list results stay on-device until
 * the user taps a row.
 */
import type { ContactPermissionStatus, DeviceContact } from "../socialFlow/deviceContacts";
import {
  canReadContacts,
  filterContacts,
  normalizePhoneCandidate,
  sortContactsAlpha,
} from "../socialFlow/deviceContacts";

export const CONTACTS_INBOUND_TYPE = "opal_native_request_contacts" as const;
export const CONTACTS_RESULT_TYPE = "opal_native_contacts_result" as const;
export const CONTACTS_DENIED_TYPE = "opal_native_contacts_denied" as const;
export const CONTACTS_ERROR_TYPE = "opal_native_contacts_error" as const;

export type ContactsRequestMode = "search" | "pick";

export type ContactsRequestMessage = {
  type: typeof CONTACTS_INBOUND_TYPE;
  request_id: string;
  mode: ContactsRequestMode;
  /** Fuzzy name query for search mode (e.g. "Cha"). */
  query?: string;
  limit?: number;
};

export type ContactBirthday = {
  month: number;
  day: number;
  year?: number | null;
};

export type NativeContactRow = {
  id: string;
  name: string;
  phones: string[];
  emails: string[];
  organization?: string;
  /** Present only when device contact has a birthday — never invented. */
  birthday?: ContactBirthday | null;
};

export type ContactsOutboundMessage =
  | {
      type: typeof CONTACTS_RESULT_TYPE;
      request_id: string;
      permission: ContactPermissionStatus;
      contacts: NativeContactRow[];
      mode: ContactsRequestMode;
    }
  | {
      type: typeof CONTACTS_DENIED_TYPE;
      request_id: string;
      permission: ContactPermissionStatus;
      message: string;
    }
  | {
      type: typeof CONTACTS_ERROR_TYPE;
      request_id: string;
      code: string;
      message: string;
    };

type ExpoContactsMod = {
  requestPermissionsAsync: () => Promise<{ status: string; granted?: boolean }>;
  getPermissionsAsync?: () => Promise<{ status: string; granted?: boolean }>;
  getContactsAsync: (query: {
    fields: string[];
    pageSize?: number;
    name?: string;
  }) => Promise<{ data: Array<Record<string, unknown>> }>;
  Fields: {
    Name: string;
    FirstName: string;
    LastName: string;
    PhoneNumbers: string;
    Emails: string;
    Company: string;
    ID: string;
    Birthday?: string;
  };
};

function loadExpoContacts(): ExpoContactsMod | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Contacts = require("expo-contacts") as ExpoContactsMod;
    if (!Contacts?.requestPermissionsAsync || !Contacts?.getContactsAsync) return null;
    return Contacts;
  } catch {
    return null;
  }
}

function mapPermission(status: string): ContactPermissionStatus {
  const s = (status || "").toLowerCase();
  if (s === "granted") return "granted";
  if (s === "limited") return "limited";
  if (s === "denied") return "denied";
  if (s === "restricted") return "restricted";
  if (s === "undetermined") return "undetermined";
  return "unavailable";
}

function displayName(c: Record<string, unknown>): string {
  const name = typeof c.name === "string" ? c.name.trim() : "";
  if (name) return name;
  const first = typeof c.firstName === "string" ? c.firstName.trim() : "";
  const last = typeof c.lastName === "string" ? c.lastName.trim() : "";
  return `${first} ${last}`.trim();
}

function mapContact(c: Record<string, unknown>): DeviceContact | null {
  const id = String(c.id || c.contactType || "").trim();
  const name = displayName(c);
  if (!id || !name) return null;
  const phonesRaw = Array.isArray(c.phoneNumbers) ? c.phoneNumbers : [];
  const phones = phonesRaw
    .map((p, i) => {
      const row = p as { id?: string; number?: string; label?: string };
      const number = typeof row.number === "string" ? row.number : "";
      const normalized = normalizePhoneCandidate(number);
      if (!normalized) return null;
      return {
        id: String(row.id || `p-${i}`),
        label: row.label,
        number: normalized,
      };
    })
    .filter(Boolean) as DeviceContact["phones"];
  return { id, name, phones };
}

function parseBirthday(raw: unknown): ContactBirthday | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as { month?: number; day?: number; year?: number };
  const month = typeof b.month === "number" ? b.month : null;
  const day = typeof b.day === "number" ? b.day : null;
  if (month == null || day == null || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  return {
    month,
    day,
    year: typeof b.year === "number" && b.year > 1900 ? b.year : null,
  };
}

function toRow(
  c: DeviceContact,
  emails: string[],
  organization?: string,
  birthday?: ContactBirthday | null,
): NativeContactRow {
  return {
    id: c.id,
    name: c.name,
    phones: c.phones.map((p) => p.number),
    emails,
    organization: organization || undefined,
    birthday: birthday || undefined,
  };
}

/**
 * Load + filter contacts on device. Returns only rows for the WebView UI —
 * the WebView must still require an explicit tap before inviting.
 */
export async function acquireNativeContacts(
  req: ContactsRequestMessage,
): Promise<ContactsOutboundMessage> {
  const Contacts = loadExpoContacts();
  if (!Contacts) {
    return {
      type: CONTACTS_ERROR_TYPE,
      request_id: req.request_id,
      code: "unavailable",
      message: "Contacts module is not linked on this build.",
    };
  }

  let permission: ContactPermissionStatus = "undetermined";
  try {
    if (Contacts.getPermissionsAsync) {
      const existing = await Contacts.getPermissionsAsync();
      permission = mapPermission(existing.status);
    }
    if (!canReadContacts(permission)) {
      const asked = await Contacts.requestPermissionsAsync();
      permission = mapPermission(asked.status);
    }
  } catch (e) {
    return {
      type: CONTACTS_ERROR_TYPE,
      request_id: req.request_id,
      code: "permission_failed",
      message: e instanceof Error ? e.message : "Could not request contacts permission",
    };
  }

  if (!canReadContacts(permission)) {
    return {
      type: CONTACTS_DENIED_TYPE,
      request_id: req.request_id,
      permission,
      message:
        "Opal needs your contacts so you can pick real people to plan with — not type names from memory.",
    };
  }

  try {
    const pageSize = req.mode === "pick" ? 500 : 200;
    const fields = [
      Contacts.Fields.Name,
      Contacts.Fields.FirstName,
      Contacts.Fields.LastName,
      Contacts.Fields.PhoneNumbers,
      Contacts.Fields.Emails,
      Contacts.Fields.Company,
      Contacts.Fields.ID,
    ];
    // Paste G Phase 5 — birthday only when expo-contacts exposes the field.
    if (Contacts.Fields.Birthday) fields.push(Contacts.Fields.Birthday);

    const { data } = await Contacts.getContactsAsync({
      fields,
      pageSize,
      ...(req.mode === "search" && req.query?.trim()
        ? { name: req.query.trim() }
        : {}),
    });

    const emailById = new Map<string, string[]>();
    const orgById = new Map<string, string>();
    const birthdayById = new Map<string, ContactBirthday>();
    const mapped: DeviceContact[] = [];
    for (const raw of data || []) {
      const c = mapContact(raw);
      if (!c) continue;
      mapped.push(c);
      const emailsRaw = Array.isArray(raw.emails) ? raw.emails : [];
      const emails = emailsRaw
        .map((e) => {
          const row = e as { email?: string };
          return typeof row.email === "string" ? row.email.trim() : "";
        })
        .filter(Boolean);
      emailById.set(c.id, emails);
      const company = typeof raw.company === "string" ? raw.company.trim() : "";
      if (company) orgById.set(c.id, company);
      const bday = parseBirthday(raw.birthday);
      if (bday) birthdayById.set(c.id, bday);
    }

    let list = sortContactsAlpha(mapped);
    if (req.mode === "search" && req.query?.trim()) {
      // expo name filter is best-effort; also fuzzy locally
      list = filterContacts(list, req.query);
    }
    // Include name-only contacts (no phone) — invite CTA will explain.
    // TRUST: only user-tapped rows leave the device (birthday rides along).
    const limit = Math.max(1, Math.min(req.limit ?? (req.mode === "pick" ? 200 : 25), 300));
    const rows = list.slice(0, limit).map((c) =>
      toRow(c, emailById.get(c.id) || [], orgById.get(c.id), birthdayById.get(c.id)),
    );

    return {
      type: CONTACTS_RESULT_TYPE,
      request_id: req.request_id,
      permission,
      contacts: rows,
      mode: req.mode,
    };
  } catch (e) {
    return {
      type: CONTACTS_ERROR_TYPE,
      request_id: req.request_id,
      code: "read_failed",
      message: e instanceof Error ? e.message : "Could not read contacts",
    };
  }
}

export function parseContactsRequest(parsed: unknown): {
  ok: true;
  request: ContactsRequestMessage;
} | {
  ok: false;
  request_id?: string;
  code: string;
  message: string;
} {
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, code: "invalid_request", message: "Not an object" };
  }
  const msg = parsed as Record<string, unknown>;
  const request_id = typeof msg.request_id === "string" ? msg.request_id.trim() : "";
  if (!request_id) {
    return { ok: false, code: "invalid_request", message: "request_id required" };
  }
  const mode = msg.mode === "pick" || msg.mode === "search" ? msg.mode : null;
  if (!mode) {
    return {
      ok: false,
      request_id,
      code: "invalid_request",
      message: "mode must be search|pick",
    };
  }
  return {
    ok: true,
    request: {
      type: CONTACTS_INBOUND_TYPE,
      request_id,
      mode,
      query: typeof msg.query === "string" ? msg.query : undefined,
      limit: typeof msg.limit === "number" ? msg.limit : undefined,
    },
  };
}

export function buildContactsInjectScript(message: ContactsOutboundMessage): string {
  const json = JSON.stringify(message);
  const safe = json.replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  return `
    (function() {
      try {
        var detail = ${safe};
        window.dispatchEvent(new CustomEvent('opal-native-contacts', { detail: detail }));
        if (typeof window.__opalNativeContactsDeliver === 'function') {
          window.__opalNativeContactsDeliver(detail);
        }
      } catch (e) {}
      true;
    })();
  `;
}
