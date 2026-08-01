# SF13 Animation Decision

| Surface | Decision |
|---------|----------|
| Mobile Expo app | Approved path: **react-native-reanimated** when needed. Not installed in SF13 (no new mobile animation feature required). Existing StyleSheet press states remain. |
| Public web (`apps/opal_web`) | **CSS transitions** + `prefers-reduced-motion`. |
| Motion for React | DOM/HTML/SVG only; **not** used on React Native. Optional future web enhancement; not required for SF13 closure. |

No Motion dependency was added to `opal_mobile` or `opal_web` in this slice.
