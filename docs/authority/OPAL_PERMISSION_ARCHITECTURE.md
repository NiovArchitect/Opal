# Opal Permission Architecture — YOU as Trust Layer

**Status:** ARCHITECTURE AUTHORITY  
**Synced:** 2026-10-13  
**Pass 2:** LOCKED  
**Naming law:** This is the **YOU page**, not a generic Settings menu.

```yaml
authority_class: OPAL_PERMISSION_ARCHITECTURE
surface: YOU
pass_2: LOCKED
```

## Naming law

| Wrong | Right |
|-------|-------|
| Settings = app configuration | **YOU = my identity, my world, my permissions, my relationships, my control over how Opal works with me** |
| Hunt for toggles | Teach Opal how I want to experience the world |
| Muse: What can AI do? | Opal: How can AI help me live better with people? |

YOU is a **core product surface** — the personal control center inside Opal. Categories are **domains of a person’s life**, not random preference cards. Each domain must become a fully functional **capability surface**.

## Mental model

User opens YOU and thinks:

> This is where I teach Opal how I want to experience the world.

Not:

> This is where I change app settings.

## Permission ≠ knowledge

**Permission does not mean Opal knows.**

Permission means:

> Opal is allowed to begin observing this category of information.

Understanding still requires Source · Owner · Visibility · Confidence · Correction · Expiration (`OPAL_UNDERSTANDING_LAW.md`).

## Pipeline

```text
User opens YOU
        ↓
Understanding setup
        ↓
Permission choices
        ↓
Context access
        ↓
Observation
        ↓
Candidate understanding
        ↓
User confirmation
        ↓
Trusted intelligence
```

Patterns are not truths. Patterns become stronger **candidates**. The user remains the authority.

## YOU domain map (life domains)

| Domain | User question | Pass 2 role |
|--------|---------------|-------------|
| **Profile** | Who am I? | Identity authority |
| **Privacy** | What does Opal have permission to understand? | Pass 2 gateway (not a “Memory ON” toggle) |
| **Feed** | What is happening in my world? | Existing reality |
| **Discovery** | What could enrich my world? | Possibility (keep separate from Feed) |
| **Location & Travel** | How does Opal help me coordinate life? | Home TZ · Travel mode · Live share scopes |
| **Calls & Opal Assist** | What may Opal Suggest / Prepare / Execute? | Action authority |
| **Notifications** | What deserves my attention? | Attention intelligence surface |
| **Appearance** | How does Opal feel present? | Theme + future presence/a11y |
| **Linked Devices** | Where can Opal exist? | Multi-surface presence |
| **Spending** | What experiences fit my lifestyle? | Commerce comfort |
| **Fit** | How do I care for myself? | Wellness (logic separate even if card combined) |
| **Account & Security** | How do I stay in control? | Sessions · export · delete |
| **Find People** | How does my graph begin? | Contacts → match → invite → relationship |

## Privacy → Opal Understanding (future Pass 2 shape)

Not: Memory ON/OFF.

Instead: **How deeply should Opal understand your life?** with category permissions, e.g.:

- Conversation understanding  
- Relationship context  
- Location coordination  
- Calendar assistance  

Then still: observation → Candidate → confirmation — never silent Durable.

## Two permission layers (required)

ON/OFF alone is insufficient.

| Layer | Question | Example (Calendar) | Example (Calls) |
|-------|----------|--------------------|-----------------|
| **Access** | Can Opal access this? | Read calendar | Assist may see call context |
| **Action** | What can Opal do with it? | Suggest plans · Create drafts · Create events · Manage events | Suggest · Prepare · Place · Summarize |

Relationship privacy is separate from account privacy: private / shared / public per relationship edge (see Context Model).

## Continuous Permission Law (standing capabilities)

> Opal permissions are persistent, user-granted capabilities — not repeated interruptions. A permission grants a bounded capability within defined scope, visibility, expiration, and revocation controls.

| Principle | Rule |
|-----------|------|
| Friction | Permission reduces friction; it does not create a notification machine |
| Boundaries | User controls capability scope |
| Disclosure | Active sensitive capture shows **Opal Graphing** (Pause · Resume · Stop · Manage) |
| No silent expand | Scope never grows without explicit user action |
| Instant revoke | Pause / revoke must take effect immediately |
| Relationship variance | Different relationships may have different grants |
| Global pause | Overrides relationship-level grants |
| Legal | Other-party / jurisdictional consent cannot be skipped by one user's standing grant |

Standing Graphing modes: `never` · `ask_each` · `auto_eligible` · `selected_only`.

**Use ≠ disclose.** Opal may use a private signal for alignment without revealing it to unauthorized people. See `OPAL_RELATIONSHIP_ACCESS_MODEL.md`.

## Action authority

| Level | Meaning |
|-------|---------|
| Suggest | Would you like me to call / book? |
| Prepare | Here’s what I would say / do |
| Execute | Place the call / complete the reservation |

## Progressive permission (out-of-box)

Avoid everything-on. Recommended: Conversations · Calendar · Contacts · Notifications. Optional: Location · Email · Fitness · Purchases. User is defining the **relationship with Opal**.

## Balance

**Aggressive capability, conservative authority.**

Impressive help is welcome. The user must always know: what Opal can access · why · who it involves · how to change it.

## Permission Capability Matrix (required)

Every capability:

```text
Permission → YOU UI location → Options → Backend state → Data source
→ Who can access → What Opal can do → How user revokes
```

Audit: `docs/evidence/u_page/YOU_PAGE_CAPABILITY_MATRIX.md` · `PERMISSION_ACTION_MAP.md`.

## Pass 2 entry tests

| Test | Question |
|------|----------|
| Permission | Why do you know this? |
| Correction | That changed. |
| Scope | My preference vs our preference vs group discussion |
| Time | True then vs true now |

## Related

- `YOU_PAGE_HIERARCHY.md` — keep YOU; hierarchy so it is not an iPhone Settings clone  
- `OPAL_MATURITY_STACK.md`  
- `OPAL_UNDERSTANDING_LAW.md`  
- `OPAL_RELATIONSHIP_ACCESS_MODEL.md` — relationship as permission boundary; use ≠ disclose; Graphing standing modes
- `RELATIONSHIP_CONTEXT_MODEL.md`  
- `RELATIONSHIP_INTELLIGENCE_ENTRY_CONTRACT.md`  
- Wire honesty: `VISIBLE_SETTING_REQUIRES_WORKING_BEHAVIOR` (implementation classifier; surface name remains YOU)  
