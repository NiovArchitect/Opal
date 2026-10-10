# App Store Privacy Labels (copy-paste for App Store Connect)

Branch: `muse/packet-b-batch-2`  
Purpose: founder paste into App Store Connect privacy questionnaire.  
Do not invent categories. Short plain answers only.

Tracking: **No.** No third-party tracking SDKs. `PrivacyInfo.xcprivacy` sets `NSPrivacyTracking` = false.

---

## Contacts

- **Collected?** Yes
- **Linked to identity?** No (device book stays on device; only people you tap may leave as invites)
- **Used for tracking?** No
- **Purpose:** App Functionality
- **What / why:** Read device contacts so you can pick real people to invite and plan with. Only selected rows leave the device (name/phone for invite SMS when configured).

## Contacts Birthday (contacts-birthday)

- **Collected?** Yes (when present on a contact you select)
- **Linked to identity?** Yes (tied to the person you chose)
- **Used for tracking?** No
- **Purpose:** App Functionality
- **What / why:** Optional birthday field from a selected contact, used for celebrations and reminders. Never invented. Not read from the full address book in bulk for ads.

## Calendar

- **Collected?** Yes (only if you connect a calendar)
- **Linked to identity?** Yes
- **Used for tracking?** No
- **Purpose:** App Functionality
- **What / why:** When you connect Google Calendar (OAuth), Opal uses free/busy style availability to suggest real plan times. Not collected if you never connect. No device `NSCalendars` bulk dump in this build.

## Email

- **Collected?** Yes (limited)
- **Linked to identity?** Yes when present on a selected contact or in chat content
- **Used for tracking?** No
- **Purpose:** App Functionality
- **What / why:** Email addresses on contacts you select may ride along for invite/context. Chat/text content you send is stored for messaging. Account login is phone OTP, not email signup.

## Location

- **Collected?** Yes (when-in-use, with permission)
- **Linked to identity?** Yes
- **Used for tracking?** No
- **Purpose:** App Functionality
- **What / why:** Precise location while using the app to share trip/convoy ETAs with your group. Not sold. Not used for ads.

## Voice (Audio Data)

- **Collected?** Yes
- **Linked to identity?** Yes
- **Used for tracking?** No
- **Purpose:** App Functionality
- **What / why:** Microphone for voice calls and voice messages. Optional speech recognition so Opal can understand you. Call media is ephemeral (WebRTC / TURN relay while active). Voice notes may be transcribed when speech providers are configured.

## Usage Data (Product Interaction)

- **Collected?** Yes (product ops, not ad analytics)
- **Linked to identity?** Yes
- **Used for tracking?** No
- **Purpose:** App Functionality
- **What / why:** Call metadata (participants, duration, outcome), delivery/push device tokens, and structured server logs needed to run the product. Production analytics flags stay off for ad-style tracking. Optional crash reporting only if Sentry DSN is configured (currently unset).

---

## Quick ASC checklist

| Data type | Collect | Link | Track | Primary purpose |
|-----------|---------|------|-------|-----------------|
| Contacts | Yes | No | No | App Functionality |
| Contacts Birthday | Yes (selected) | Yes | No | App Functionality |
| Calendar | Yes (if connected) | Yes | No | App Functionality |
| Email | Yes (limited) | Yes | No | App Functionality |
| Location | Yes (when-in-use) | Yes | No | App Functionality |
| Voice / Audio | Yes | Yes | No | App Functionality |
| Usage Data | Yes (ops) | Yes | No | App Functionality |

## Third parties (operational, not ads)

| Vendor | Role |
|--------|------|
| Twilio Verify / Messaging | SMS OTP and invite SMS |
| Twilio NTS | TURN/STUN for calls |
| Expo Push → APNs | Push delivery |
| Deepgram | Speech-to-text when key present |
| Google (OAuth / Places) | Calendar connect / venue search when configured |
| Sentry | Crash reports only if DSN set |

Adapted from repo-root `APP_STORE_PRIVACY_NOTES.md`. This file is the Store Connect paste target.
