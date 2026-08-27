# Promise layer stack (after repair)

Bottom → top inside first-run / Promise step:

1. `.app-ambient` — z-index 0, pointer-events none  
2. `.fr-void` — decorative spectral backdrop, z-index 0, pointer-events none  
3. `.fr-frame` — z-index 1  
4. `.opal-promise-exact` — absolute inset 0, z-index 2  
5. `.opal-promise-exact-frame` + `.opal-promise-exact-img` — z-index 1 (within promise), **visible exact image**  
6. `.opal-promise-exact-cta` — z-index 3, **transparent** hit targets only (no frost gradient)

Law: frost/backdrop never covers Promise image content.
