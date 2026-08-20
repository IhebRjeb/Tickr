# Phases 9–10 — Hi-Fi Designs, Responsive Specs & Prototype

| Field | Value |
| --- | --- |
| **Phase** | 9–10 of 11 |
| **Epic** | [01-frontend-plan-and-design-direction.md](01-frontend-plan-and-design-direction.md) |
| **Status** | 🚧 Specification complete · Figma artefacts pending |
| **Owner** | Product Design |
| **Depends on** | [Phase 7](08-design-system.md) · [Phase 8](09-wireframes.md) |

> **Objective:** Apply the design system to every wireframe, define how each screen behaves at every
> breakpoint, and prototype the core purchase flow including its failure branches.

> **Scope note.** The Figma files are external artefacts. This document is the **specification and
> the acceptance gate** for them: what must be produced, how it is reviewed, and where the links go.
> Everything a designer needs to execute is here; nothing here waits on Figma.

---

## Contents

| | Section |
|---|---|
| **1** | [The hi-fi process](#1-the-hi-fi-process) |
| **2** | [The design review gate](#2-the-design-review-gate) |
| **3** | [Responsive specifications](#3-responsive-specifications) |
| **4** | [Transformation rules](#4-transformation-rules) |
| **5** | [The prototype](#5-the-prototype) |
| **6** | [Coverage tracker](#6-coverage-tracker) |
| — | [Acceptance Criteria](#acceptance-criteria) |

---

## 1. The hi-fi process

The Epic permits an AI-assisted workflow (ChatGPT → Figma Make → Figma Agent → Claude + Figma MCP).
It is permitted for **generation**, never for **acceptance** — every screen passes the manual gate in
§2 before it counts as delivered.

| Step | Output | Gate |
|---|---|---|
| 1 | Tokens imported into Figma as **variables** from [Phase 7](08-design-system.md) | Variable names match the CSS custom properties exactly |
| 2 | Base components built from [Phase 6](07-component-inventory.md) | Every component has all its states as variants |
| 3 | AI-assisted screen generation from the Phase 8 wireframes | — |
| 4 | **Manual design review** | §2 checklist, per screen |
| 5 | Money-path screens re-reviewed by a second reviewer | Sign-off recorded in the tracker |

**The rule that makes AI assistance safe:** a generated screen may only use tokens that already exist.
A new hex value, a new spacing step or a new radius appearing in a mockup is a **review failure**, not
a design decision — if a token is genuinely missing, it goes back to Phase 7 first.

---

## 2. The design review gate

Every screen is checked against all ten. Any failure blocks acceptance.

| # | Check |
|---|---|
| 1 | **Tokens only** — no ad-hoc colours, spacing, radii or shadows |
| 2 | **Contrast verified** — body text ≥ 4.5:1, non-text ≥ 3:1. `ink-400` is never text on a light surface; `ink-500` never on `surface-2` |
| 3 | **All states designed** — default · loading · empty · error · plus the screen's own conflict states |
| 4 | **Touch targets** ≥ 44 × 44 px, ≥ 8 px apart; primary CTA 48 px on mobile |
| 5 | **Greyscale test** — the screen remains comprehensible with colour removed |
| 6 | **French copy** — real strings, not lorem; « vous »; no emoji in chrome; no "Oups !" |
| 7 | **360 px check** — nothing clipped or horizontally scrolling at the narrow end |
| 8 | **Money screens**: total is the heaviest number; fee line present; countdown in both forms |
| 9 | **Imagery**: fixed aspect ratio, scrim behind any overlaid text, fallback state designed |
| 10 | **Focus states** drawn for every interactive element |

---

## 3. Responsive specifications

Design at **390 px**, verify at **360 px**. Breakpoints are Tailwind defaults, unmodified.

### 3.1 Discovery — `/events`

| Breakpoint | Layout |
|---|---|
| base | 1 column · 16 px gutter · filters open as a full-height sheet · bottom tab bar |
| `sm` 640 | 2 columns |
| `md` 768 | 2–3 columns · filters become an inline bar · tabs → header nav |
| `lg` 1024 | 3 columns · persistent filter rail |
| `xl` 1280 | 4 columns · content capped at 1280 px, gutters grow |

### 3.2 Event detail — `/events/[id]`

| Breakpoint | Layout |
|---|---|
| base | Single column · **4:5 portrait hero** · sticky bottom purchase bar · selection in a bottom sheet |
| `md` 768 | 16:9 hero · wider measure · sheet becomes a centred modal |
| `lg` 1024 | **Two columns: content left, sticky ticket-selection panel right.** The bottom bar disappears — the purchase never leaves the page |
| `xl` 1280 | Same, wider right rail |

### 3.3 Checkout — `/checkout/[orderId]`

| Breakpoint | Layout |
|---|---|
| base | Single column · countdown pinned under the wordmark · CTA at the bottom, safe-area aware |
| `md` 768 | Centred column, max 560 px · countdown stays pinned |
| `lg` 1024 | Unchanged — **checkout is deliberately never widened.** Extra width adds no information and dilutes focus |

### 3.4 Tickets — `/tickets`, `/tickets/[id]`

| Breakpoint | Layout |
|---|---|
| base | Full-width pass · QR fills the width minus gutters, ≥ 240 px |
| `md` 768 | Pass capped at 420 px, centred — **the QR does not grow indefinitely**; a scanner needs a stable size |
| `lg` 1024 | List becomes 2 columns; the detail pass stays capped |

### 3.5 Organizer dashboard — `/organizer`

| Breakpoint | Layout |
|---|---|
| base | Stacked KPI tiles · event list as cards · no sidebar |
| `md` 768 | 3 KPI tiles in a row · list gains columns |
| `lg` 1024 | Persistent left sidebar · charts side by side · **tables at 40 px rows — the only density increase in the system** |

---

## 4. Transformation rules

These four rules cover most breakpoint questions and should be applied without re-deciding:

1. **Bottom sheet → centred modal at `md`.** Same content, same states; only the container changes.
2. **Bottom tabs → header nav at `md`.** The four participant destinations survive; they do not become a hamburger.
3. **Sticky bottom bar → sticky right rail at `lg`** on the event page only. On every other screen the bottom bar simply persists.
4. **Density never increases** except admin and organizer data tables at `lg`+.

Everything else is the same design at a different width. **A layout that only works by hiding things
below `md` has failed** — if a feature is worth showing on desktop, it needs a mobile place.

---

## 5. The prototype

One interactive prototype covering the **core participant purchase flow with two failure branches**.
The failure branches are mandatory: a prototype that only demonstrates the happy path proves nothing
about the product's hardest screens.

### 5.1 Frames and transitions

```
  [Landing] ──tap card──▶ [Event detail] ──tap sticky bar──▶ [Ticket sheet]
                                                                  │
                                                        set qty 2 │ tap Continuer
                                                                  ▼
                                                            [Checkout]
                                                                  │
                                            ┌─────────────────────┼─────────────────────┐
                                            │ pay (happy)         │ pay (fail)          │ wait 15:00
                                            ▼                     ▼                     ▼
                                   [Konnect (static)]    [Payment failed]        [Hold expired]
                                            │                     │                     │
                                            ▼            retry w/ Paymee          Reprendre
                                     [Payment return]             │              ma sélection
                                       polling 3s                 ▼                     │
                                            ▼            [Payment return]               ▼
                                     [Confirmation]               ▼              [Ticket sheet]
                                            │              [Confirmation]
                                     Voir mes billets
                                            ▼
                                    [Ticket + QR]
```

### 5.2 Required frames

| # | Frame | Note |
|---|---|---|
| 1 | Landing | Entry |
| 2 | Event detail | Sticky bar visible |
| 3 | Ticket sheet — qty 2 | Breakdown visible, total in the button |
| 4 | Checkout — Konnect selected | Countdown at 14:32 |
| 5 | Gateway (static placeholder) | Not a real integration |
| 6 | Payment return — polling | « Ne fermez pas cette page » |
| 7 | Confirmation | Amount, reference, one CTA |
| 8 | Ticket + QR | The payoff |
| 9 | **Payment failed** | « Aucun montant n'a été débité » · countdown still running · retry with another provider |
| 10 | **Hold expired** | « Les billets ont été remis en vente » · selection preserved · one recovery |

### 5.3 What the prototype must demonstrate

- Purchase reachable in **two taps** from a card, with no login before the price.
- The fee disclosed the moment a quantity exists — the total never changes afterwards.
- The countdown running continuously, in both relative and absolute form, **including across the gateway round trip**.
- A failure that states clearly that no money was taken, and offers exactly one way forward.
- An expiry that preserves the selection rather than dumping the user at the start.

---

## 6. Coverage tracker

| Zone | Routes | Hi-fi | Responsive verified | Reviewed |
|---|---|---|---|---|
| Public | 11 (+3 static) | ☐ | ☐ | ☐ |
| Participant | 9 | ☐ | ☐ | ☐ |
| Organizer | 9 | ☐ | ☐ | ☐ |
| Admin | 4 | ☐ | ☐ | ☐ |
| **Total** | **33 (+3)** | ☐ | ☐ | ☐ |

**Figma hi-fi file:** _link here._
**Prototype link:** _link here._

> Related exploration from the Epic thread: a [Stitch project](https://stitch.withgoogle.com/projects/16048819837218455846)
> and [motionsites.ai](https://motionsites.ai/) were shared as references. Treat both as **inspiration
> only** — anything adopted from them must still pass §2, and motion must respect the
> `prefers-reduced-motion` rule in [Phase 7](08-design-system.md).

---

## Acceptance Criteria

- [x] Hi-fi process defined, including where AI assistance is and is not permitted
- [x] A ten-point manual review gate defined, applied per screen
- [x] Responsive specifications written for all five key screen families
- [x] Mobile → tablet → desktop transformation rules defined
- [x] Prototype flow specified, with two mandatory failure branches and all ten frames
- [ ] **Hi-fi mockups produced for all 33 routes** — external deliverable
- [ ] **Manual design review passed and recorded** per screen
- [ ] **Interactive prototype built** and demonstrating both failure branches
- [ ] **Responsive behaviour verified at 360 / 390 / 768 / 1024 / 1440 px and at 200 % zoom**

---

**Next:** [Phase 11 — Frontend Architecture](11-frontend-architecture.md).
