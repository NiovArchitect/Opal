# Accessibility Baseline

**Status:** Phase 0

---

## Requirements

- Dynamic type / scalable text  
- Sufficient contrast (WCAG AA target)  
- Screen reader labels on composer, message status, AI actions  
- Do not convey meaning by color alone (circles use icon + label)  
- Hit targets ≥ 44pt  
- Captions/transcripts for voice notes (feature-aligned)  
- Reduce motion option respected  
- Error states as text, not only icons  

## AI-specific a11y

- Suggestions announced as suggestions, not as messages from the contact  
- Uncertainty language preserved in VoiceOver strings  
- Consent controls fully focusable  

## Testing

- iOS VoiceOver and Android TalkBack smoke on core journey  
- Keyboard/focus where applicable  
- Contrast checks on final tokens  
