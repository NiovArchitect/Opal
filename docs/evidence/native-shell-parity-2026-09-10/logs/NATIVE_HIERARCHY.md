# Native / Web hierarchy (code authority — physical iPhone not attached)

## Native (Expo RN)

App.tsx
  View.boot / View.root (bg #020305)
    NativeFirstRunSurface | ProductWebSurface
      WebView flex:1, contentInsetAdjustmentBehavior=never, bounces=false

No SafeAreaView on current host (removed in 5743831).
No native NavigationStack header.
No RN borderRadius on root.

## Web (inside WKWebView)

html / body (bg --bg / #050816)
  #root
    .app.app-futura (max-width:390px; margin:0 auto)  ← SYSTEMIC DEFECT
      screens / dock

## Proven metric (Playwright 430×932, opal_native_host=1)

viewport 430×932
.app frame x=20 y=0 w=390 h=932
appMaxWidth=390px
→ 20px gutters each side = "Opal inside another app"

## Xcode

Xcode 15.2 · no sim runtimes · xctrace devices: Mac only · devicectl: no devices
Physical iPhone NOT connected this session → device screenshots BLOCKED
