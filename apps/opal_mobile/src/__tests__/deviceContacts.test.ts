import {
  CONTACT_PERMISSION_COPY,
  canReadContacts,
  contactsWithPhones,
  discardUnselectedContacts,
  filterContacts,
  isProhibitedContactCopy,
  normalizePhoneCandidate,
  permissionBlocksProduct,
  selectedInvitePayload,
  sortContactsAlpha,
} from "../socialFlow/deviceContacts";

describe("deviceContacts SF18", () => {
  it("never blocks product on permission denial", () => {
    expect(permissionBlocksProduct("denied")).toBe(false);
    expect(permissionBlocksProduct("restricted")).toBe(false);
    expect(permissionBlocksProduct("undetermined")).toBe(false);
  });

  it("treats limited access as readable", () => {
    expect(canReadContacts("limited")).toBe(true);
    expect(canReadContacts("granted")).toBe(true);
    expect(canReadContacts("denied")).toBe(false);
  });

  it("normalizes phone candidates without retaining junk", () => {
    expect(normalizePhoneCandidate("(202) 555-0102")).toBe("+12025550102");
    expect(normalizePhoneCandidate("2025550102")).toBe("+12025550102");
    expect(normalizePhoneCandidate("12")).toBeNull();
  });

  it("drops contacts without phones and sorts alphabetically", () => {
    const rows = contactsWithPhones([
      { id: "b", name: "Zoe", phones: [{ id: "1", number: "2025550102" }] },
      { id: "a", name: "Amy", phones: [] },
      { id: "c", name: "Bob", phones: [{ id: "2", number: "+12025550103" }] },
    ]);
    expect(rows).toHaveLength(2);
    expect(sortContactsAlpha(rows).map((c) => c.name)).toEqual(["Bob", "Zoe"]);
  });

  it("filters by query and only exports selected invite payloads", () => {
    const all = [
      {
        id: "1",
        name: "Jordan Lee",
        phones: [{ id: "p", number: "+12025550102" }],
      },
      {
        id: "2",
        name: "Maya Chen",
        phones: [{ id: "p2", number: "+12025550103" }],
      },
    ];
    expect(filterContacts(all, "jor")).toHaveLength(1);
    const payload = selectedInvitePayload([
      { contactId: "1", displayName: "Jordan Lee", phone: "+12025550102" },
    ]);
    expect(payload).toEqual([
      {
        phone: "+12025550102",
        label: "Jordan Lee",
        invite_source: "selected_contact",
      },
    ]);
    expect(discardUnselectedContacts(all, new Set(["1"]))).toHaveLength(1);
  });

  it("prohibits harvest / discovery copy", () => {
    expect(isProhibitedContactCopy("Upload your address book")).toBe(true);
    expect(isProhibitedContactCopy("People you may know")).toBe(true);
    expect(isProhibitedContactCopy(CONTACT_PERMISSION_COPY)).toBe(false);
  });
});
