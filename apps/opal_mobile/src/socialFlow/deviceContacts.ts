/**
 * Social Flow 18 — device contact access (data-minimized).
 *
 * Contacts stay on device until the user selects people.
 * Only selected phone identifiers leave the device for invitation creation.
 */

export type ContactPermissionStatus =
  | "undetermined"
  | "granted"
  | "limited"
  | "denied"
  | "restricted"
  | "unavailable";

export type DevicePhoneValue = {
  id: string;
  label?: string;
  number: string;
};

export type DeviceContact = {
  id: string;
  name: string;
  phones: DevicePhoneValue[];
};

export type SelectedInvitee = {
  contactId: string;
  displayName: string;
  phone: string;
};

/** Safe aggregate-only diagnostics for device validation. Never includes PII. */
export type ContactMinimizationReport = {
  permission_status: ContactPermissionStatus;
  local_contacts_read: number;
  contacts_displayed: number;
  contacts_selected: number;
  phone_values_available: number;
  phone_values_selected: number;
  phone_values_submitted: number;
  unselected_phone_values_submitted: number;
};

export const CONTACT_PERMISSION_COPY =
  "Choose people you already know. Opal only invites the ones you select.";

export const PROHIBITED_CONTACT_COPY = [
  /upload your address book/i,
  /sync all contacts/i,
  /scan your contacts/i,
  /share your contacts with ai/i,
  /people you may know/i,
  /full address book/i,
  /follower/i,
  /popularity/i,
];

export function isProhibitedContactCopy(text: string): boolean {
  return PROHIBITED_CONTACT_COPY.some((p) => p.test(text));
}

export function permissionBlocksProduct(status: ContactPermissionStatus): boolean {
  // Denial must never block product use.
  return false;
}

export function canReadContacts(status: ContactPermissionStatus): boolean {
  return status === "granted" || status === "limited";
}

/** Normalize common phone shapes toward E.164-ish for US preview fixtures. */
export function normalizePhoneCandidate(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+") && digits.length >= 11) return digits;
  const only = digits.replace(/\D/g, "");
  if (only.length === 10) return `+1${only}`;
  if (only.length === 11 && only.startsWith("1")) return `+${only}`;
  if (only.length >= 10) return `+${only}`;
  return null;
}

export function contactsWithPhones(contacts: DeviceContact[]): DeviceContact[] {
  return contacts
    .map((c) => ({
      ...c,
      phones: c.phones
        .map((p) => {
          const n = normalizePhoneCandidate(p.number);
          return n ? { ...p, number: n } : null;
        })
        .filter(Boolean) as DevicePhoneValue[],
    }))
    .filter((c) => c.phones.length > 0);
}

export function filterContacts(contacts: DeviceContact[], query: string): DeviceContact[] {
  const q = query.trim().toLowerCase();
  if (!q) return contacts;
  return contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.phones.some((p) => p.number.includes(q.replace(/\s/g, ""))),
  );
}

export function sortContactsAlpha(contacts: DeviceContact[]): DeviceContact[] {
  return [...contacts].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Map only selected invitees for server submission.
 * Never pass the full address book.
 */
export function selectedInvitePayload(selected: SelectedInvitee[]): {
  phone: string;
  label: string;
  invite_source: "selected_contact";
}[] {
  return selected.map((s) => ({
    phone: s.phone,
    label: s.displayName,
    invite_source: "selected_contact" as const,
  }));
}

export function buildMinimizationReport(input: {
  permission: ContactPermissionStatus;
  loaded: DeviceContact[];
  displayed: DeviceContact[];
  selected: SelectedInvitee[];
  submittedPhoneCount: number;
}): ContactMinimizationReport {
  const phoneAvailable = input.loaded.reduce((n, c) => n + c.phones.length, 0);
  const selectedContacts = new Set(input.selected.map((s) => s.contactId)).size;
  return {
    permission_status: input.permission,
    local_contacts_read: input.loaded.length,
    contacts_displayed: input.displayed.length,
    contacts_selected: selectedContacts,
    phone_values_available: phoneAvailable,
    phone_values_selected: input.selected.length,
    phone_values_submitted: input.submittedPhoneCount,
    unselected_phone_values_submitted: 0,
  };
}

/** Development-only log of aggregate counts — never logs names or numbers. */
export function logMinimizationReport(report: ContactMinimizationReport): void {
  if (typeof console === "undefined") return;
  console.info("[opal.contacts.minimization]", JSON.stringify(report));
}

export function discardUnselectedContacts(
  all: DeviceContact[],
  selectedIds: Set<string>,
): DeviceContact[] {
  return all.filter((c) => selectedIds.has(c.id));
}

/** Soft wrapper: expo-contacts is optional until native module is linked. */
export async function probeExpoContactsModule(): Promise<boolean> {
  try {
    // Dynamic require keeps unit tests free of native linkage.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Contacts = require("expo-contacts");
    return Boolean(Contacts?.requestPermissionsAsync);
  } catch {
    return false;
  }
}

export type ContactsBridge = {
  getPermissionStatus: () => Promise<ContactPermissionStatus>;
  requestPermission: () => Promise<ContactPermissionStatus>;
  loadContacts: () => Promise<DeviceContact[]>;
};

export function createMockContactsBridge(seed: DeviceContact[]): ContactsBridge {
  let status: ContactPermissionStatus = "undetermined";
  return {
    async getPermissionStatus() {
      return status;
    },
    async requestPermission() {
      status = "granted";
      return status;
    },
    async loadContacts() {
      if (!canReadContacts(status)) return [];
      return sortContactsAlpha(contactsWithPhones(seed));
    },
  };
}
