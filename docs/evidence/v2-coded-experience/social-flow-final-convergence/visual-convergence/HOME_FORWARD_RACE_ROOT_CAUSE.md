# HOME FORWARD OVERLAY RACE — ROOT CAUSE

## Symptom (prior pass)

`Cancel → no send` **FAIL**  
Cause labeled “overlay/dismiss race.”

## Root cause (deterministic)

1. **Cancel control was `social-dest-sr-dismiss`** (1×1 clipped). Playwright `force: true` was unreliable; real cancel soak could not prove dismiss.
2. **No dismiss/submit authority lock.** Continue could still fire after dismiss began; no `dismissedRef` / `submittingRef`.
3. **Forward and Memory shared z-index 58.** After partial dismiss, Memory sheet intercepted pointer events for subsequent Home actions.

## Fix (not debounce)

1. Restored **visible quiet Cancel** + **Escape** dismiss (Figma uses dock Home; Cancel/Escape are a11y + soak affordances).
2. `dismissedRef` set **before** `onBack()`; Continue no-ops if dismissed or already submitting.
3. `submittingRef` + disabled Continue after first click (double Continue protected).
4. Forward z-index raised to **62** above Memory.
5. Selection cleared on dismiss; remount resets on `contentId` change.

## Proof

`HOME_FORWARD_PRODUCT_SOAK.json` / craftsmanship proof:

- cancel_before_selection **PASS**
- cancel_after_selection **PASS**
- escape_dismiss_no_send **PASS**
- one_recipient_continue **PASS**
- multi_separately **PASS**
- multi_together_double_continue **PASS**
