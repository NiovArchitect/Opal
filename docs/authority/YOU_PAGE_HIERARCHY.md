# YOU Page Hierarchy

**Status:** CURRENT AUTHORITY — product philosophy + hub structure  
**Synced:** 2026-10-13  
**Pass 2:** LOCKED  

```yaml
authority_class: YOU_PAGE_HIERARCHY
surface: YOU
contains_settings: true
is_not: generic_settings_drawer
```

## Decision

**Keep YOU.** Do not replace with a gear ⚙️ Settings icon.

YOU **contains** settings. YOU does not collapse into settings.

| Gear Settings | YOU |
|---------------|-----|
| Configure the application | Configure my relationship with Opal |
| Dark mode, logout, prefs | Who I am · what Opal may understand · how Opal may help · who I connect |

Bottom nav stays: Home · Chats · Opal · Graphs · **YOU**.

## Naming law

> YOU is the user's relationship with Opal itself.

Blind spot to avoid: YOU feeling like an iPhone Settings clone (flat list of Privacy / Appearance / Notifications).

## Hierarchy (person-centered)

```text
YOU
 ├── Your Identity     — who am I?
 ├── Your World        — my existing + possible world
 ├── Your Relationships— privacy, understanding, sharing
 ├── How Opal Helps    — assist, attention, presence, lifestyle
 └── Your Account     — devices, security, exit
```

### Mapping (current cards)

| Section | Cards / actions |
|---------|-----------------|
| **Your Identity** | Profile header · Edit profile |
| **Your World** | Feed & discovery · Grow Your Circle · Location & travel |
| **Your Relationships** | Privacy (future: Opal Understanding card) |
| **How Opal Helps** | Calls & Opal Assist · Notifications · Appearance · **Spending** · **Fit** (separate scopes) |
| **Your Account** | Linked devices · Account & security · Sign out |

Grow Your Circle (formerly “Find people”) is **social growth**, not configuration — lives under Your World.

## Future differentiator (Pass 2 — do not ship yet)

**Opal Understanding** card under Your Relationships:

> Manage what Opal understands about your life — why, and how to change it.

Preferences · Relationships · Shared experiences · Moments · Patterns — as **Understanding Candidates**, not buried Memory ON.

## Two permission layers

| Layer | Question |
|-------|----------|
| **Access** | Can Opal access this category? |
| **Action** | What may Opal do with it? (Suggest · Prepare · Execute) |

Example — Calendar: Access = read. Actions = suggest plans / create drafts / create events / manage events.  
Example — Calls: Access = assist context. Actions = suggest / prepare / place / summarize.

## User-expectation discipline

Every YOU domain must prove emotional contract, not only wire:

| Domain | User expects | System must prove |
|--------|--------------|-------------------|
| Privacy | I control Opal | Permission state persists |
| Location | Opal helps coordinate | Sharing boundaries work |
| Calls | Opal can help me communicate | Authority levels are clear |
| Linked Devices | Opal follows me | Device state is real |
| Grow Your Circle | I can connect my world | Contacts/matching honest |

## Related

- `YOU_TRUST_MODEL.md` — trust questions; open Privacy/Control and How Opal Helps evolution  
- `USER_VS_CONTROL_LAW.md` — User never merges with Control  
- `OPAL_COMPLEXITY_LAW.md` — users feel alignment; never manage algorithm knobs  
- `OPAL_PERMISSION_ARCHITECTURE.md`  
- `OPAL_UNDERSTANDING_LAW.md` (Understanding Candidate)  
- `docs/evidence/u_page/YOU_PAGE_CAPABILITY_MATRIX.md`  
