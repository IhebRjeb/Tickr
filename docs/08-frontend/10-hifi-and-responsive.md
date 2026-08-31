# Phases 9–10 — Hi-Fi Designs, Responsive Specs & Prototype

| Field | Value |
| --- | --- |
| **Phase** | 9–10 of 11 |
| **Epic** | [01-frontend-plan-and-design-direction.md](01-frontend-plan-and-design-direction.md) |
| **Status** | 🚧 Specification complete · Figma artefacts pending |
| **Owner** | Product Design |
| **Depends on** | [Phase 5 — Feature Inventory](06-feature-inventory.md) (screen IDs, state tables) · [Phase 6 — Component Inventory](07-component-inventory.md) · [Phase 7 — Design System](08-design-system.md) · [Phase 8 — Wireframes](09-wireframes.md) |

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
| 2 | The 25 base primitives, 30 domain components and layout shell of [Phase 6](07-component-inventory.md) built in Figma | Every one carries its full state matrix as variants |
| 3 | AI-assisted screen generation from the 14 [Phase 8](09-wireframes.md) archetypes | Each frame named by its Phase 5 screen ID (`P-01`…`A-04`) |
| 4 | **Manual design review** | The §2 checklist, per screen |
| 5 | Money-path screens re-reviewed by a second reviewer — **P-03, U-01, U-02, U-06** | Sign-off recorded in [§6](#6-coverage-tracker) |

**The rule that makes AI assistance safe:** a generated screen may only use tokens that already exist.
A new hex value, a new spacing step or a new radius appearing in a mockup is a **review failure**, not
a design decision — if a token is genuinely missing, it goes back to Phase 7 first.

---

## 2. The design review gate

Every screen is checked against all ten. Any failure blocks acceptance.

| # | Check |
|---|---|
| 1 | **Tokens only** — no ad-hoc colours, spacing, radii or shadows. `cobalt-600` is the sole action colour; `sun-400` never fills a button and never carries an error; there is no `ink-900` to reach for |
| 2 | **Contrast verified** — text ≥ 4.5:1, non-text ≥ 3:1. `ink-400` is never text on a light surface; `ink-500` is never used on `surface-2` (`ink-700` there instead) |
| 3 | **Every state drawn** — the seven rows of the [Phase 5](06-feature-inventory.md) state table: loading (skeleton, never a page spinner) · empty · success · error · `403` · conflict (**`400`, never `409`** — no controller emits one) · `429`. `n/a` is acceptable only where Phase 5 records `n/a` |
| 4 | **Touch targets** ≥ 44 × 44 px, ≥ 8 px apart; primary CTA `h-12` (48 px) on mobile, `h-11` from `lg` |
| 5 | **Greyscale test** — the screen remains comprehensible with colour removed |
| 6 | **French copy** — real `fr-TN` strings, not lorem; « vous »; guillemets; no emoji in product chrome; no « Oups » |
| 7 | **360 px check** — nothing clipped, no horizontal page scroll; wide content scrolls inside its own container |
| 8 | **Money screens** — the total is the heaviest number (`text-h1` minimum, `ink-950`); the platform fee is a named line **added on top** (`total = subtotal + platformFee`); `paymentFees` renders only when non-zero; `tabular-nums`, non-breaking space before `DT`, millimes only when non-zero but in full on totals; pre-order figures labelled « (estimation) »; countdown in relative **and** absolute form |
| 9 | **Imagery** — fixed aspect ratios, never distorted: 3 : 2 cards, 4 : 5 mobile hero, 16 : 9 hero from `md`; a reserved aspect-ratio box; a scrim behind any overlaid text; the missing-poster fallback drawn |
| 10 | **Focus states** drawn for every interactive element — `cobalt-600` ring on light, `sun-400` on dark |

---

## 3. Responsive specifications

Design at **390 px**, verify at **360 px**. Breakpoints are the Tailwind defaults, unmodified
([Phase 1 §I.2](02-product-design-brief.md#i2-breakpoints) ·
[Phase 7 §4.4](08-design-system.md#44-breakpoints-and-containers)): `sm` 640 · `md` 768 · `lg` 1024 ·
`xl` 1280 · `2xl` 1536. The shell is `max-w-content` (1280 px) with gutters `px-4 md:px-6 lg:px-8`;
past `xl` the content stays capped and only the gutters grow. Five families are specified here; every
other route inherits from one of them through §4.

### 3.1 Discovery — P-02 `/events`

| Breakpoint | Layout |
|---|---|
| base | 1 column · 16 px gutter · filters in a full-height sheet whose apply button carries the live result count (« Voir 24 événements ») · bottom tab bar, 56 px above `env(safe-area-inset-bottom)` |
| `sm` 640 | 2 columns |
| `md` 768 | 2 columns held · filters become an inline bar · tabs → header nav |
| `lg` 1024 | 3 columns · persistent filter rail |
| `xl` 1280 | 4 columns, container at its 1280 px cap |

`next/image` `sizes` must declare this exact ladder — a phone that downloads a four-column desktop
poster is a review failure, not a performance detail.

### 3.2 Event detail — P-03 `/events/[id]`

| Breakpoint | Layout |
|---|---|
| base | Single column · **4 : 5 portrait hero** · sticky purchase bar appears once the price block scrolls out · ticket selection in a bottom sheet |
| `md` 768 | 16 : 9 hero · description capped at `max-w-prose-tickr` (720 px) · the sheet becomes a centred modal |
| `lg` 1024 | **Two columns: content left, sticky ticket-selection panel right.** The bottom bar is removed, not hidden — the purchase never leaves the page |
| `xl` 1280 | Same layout at the 1280 px cap; the right rail takes the extra width |

### 3.3 Checkout — U-01 `/checkout/[orderId]` · U-02 `/checkout/[orderId]/retour`

| Breakpoint | Layout |
|---|---|
| base | Single column · countdown pinned under the wordmark · CTA bottom-anchored above `env(safe-area-inset-bottom)`. **No tab bar at any width** — both routes sit in the `(checkout)` group, so the chrome is structurally absent rather than hidden |
| `md` 768 | Centred column, max 560 px · countdown stays pinned |
| `lg` 1024 | Unchanged — **checkout is deliberately never widened.** Extra width adds no information and dilutes the one decision on the page |

At 360 px U-02 shows the order reference, the running countdown and « Ne fermez pas cette page »
without scrolling; the waiting state is the default state there, not an error.

### 3.4 Tickets — U-05 `/tickets` · U-06 `/tickets/[id]`

| Breakpoint | Layout |
|---|---|
| base | Full-width dark `ink-950` pass · QR on pure white with a quiet zone, ≥ 240 px |
| `md` 768 | Pass capped at 420 px, centred — **the QR does not grow indefinitely**; a scanner reads a stable size faster than a large one |
| `lg` 1024 | The list goes to 2 columns; the detail pass stays capped |

### 3.5 Organizer dashboard — O-01 `/organizer`

| Breakpoint | Layout |
|---|---|
| base | Stacked KPI tiles · event list as cards — **tables never appear below `lg`** · persistent bottom-anchored « Scanner » action, the one organizer control designed for the thumb |
| `md` 768 | 3 KPI tiles in a row · list gains columns · still no sidebar |
| `lg` 1024 | Persistent 240 px left sidebar · charts side by side · data tables at 40 px rows (`h-10`) — **the only density increase in the system** |

---

## 4. Transformation rules

These four rules settle most breakpoint questions and are applied without re-deciding:

1. **Bottom sheet → centred modal at `md`.** Same content, same states, same copy; only the container changes.
2. **Bottom tabs → header nav at `md`.** All four participant destinations survive — Découvrir · Recherche · Mes billets · Compte — as a top bar, never as a hamburger.
3. **Sticky bottom bar → sticky right rail at `lg`**, on P-03 only. Everywhere else the bottom-anchored action simply persists at every width.
4. **Density never increases**, except organizer and admin data tables at `lg`+ (40 px rows). Touch targets never shrink on desktop.

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
    P-01                   P-03                              P-03 · sheet
                                                                    │ qty 2 · « Continuer »
                                                                    ▼
  ┌──────────────────────────────────────────────────────────▶ [Checkout] U-01 ──15:00 elapses──▶ [Hold expired]
  │                                                                 │                                    │
  │                                                            pay  ▼                                    │
  │                                                        [Gateway (static)]               « Reprendre ma sélection »
  │                                                                 │                                    ▼
  │  « Choisir un autre                                             ▼                             [Ticket sheet]
  │    moyen de paiement »                                [Payment return] U-02
  │                                       poll GET /orders/:id · 2 s → 3 s → 5 s · 60 s ceiling
  │                                                       ┌─────────┴───────────────┐
  │                                                FAILED │                         │ PAID
  │                                                       ▼                         ▼
  └───────────────────────────────────────────────[Payment failed]           [Confirmation] U-02 · PAID
                                                    U-02 · FAILED                   │
                                                                          « Voir mes billets »
                                                                                    ▼
                                                                              [Ticket + QR] U-06
```

### 5.2 Required frames

| # | Frame | Screen | Must show |
|---|---|---|---|
| 1 | Landing | P-01 `/` | Entry — one event card is tapped |
| 2 | Event detail | P-03 `/events/[id]` | Price above the fold, sticky purchase bar visible |
| 3 | Ticket sheet — qty 2 | P-03 · sheet | Breakdown with the fee line marked « (estimation) », total repeated in the button |
| 4 | Checkout — Konnect selected | U-01 `/checkout/[orderId]` | Countdown at 14:32, relative **and** absolute; `platformFee` and `total` now rendered verbatim from `POST /orders` |
| 5 | Gateway | *external* | Static placeholder — not a real integration |
| 6 | Payment return — polling | U-02 `/checkout/[orderId]/retour` | « Nous confirmons votre paiement… Ne fermez pas cette page. » · countdown still visible |
| 7 | Confirmation | U-02 · `PAID` | Amount paid, order reference, « un email de confirmation est en route », one CTA « Voir mes billets » |
| 8 | Ticket + QR | U-06 `/tickets/[id]` | Dark pass; QR ≥ 240 px on white with a quiet zone, rendered client-side from the `qrCode` string |
| 9 | **Payment failed** | U-02 · `FAILED` | « Aucun montant n'a été débité » · countdown still running (a failed attempt does not release the hold) · « Choisir un autre moyen de paiement », offered while the order has fewer than 3 attempts (`payment.entity.ts:50`); the third failure releases the hold and offers « Voir mes commandes » instead. The same state renders on U-01 when `POST /orders/:id/pay` returns `400 GATEWAY_ERROR` |
| 10 | **Hold expired** | U-01 · expired | « Les billets ont été remis en vente » · selection preserved · one recovery, « Reprendre ma sélection » |

Two states are required as **hi-fi frames** under §2 check 3 but are deliberately not prototype
branches: `400 INSUFFICIENT_AVAILABILITY` on « Continuer » (the order is never created, so there is
no transition to demonstrate) and the poll ceiling « vérification en cours » (whose correct
behaviour is the *absence* of a retry).

### 5.3 What the prototype must demonstrate

- The **ticket sheet reachable in two taps** from any event card, with no account asked before the price ([Phase 1 §E.1](02-product-design-brief.md#e1--two-taps-from-poster-to-checkout-and-never-ask-who-you-are-before-showing-the-price)). The prototype runs signed in; the sign-in interruption at « Continuer » is a separate frame set.
- The fee disclosed the instant a quantity exists — labelled « (estimation) » until `POST /orders` returns, and identical to `order.total` afterwards.
- The countdown running continuously in both relative and absolute form, **including across the gateway round trip** — driven by `order.expiresAt` (15 min, `create-order.handler.ts:42`), never by a client timer.
- A failure that states plainly that no money was taken, and offers exactly one way forward.
- An expiry that preserves the selection rather than returning the user to the start.

---

## 6. Coverage tracker

| Zone | Routes | Screen IDs | Hi-fi | Responsive verified | Reviewed |
|---|---|---|---|---|---|
| Public | 11 (+3 static `/legal/*`) | `P-01`…`P-11` | ☐ | ☐ | ☐ |
| Participant | 9 | `U-01`…`U-09` | ☐ | ☐ | ☐ |
| Organizer | 9 | `O-01`…`O-09` | ☐ | ☐ | ☐ |
| Admin | 4 | `A-01`…`A-04` | ☐ | ☐ | ☐ |
| **Total** | **33 (+3)** | **33 IDs** | ☐ | ☐ | ☐ |

Counts reconcile with [Phase 2 §1.6](03-information-architecture.md#16-route-count-reconciliation).
The three `/legal/*` pages are one static group and carry no screen ID.

**Figma hi-fi file:** _link here._
**Prototype link:** _link here._

> Related exploration from the Epic thread: a [Stitch project](https://stitch.withgoogle.com/projects/16048819837218455846)
> and [motionsites.ai](https://motionsites.ai/) were shared as references. Treat both as **inspiration
> only** — anything adopted from them must still pass §2, and motion must respect the
> `prefers-reduced-motion` rule in [Phase 7 §5](08-design-system.md#5-motion).

---

## Acceptance Criteria

- [x] Hi-fi process defined, including where AI assistance is and is not permitted
- [x] A ten-point manual review gate defined, applied per screen
- [x] Responsive specifications written for all five key screen families (P-02, P-03, U-01/U-02, U-05/U-06, O-01)
- [x] Mobile → tablet → desktop transformation rules defined
- [x] Prototype flow specified, with two mandatory failure branches and all ten frames
- [ ] **Hi-fi mockups produced for all 33 routes** — external deliverable
- [ ] **Manual design review passed and recorded** per screen
- [ ] **Interactive prototype built** and demonstrating both failure branches
- [ ] **Responsive behaviour verified at 360 / 390 / 768 / 1024 / 1440 px, and at 200 % browser zoom at 1280 px**

---

**Next:** [Phase 11 — Frontend Architecture](11-frontend-architecture.md).
