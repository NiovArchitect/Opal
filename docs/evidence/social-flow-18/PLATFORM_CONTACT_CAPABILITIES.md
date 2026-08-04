# Platform Contact Capabilities — Social Flow 18

Primary sources consulted: Apple Contacts docs (CNContactStore, CNAuthorizationStatus.limited), WWDC24 Contact Access Button, Expo Contacts (SDK 53), MDN Contact Picker API.

## iOS (Apple Contacts)

| Status | Meaning |
|--------|---------|
| notDetermined | Not yet asked |
| authorized | Full access |
| limited | iOS 18+ subset chosen by the person |
| denied | User denied |
| restricted | System restriction (e.g. parental) |

- Limited access is first-class on iOS 18: the store returns only shared contacts.apps must treat `.limited` as success for selection UI.
- Contact Access Button can expand the limited set later (iOS 18+).
- `NSContactsUsageDescription` required for App Store privacy.
- Opal must never claim full address book upload.

## Android

- Runtime `READ_CONTACTS` via system permission dialog.
- No universal “limited contacts” picker equivalent to iOS 18; selection is app-side after grant.
- Google Play Data Safety: declare contacts only if collected; Opal policy is selected-only server send.

## Expo (Opal mobile: expo ~53)

- Package: `expo-contacts`
- `requestPermissionsAsync` / `getPermissionsAsync`
- `getContactsAsync` with phone fields only when inviting
- iOS limited access surfaces through permission status when supported by the Expo SDK version in use
- `ContactAccessButton` available on iOS 18+ via Expo when native module present

## Web

| Browser | Contact Picker |
|---------|----------------|
| Chrome (Android / some desktop) | Contact Picker API when available |
| Safari | No reliable Contact Picker; manual + share link |
| Brave | Treat as Chromium; feature-detect only |

- Web must always offer manual phone entry and shareable invitation link.
- Do not present contact access as universal on desktop Safari.

## Desktop fallback

Manual invite + copy/share link + QR optional later. No silent contact sync.

## Opal policy (product)

1. Read contacts only after OS permission.
2. Display locally.
3. User selects people.
4. Send only selected E.164 (or digest path) for invitation creation.
5. Discard non-selected contact rows from memory after flow ends.
6. Permission denial never blocks product use.
