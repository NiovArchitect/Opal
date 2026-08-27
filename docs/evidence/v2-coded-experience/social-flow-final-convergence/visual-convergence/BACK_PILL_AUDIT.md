# BACK-PILL AUDIT

**Date:** 2026-08-20

## Found / repaired

| Surface | Before | After |
| --- | --- | --- |
| JourneySurface | `btn ghost` Back | `opal-nav-chevron` ‹ |
| JourneyManageSheet | `btn ghost` Back | `opal-nav-chevron` ‹ |
| CantMakeItSheet | `btn ghost` Back | `opal-nav-chevron` ‹ |
| StoryCreateFlow | `btn ghost` Back | `opal-nav-chevron` ‹ |
| GraphPeopleThread | `btn ghost gpt-back` | `opal-nav-chevron` ‹ |
| GraphProfilePage | Close text | `opal-nav-chevron` ‹ |

## Intent

Visible control stays elegant; hit target remains 40×40.

## Remaining

Sheet-local **Close** text on Comments (Figma 437:69) is intentional and not a Back pill.
