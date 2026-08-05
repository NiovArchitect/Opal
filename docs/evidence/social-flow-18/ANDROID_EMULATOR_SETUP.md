# Android emulator setup (SF18)

| Item | Value |
|------|--------|
| Host CPU | Intel x86_64 |
| SDK root | `/usr/local/share/android-commandlinetools` |
| JDK | Temurin 17 portable under `~/.jdks` |
| API | 34 |
| Image | `system-images;android-34;google_apis;x86_64` |
| AVD | `opal_pixel_api34` |
| Device profile | pixel_6 |
| Emulator | 37.1.11 |
| Disk after SDK install | ~38–44 GB free range during session |

## Status

| Step | Result |
|------|--------|
| cmdline-tools install | PASS |
| emulator + image install | PASS |
| AVD create | PASS (devices.xml warning non-fatal) |
| Emulator launch | started; boot slow (bootanim running for extended period) |
| Full boot_completed=1 | pending / delayed on this host |

## Label

**ANDROID EMULATOR VALIDATION** — not physical proof.
