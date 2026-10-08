/**
 * Native contacts bridge — selected-only trust + request parse.
 */
import {
  CONTACTS_INBOUND_TYPE,
  parseContactsRequest,
} from "../bridge/nativeContactsAcquisition";
import { ALLOWED_INBOUND_TYPES } from "../bridge/mediaBridgeContract";

describe("nativeContactsAcquisition", () => {
  test("contacts inbound type is allowlisted", () => {
    expect(ALLOWED_INBOUND_TYPES).toContain(CONTACTS_INBOUND_TYPE);
  });

  test("parseContactsRequest requires mode search|pick", () => {
    const bad = parseContactsRequest({
      type: CONTACTS_INBOUND_TYPE,
      request_id: "c1",
    });
    expect(bad.ok).toBe(false);

    const search = parseContactsRequest({
      type: CONTACTS_INBOUND_TYPE,
      request_id: "c2",
      mode: "search",
      query: "Cha",
      limit: 12,
    });
    expect(search.ok).toBe(true);
    if (search.ok) {
      expect(search.request.mode).toBe("search");
      expect(search.request.query).toBe("Cha");
    }

    const pick = parseContactsRequest({
      type: CONTACTS_INBOUND_TYPE,
      request_id: "c3",
      mode: "pick",
    });
    expect(pick.ok).toBe(true);
  });
});
