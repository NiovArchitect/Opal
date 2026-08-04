# Safari Realtime Completion

## Preferred matrix

- Safari-class participant: WebKit automation (Safari engine) + real Safari 18.6 open
- Peer: Chromium

## Proven on same-site API

- Activation through public UI
- Cookie session on `api.opal.niovlabs.com`
- Channel architecture unchanged from accepted SF17 realtime contract
- Sign-out revokes socket ticket (401)

## Dual-browser Chromium realtime

Recorded in FINAL_CHROME_BRAVE_REGRESSION.md for A↔B ordinary social text.

## Residual

Full Safari UI offline-reconnect matrix remains operator-assisted if SafariDriver is locked; WebKit engine proof covers session + cookie path that previously blocked Safari refresh.
