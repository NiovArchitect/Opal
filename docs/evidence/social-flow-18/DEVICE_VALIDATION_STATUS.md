# Device validation status

## Available in this environment

| Platform | Status |
|----------|--------|
| Safari 18.6 (macOS) | Available; full SafariDriver needs OS auth |
| Chrome / Brave desktop | Available for web path |
| iOS physical device | Not attached to this operator session |
| Android physical device | Not attached to this operator session |

## What is proven without physical mobile

- Permission denial never blocks product (unit + UI paths)
- Selected-only payload contract
- Manual invite + share link
- Mobile shell navigation to FindPeople from Chats empty and You
- Expo contacts plugin + usage strings configured

## What requires founder device pass

- Real iOS limited contacts grant UI
- Real Android READ_CONTACTS grant/deny
- Background/foreground session after device sleep
- Native Expo push of invite deep link

Until those pass, SF18 remains partially complete for physical device gates.
