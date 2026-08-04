# Social Flow 18 Implementation Notes

## Scope delivered

- Platform contact capability research (iOS limited, Android READ_CONTACTS, Expo 53, Web Contact Picker).
- Backend: invitation share tokens, product_status labels, people summary, outgoing invites, first social moment on accept.
- Web: empty people state, FindPeopleFlow (contacts picker when available, manual, skip, confirm, share link).
- Mobile: deviceContacts minimization helpers, FindPeopleScreen, Chats empty CTA, expo-contacts plugin + privacy strings.
- Enumeration-safe invitation outcomes (no "uses Opal" oracle language).
- Honest delivery: `sms_sent: false` for synthetic channel.

## Not claimed

- Production SMS
- Continuous address-book sync
- Public friend discovery / follower graph
- App Store / Play Store release complete
- Native device E2E on physical hardware in this pass

## Data minimization

1. Read authorized contacts on device only after permission.
2. User selects people (and phone values when multiple).
3. Server receives only selected phone + label + invite_source.
4. Unselected contacts are not persisted server-side.
5. Share URLs carry opaque tokens only (no phone, no session).
