# R1B.1 Connection Card — Founder action

**Path:** Expo Go (EAS not required for this proof)

## Phone steps

1. Join the **same Wi‑Fi** as the Mac (LAN `192.168.86.0/24`).
2. Open **Expo Go** on the physical phone.
3. Connect to:

```text
exp://192.168.86.156:8081
```

(Enter URL manually in Expo Go if QR is unavailable, or scan terminal QR.)

4. Wait for the bundle to load → **Opal Graph** activation (“Your number is your key”).
5. Reply in chat: **`device open`** when you see the activation screen (or Home after login).

## Already running (agent-owned)

| Service | Device-reachable |
|---------|------------------|
| Phoenix API | `http://192.168.86.156:4000/health` → OK |
| Vite web product | `http://192.168.86.156:5173/` → OK |
| Metro / Expo | `http://192.168.86.156:8081` → OK |

Do **not** use `127.0.0.1` on the phone.

## After OTP

Reply **`otp entered`** — agent continues kill/relaunch/revoke proofs.
