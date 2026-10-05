# Phase NE-1 report

## Product

`invites` + `invite_rewards` tables + `OpalCore.Invites`.
Codes like `MAYA-X7K2`, 30-day expiry, max 10/day.
On join: friend relationship both ways, rewards++, welcome message.
SMS queued via Oban + Twilio adapter when phone provided.
API POST/GET (auth) + public validate. You hub Invite friends section.

## Verification

- Invites + API tests: 19/19
- InviteFriendsSection vitest: 3/3 (remembers suite still 10/10)
- Manual: create → validate → join → friend relationship + welcome
