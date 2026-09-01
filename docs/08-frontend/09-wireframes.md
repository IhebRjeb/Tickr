# Phase 8 — Low-Fidelity Wireframes

| Field          | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Phase**      | 8 of 11                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Epic**       | [01-frontend-plan-and-design-direction.md](01-frontend-plan-and-design-direction.md)                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Status**     | ✅ Complete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Owner**      | Product Design                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Depends on** | [Phase 1 — Product Design Brief](02-product-design-brief.md) (§E principles, §F flow, §G failure shapes) · [Phase 2 — Information Architecture](03-information-architecture.md) (canonical route tree) · [Phase 4 — Screen Inventory](05-screen-inventory.md) (33 routes, states, priorities) · [Phase 5 — Feature Inventory](06-feature-inventory.md) (per-screen behaviour and copy) · [Phase 6 — Component Inventory](07-component-inventory.md) · [Phase 7 — Design System](08-design-system.md) (density, targets, radii) |

> **Objective:** Fix the **structure** of every Tickr screen — layout, hierarchy, navigation and
> flow — before a single visual decision is applied. This document is the **wireframe
> specification**: it defines the conventions, then draws a black-and-white, mobile-first, 390 px
> frame for each of the fourteen screen archetypes the other twenty routes inherit from, states
> what each frame must _prove_, and defines the review protocol that gates Phase 9. The Figma file
> is executed **against this document** and linked back into [§4](#4-tracking).

---

## Contents

| §                                 | Section                                                              |
| --------------------------------- | -------------------------------------------------------------------- |
| [0](#0-how-to-read-this-document) | How to read this document                                            |
| [1](#1-wireframe-conventions)     | Wireframe conventions — canvas, notation, naming, rejection criteria |
| [2](#2-the-screen-set)            | The screen set — fourteen archetypes and how routes inherit          |
| [3](#3-the-wireframes)            | The wireframes — money path drawn in full, the rest specified        |
| [4](#4-tracking)                  | Tracking — ASCII spec, Figma frame, review status                    |
| [5](#5-review-protocol)           | Review protocol                                                      |
| —                                 | [Acceptance Criteria](#acceptance-criteria)                          |

---

## 0. How to read this document

### 0.1 What a wireframe decides here

A Tickr wireframe answers exactly six questions and nothing else:

1. **What is on the screen**, and in what order down the page.
2. **What is above the fold** at 390 × 844, and what is not.
3. **Where the single primary action lives** and how the thumb reaches it.
4. **What navigation is available** from this screen, and what is deliberately absent.
5. **Which region belongs to which API response**, so no box exists that no endpoint can fill.
6. **Which states the screen must have frames for** beyond the happy path.

Everything else is already decided. Colour, type, radius, elevation, motion and density were locked
in [Phase 1 §D](02-product-design-brief.md#d-visual-direction) and turned into tokens in
[Phase 7](08-design-system.md). A wireframe review that argues about a colour is a review that has
gone wrong.

### 0.2 What a wireframe must **not** decide

| Not decided here                 | Where it is decided                                                                                                                                                                             |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Colour, including status colour  | [Phase 7 §2](08-design-system.md#2-colour)                                                                                                                                                      |
| Typeface, weight, exact size     | [Phase 7 §3](08-design-system.md#3-typography)                                                                                                                                                  |
| Radius, shadow, elevation        | [Phase 7 §4](08-design-system.md#4-spacing-radius-elevation-and-layout)                                                                                                                         |
| Iconography (which glyph)        | [Phase 7 §9](08-design-system.md#9-iconography) — frames use a labelled box, never a chosen icon                                                                                                |
| Real photography or real posters | Every image is a `▒` placeholder. A wireframe that looks good only because of a beautiful poster has proved nothing                                                                             |
| Final microcopy wording          | [Phase 5](06-feature-inventory.md) owns the string table. Frames carry **copy direction** — real French of realistic length, so the layout is tested against the sentence it will actually hold |

**The one exception, and it is deliberate: money, counts and countdowns are drawn with real values.**
`106,000 DT`, `Il reste 12:34`, `Plus que 7 places`. A wireframe with `Lorem 00,00` cannot prove that
the total fits on the same line as its label, which is the single most common layout failure in a
checkout.

### 0.3 Contract corrections this phase inherits

These are carried forward from [Phase 4 §0.5](05-screen-inventory.md#05-contract-corrections-carried-into-this-phase)
because they change what a frame is allowed to draw. **Every frame in this document follows the code,
not the issue text.**

| Stated in GitHub issue #64 / the old scaffolds       | Verified in `backend/src` — what the frames draw                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API base `/v1`                                       | **`/api`** (`main.ts:17`, `config/app.config.ts` → `API_PREFIX \|\| 'api'`). Every `DATA` line below reads `https://api.tickr.tn/api/…`. Swagger at `/api/docs`                                                                                                                                                                                                                                                                                                                                        |
| `GET /config/public` supplies the commission rate    | **Implemented.** Ticket-selection frames use `?eventId=<uuid>` and `effectiveCommissionRate`; Admin overrides affect new orders only                                                                                                                                                                                                                                                                                                                                                                   |
| Pagination `{ data, meta: { … } }`                   | **Flat** — `{ data, total, page, limit, totalPages, hasNextPage, hasPreviousPage }`. The « Charger plus » control in the discovery frame is driven by `hasNextPage`, and the count line by `total`                                                                                                                                                                                                                                                                                                     |
| The error envelope carries a machine-readable `code` | It does not: `{ statusCode, code, message, details, timestamp, path, method }`. Failure frames are therefore selected by **status + endpoint context**, which is why each failure is drawn as a **state of the screen that caused it** (§3.4–§3.6) rather than as one generic error component. Note that `403` alone carries eight distinct verified meanings — the full table is [Phase 2 §5.3](03-information-architecture.md#53-the-eight-meanings-of-403), and no other document may contradict it |
| Sold out → `409`, rate limited → `429`               | Sold out → **`400`**; order-creation rate limiting → **`403`** (`ForbiddenException`). The « limite de 5 commandes par heure » frame is a 403 state, not a 429 one                                                                                                                                                                                                                                                                                                                                     |

One more, inherited from the existing frontend rather than the issue:
`frontend/src/lib/api/client.ts` redirects to **`/auth/login`**, while the canonical route tree says
**`/login`** — and it hard-redirects on _any_ `401` with **no refresh attempt**. Both are defects to
fix before the first screen ships. The login archetype in [§3.8](#38-remaining-archetypes--compact-specs) is drawn at
**`/login`**, and the checkout frames assume a **silent refresh** rather than a redirect, because a
redirect mid-checkout destroys the order context the countdown is protecting.

---

## 1. Wireframe conventions

### 1.1 Canvas and grid

| Property                   | Value                                                  | Why                                                                                                                                 |
| -------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Design canvas**          | **390 × 844**                                          | The realistic modern mid-range default ([Phase 1 §I.1](02-product-design-brief.md#i1-mobile-is-the-design-target-not-the-fallback)) |
| **Mandatory stress width** | **360**                                                | Still extremely common on mid-range Android in Tunisia. Any frame that breaks at 360 is rejected                                    |
| **Gutter**                 | **16 px** (`space-4`) both sides                       | Content column is therefore **358 px** at 390, **328 px** at 360                                                                    |
| **Vertical rhythm**        | 4 px base, blocks separated by 24 / 32 px              | [Phase 7 §4.1](08-design-system.md#41-spacing--4-px-base)                                                                           |
| **Bottom reserve**         | **88 px** above `env(safe-area-inset-bottom)`          | Reserved for the primary action. Nothing else may live there                                                                        |
| **Header height**          | 56 px                                                  |                                                                                                                                     |
| **Bottom tab bar**         | 56 px + safe area                                      | Participant surfaces only                                                                                                           |
| **Row heights**            | control 44 · CTA 48 · data-table row 40 (desktop only) | [Phase 7 §7](08-design-system.md#7-component-density)                                                                               |
| **Minimum touch target**   | 44 × 44 with an 8 px gap                               | Drawn to scale — a frame that shows two 32 px targets touching is wrong even in black and white                                     |

**ASCII scale used in this document.** Two canvases are in use. The discovery frames
([§3.1](#31-landing--)–[§3.2](#32-discovery--events)) are drawn at a **62-column interior** —
**1 column ≈ 6 px**, **1 row ≈ 16 px** — and are therefore proportionally honest: a label and its
price that do not both fit on one interior line there will not fit at 390 px either. The money-path
frames (§3.3–§3.7) use a **38-column interior** with a spec annotation to the right of the border;
they prove order, grouping and the fold, not line fit, which is settled on the wide canvas or in
Figma. A frame taller than the viewport carries an explicit fold rule.

### 1.2 Fidelity rules

1. **Black and white only.** No colour, no tints, no brand. A status is written as a word, never
   shown as a hue — which conveniently pre-satisfies the greyscale test from
   [Phase 1 §H.1](02-product-design-brief.md#h1-colour-and-contrast): if the frame is comprehensible
   here, colour is decoration rather than information.
2. **No final typography.** Hierarchy is expressed by position, `UPPERCASE` section labels and
   indentation — never by a chosen weight or family.
3. **No imagery.** Every image region is a `▒` block labelled with its **aspect ratio and source**
   (`POSTER 4:5 · imageUrl`). Only one image per event exists (`POST /events/:id/image`), so no frame
   may draw a gallery.
4. **No icons.** Where an icon will go, the frame writes the word or a bracketed placeholder. This
   forces the layout to survive the longest French label rather than the prettiest glyph.
5. **Real French, real length.** « Vos billets sont gardés jusqu'à 21:45 » is 37 characters and it
   must fit on one line at 360 px. Placeholder Latin hides exactly this class of failure.
6. **One primary action per frame.** If a frame contains two `[[ ]]`, it is wrong.
7. **States are frames, not notes.** A screen with four states gets four frames. A state described
   only in prose has not been designed.

### 1.3 Notation legend

Every frame in [§3](#3-the-wireframes) uses this notation and nothing else. The Figma library mirrors
it one-to-one as a set of wireframe components.

| Glyph                             | Meaning                                                                                         |
| --------------------------------- | ----------------------------------------------------------------------------------------------- |
| `┌─┐ │ └─┘ ├─┤`                   | Container / frame boundary. The outermost box is the 390 px viewport                            |
| `╔═╗ ║ ╚═╝`                       | **Sticky** region — fixed to the viewport, does not scroll with content                         |
| `▒▒▒▒`                            | Image region. Always labelled with aspect ratio and the field that fills it                     |
| `░░░░`                            | Inset block (`surface-2`) — order summary, disabled field, table stripe                         |
| `▓▓▓░░░`                          | Progress / capacity bar                                                                         |
| `[[ Label ]]`                     | **Primary** action, 48 px, full width unless the frame shows otherwise                          |
| `[ Label ]`                       | Secondary action, 44 px                                                                         |
| `[ CAPS LABEL ]` filling a region | A labelled placeholder region, not a control — `[ POSTER 4:5 ]`, `[ QR ≥ 240px ]`               |
| `< Label >`                       | Ghost / tertiary / link-style action                                                            |
| `( placeholder .... )`            | Text input. The label always sits **above** it on its own line                                  |
| `(o)` / `( )`                     | Radio — selected / unselected                                                                   |
| `[x]` / `[_]`                     | Checkbox — checked / unchecked                                                                  |
| `< - >  2  < + >`                 | Quantity stepper, 44 px targets                                                                 |
| `▾`                               | Disclosure, select or menu trigger                                                              |
| `● ○ ○`                           | Pagination dots for a rail                                                                      |
| `···`                             | Repeated or truncated content of the same gabarit                                               |
| `{ ... }`                         | **State annotation** — an engineering condition or an unnamed component, never rendered copy    |
| `FOLD (844 px)` on a rule         | The initial viewport boundary. Everything below it requires a scroll                            |
| `@@1`                             | Callout marker, resolved in the **Notes** table under the frame                                 |
| `@R` / `@C`                       | The item that follows is right-aligned / centred on its interior line                           |
| `##` and `==` inside a rule       | ASCII fill for `─` and `═` where a label is dropped into the rule (`┌## 390 x 844 ##┐`)         |
| Text right of the closing border  | Spec annotation for the reviewer, never rendered. Used instead of `@@n` in the 38-column frames |

Each frame is preceded by a header naming its route, its data and its purpose:

```
ROUTE    the canonical Phase 2 route            RENDER  the Phase 4 rendering code
DATA     the exact endpoints on api.tickr.tn/api, and any that are absent
PROVES   the one sentence this frame has to demonstrate
```

`PROVES` is not decoration. A frame that cannot state what it proves is a frame nobody can review.

### 1.4 Content rules inside a frame

| Rule                                                                | Consequence in the frames                                                                                                                                                                                                                             |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Money is drawn at full precision in summaries, trimmed on cards** | `100,000 DT` in an order summary; `50 DT` on a discovery card. TND has 3 decimals and the symbol `DT` (`shared/domain/value-objects/currency.vo.ts:37-40`); millimes are shown only when non-zero, and always at full precision in a total or receipt |
| **Availability is a number and a sentence**                         | « Plus que 7 places », never a greyed control. Driven by `availableQuantity` / `isSoldOut` / `isOnSale`, which the API already computes                                                                                                               |
| **Availability is a snapshot, never a counter**                     | No frame draws a ticking number. `soldQuantity` moves at **hold** time and is restored on expiry or cancellation, so the figure can legitimately go _up_ — every frame treats it as a per-fetch snapshot, and sold out as reversible                  |
| **The countdown is always drawn twice**                             | Relative « Il reste 12:34 » **and** absolute « jusqu'à 21:45 ». The absolute form is the only one that survives a Konnect redirect                                                                                                                    |
| **The fee is drawn from the first quantity onward**                 | The summary block appears in the ticket sheet, unchanged in structure through checkout, order and confirmation                                                                                                                                        |
| **Every failure frame names the money**                             | « Aucun montant n'a été débité. » is drawn as a line, not implied                                                                                                                                                                                     |
| **No fabricated social proof**                                      | No « 12 personnes regardent », no ratings, no favourite counts — none of it exists in the API                                                                                                                                                         |

### 1.5 Figma frame naming

So a reviewer can find a frame from a checklist row without searching:

```
08-LOFI / <role> / <NN>-<screen-slug> / <state>

08-LOFI / participant / 05-checkout / default
08-LOFI / participant / 05-checkout / expired
08-LOFI / participant / 05-checkout / 403-rate-limited
08-LOFI / organizer   / 14-scanner  / invalid-already-checked-in
```

`<role>` is one of `public · participant · organizer · admin`. `<NN>` is the archetype number from
[§2.1](#21-the-fourteen-archetypes). `<state>` is `default` or one of the state names listed in that
archetype's **States to draw** table.

### 1.6 What makes a wireframe rejectable

A reviewer returns a frame — without discussion — if any of these is true:

- It contains more than one primary action.
- Its primary action is not in the bottom 88 px on a mobile frame that has one.
- It breaks at 360 px.
- It shows a price without showing what that price includes, once a quantity exists.
- It shows a countdown in only one of the two required forms.
- It shows a disabled control with no adjacent sentence explaining why.
- It draws a box no endpoint in [§3](#3-the-wireframes) can fill.
- It uses colour, a chosen icon, or a real photograph.
- It has fewer frames than the archetype's **States to draw** table demands.

---

## 2. The screen set

### 2.1 The fourteen archetypes

Phase 4 catalogues **33 routes** plus the static `/legal/*` group. Drawing all 33 would produce
20 near-duplicates and hide the seven layouts that actually carry risk. Instead, this phase draws
**fourteen archetypes** — thirteen routes plus the ticket sheet, which has no URL of its own, each
chosen because it introduces a layout problem the others do not solve. The remaining **twenty**
routes inherit from them in [§2.2](#22-how-the-remaining-routes-inherit).

| #   | Archetype                                                           | Route                              | Role                                 | P      | The layout problem it is the only screen to solve                                                                  |
| --- | ------------------------------------------------------------------- | ---------------------------------- | ------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------ |
| 01  | [Landing](#31-landing--)                                            | `/`                                | public                               | P1     | A browsable surface answerable by thumb, with no query and no account                                              |
| 02  | [Discovery](#32-discovery--events)                                  | `/events`                          | public                               | **P0** | Value-labelled filters + a card that carries when, where, how much and availability without a tap                  |
| 03  | [Event detail](#33-event-detail--eventsid)                          | `/events/[id]`                     | public                               | **P0** | Facts before prose, an invariant section order, and the product's most important control — the sticky purchase bar |
| 04  | [Ticket selection sheet](#34-ticket-selection-sheet--over-eventsid) | sheet over `/events/[id]`          | public                               | **P0** | Tier + quantity + holder + the complete arithmetic, in one sheet, without losing the event behind it               |
| 05  | [Checkout](#35-checkout--checkoutorderid)                           | `/checkout/[orderId]`              | participant                          | **P0** | A stripped trust surface: countdown, money, provider choice, nothing else                                          |
| 06  | [Payment return](#36-payment-return--checkoutorderidretour)         | `/checkout/[orderId]/retour`       | participant                          | **P0** | A screen whose truth has not arrived yet, and which must never guess                                               |
| 07  | [Order confirmation](#38-remaining-archetypes--compact-specs)       | `/orders/[id]`                     | participant                          | **P0** | The receipt: what was paid, what it bought, and the non-refundable fee, stated before it matters                   |
| 08  | [My tickets](#38-remaining-archetypes--compact-specs)               | `/tickets`                         | participant                          | **P0** | A wallet where today's ticket is reachable in one tap                                                              |
| 09  | [Ticket + QR](#37-ticket--ticketsid)                                | `/tickets/[id]`                    | participant                          | **P0** | A dark, offline-capable physical object, readable at a venue door at night                                         |
| 10  | [Login](#38-remaining-archetypes--compact-specs)                    | `/login`                           | public                               | **P0** | The one authentication moment, entered mid-purchase and returning to it intact                                     |
| 11  | [Organizer dashboard](#38-remaining-archetypes--compact-specs)      | `/organizer`                       | organizer                            | P1     | Three numbers on a phone, plus a first-run state that is an onboarding moment                                      |
| 12  | [Create event](#38-remaining-archetypes--compact-specs)             | `/organizer/events/new`            | organizer                            | **P0** | A multi-step form whose order mirrors a poster, with live buyer-price arithmetic                                   |
| 13  | [Event analytics](#38-remaining-archetypes--compact-specs)          | `/organizer/events/[id]/analytics` | organizer                            | P1     | Charts on a 390 px screen without a horizontal scroll, labelled **gross**                                          |
| 14  | [Scanner](#38-remaining-archetypes--compact-specs)                  | `/check-in`                        | event owner / admin / assigned staff | **P0** | A dark, event-scoped tool with event selection, mandatory station setup, revocation handling, and no offline queue |

### 2.2 How the remaining routes inherit

No route is left without a frame to build from. Each row below states which archetype it clones and
**what genuinely differs** — the delta is what the designer draws as a variant, not a new frame.

| Route                                                  | Inherits                              | Delta to draw                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------ | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/search`                                              | 02 Discovery                          | Query echoed in the `<h1>`; the no-results state echoes the query only (« Aucun événement pour “jazz” »). ⚠ `GET /events/search` takes **`q`, `page`, `limit` and nothing else**, so the filter chip row is **removed**, not disabled — refinement links out to `/events?category=…&city=…`                                      |
| `/categories/[category]`                               | 02 Discovery                          | Category eyebrow as the page title from `displayNameFr`; the category filter chip is fixed and not removable                                                                                                                                                                                                                      |
| `/register`                                            | 10 Login                              | Three extra fields; the post-submit blocking screen « Vérifiez votre boîte mail »                                                                                                                                                                                                                                                 |
| `/verify-email`, `/forgot-password`, `/reset-password` | 10 Login                              | Single-purpose form shells; each has a token-invalid state                                                                                                                                                                                                                                                                        |
| `/unsubscribe/[token]/[category]`                      | 10 Login                              | No form — a single confirmation panel. ⚠ The endpoint is a **side-effecting GET**, so the frame **must** carry an explicit « Confirmer la désinscription » press and must never fire on page load; the link is `prefetch={false}` and `nofollow` so a mail scanner cannot unsubscribe the user silently                          |
| `/legal/*`                                             | —                                     | Static prose. A single measure-capped text column; no frame required beyond the shared page shell                                                                                                                                                                                                                                 |
| `/orders`                                              | 08 My tickets                         | Rows are orders, not passes; each row carries `status` as a word and the `total`. ⚠ `GET /orders` accepts **only `page` and `limit`** under `forbidNonWhitelisted`, so `?status=PAID` is a 400 — status tabs filter the loaded pages and must say so                                                                             |
| `/notifications`                                       | 08 My tickets                         | Rows are `GET /notifications/me` items — a **delivery log, not an inbox**: `channel` (EMAIL \| SMS), `status` and `sentAt` as words. ⚠ `NotificationDto` has **no read state**, so no unread dot, badge or « marquer comme lu » may be drawn                                                                                     |
| `/profile`, `/settings`                                | 10 Login                              | Stacked form sections; `/settings` adds a destructive `DELETE /users/me` block, isolated at the bottom behind confirmation                                                                                                                                                                                                        |
| `/organizer/events`                                    | 02 Discovery                          | Status tabs (Brouillons · Publiés · Annulés · Terminés) driven by the `status` query on `GET /events/organizer/:organizerId`; per-row publish/edit/delete. ⚠ `status` is applied **after** the page is fetched and overwrites `total`, so a filtered tab draws **no count and no pager**                                         |
| `/organizer/events/[id]`                               | 03 Event detail                       | The participant event page **plus** a persistent « Brouillon — invisible par le public » bar; the sticky bar's action becomes _Publier_. ⚠ `GET /events/:id` is `@Public()` and ignores the bearer token, so a `DRAFT` is a 403 **even for its owner** — until that is fixed the frame can only be built for a `PUBLISHED` event |
| `/organizer/events/[id]/edit`                          | 12 Create event                       | Same step structure, pre-filled; adds the unsaved-changes guard, publish confirmation and delete confirmation                                                                                                                                                                                                                     |
| `/organizer/events/[id]/ticket-types`                  | 12 Create event, step 3               | Extracted as a standalone page; tiers read from `GET /events/:id` → `ticketTypes[]`, as there is no list endpoint. Deletion is refused unless the event is `DRAFT` **and** `soldQuantity === 0` (`event.entity.ts:535,548`), so the delete control is hidden on a published event, not disabled                                   |
| `/organizer/events/[id]/participants`                  | 13 Event analytics                    | Check-in progress + per-type breakdown only — ⚠ **no endpoint lists an event's ticket holders**, so no roster table may be drawn                                                                                                                                                                                                 |
| `/admin`, `/admin/reports`                             | 11 Organizer dashboard / 13 Analytics | Same stat and chart blocks, denser; `lastUpdated` drawn verbatim                                                                                                                                                                                                                                                                  |
| `/admin/moderation`                                    | 02 Discovery                          | Event rows add a commission drawer: global rate, optional override, effective rate, 50 DT buyer-price preview, save and « Utiliser le taux global ». Takedown remains unavailable and separately explained                                                                                                                        |
| `/admin/users`                                         | 08 My tickets                         | Desktop-first 40 px data table; on mobile it degrades to stacked cards, never a horizontally scrolling table                                                                                                                                                                                                                      |

### 2.3 The frame map of the money path

The money path the whole product depends on, and the exact transition between each screen:

```mermaid
flowchart TD
  A["02 Discovery<br/><code>/events</code>"] --> B["03 Event detail<br/><code>/events/[id]</code>"]
  B -->|"sticky bar · tap 1"| C["04 Ticket sheet<br/>tier + qty + holder"]
  C -->|"« Continuer » · logged out"| L["10 Login<br/><code>/login?next=…</code>"]
  L -->|"returns to the sheet, selection intact"| C
  C -->|"POST /orders<br/>creates order AND holds tickets"| D["05 Checkout<br/><code>/checkout/[orderId]</code>"]
  D -->|"POST /orders/:id/pay<br/>paymentUrl → redirect"| E["06 Payment return<br/><code>/checkout/[orderId]/retour</code>"]
  D -->|"clientSecret → in-page"| E
  E -->|"poll GET /orders/:id → PAID"| F["07 Confirmation<br/><code>/orders/[id]</code>"]
  E -->|"FAILED"| G["06 state <code>failed</code><br/>recovery via another provider"]
  E -->|"PROCESSING past the ~60 s ceiling"| H["06 state <code>ceiling-reached</code><br/>never an error, never a retry"]
  F --> I["08 My tickets → 09 Ticket + QR"]
  C -.->|"400 INSUFFICIENT_AVAILABILITY"| J["04 state <code>sold-out-conflict</code>"]
  D -.->|"countdown hits 0 · 400 ORDER_EXPIRED"| K["05 state <code>expired</code>"]
```

> **The single most important structural fact in this diagram:** there is **no `POST /tickets/reserve`
> step**. `POST /orders` creates the order _and_ reserves the tickets internally
> (`create-order.handler.ts`, step 5). A frame that draws a separate « réservation » step would produce
> an orphaned second hold. `POST /tickets/reserve` and `POST /tickets/confirm` exist but belong to
> the Payments module's internal path, not to any participant screen.

---

## 3. The wireframes

Fourteen archetypes. [§3.1](#31-landing--)–[§3.2](#32-discovery--events) carry the header, the
62-column frame, a **Layout intent** paragraph and a **Notes** table resolving their `@@n` callouts;
§3.3–§3.7 carry the header, the 38-column frame and a **What this must prove** table. Every archetype
ends with **States to draw** — the frames the designer owes before it can be signed off. The
remaining seven are specified in [§3.8](#38-remaining-archetypes--compact-specs).

---

### 3.1 Landing — `/`

```text
ROUTE    /                                         RENDER  SSR · ISR 60
DATA     GET /events/upcoming?city&limit=8         -> A L'AFFICHE
         GET /events?city&dateFrom&dateTo&limit=8  -> CE WEEK-END
         GET /events?sortBy=soldTickets&sortOrder=DESC&limit=8
         GET /events?sortBy=publishedAt&sortOrder=DESC&limit=8
         NB  /events/upcoming takes only city, country, page, limit
PROVES   A user with no query and no account leaves this screen with
         something to tap, using one thumb, above the fold.

┌## 390 x 844 ##┐
│ [=]   T I C K R @R [?]   < Se connecter > @@1
├##┤
│  [pin] Tunis ▾   Ce soir | Ce week-end | Cette semaine  -> @@2
├##┤
│  À L'AFFICHE
│ ┌────────────────────────────────────────────────────────┐
│ │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ POSTER 3:2 · imageUrl ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│
│ │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│
│ │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│
│ ├────────────────────────────────────────────────────────┤
│ │ CONCERT                                                │
│ │ Nuit Jazz à la Médina                                  │
│ │ ven. 12 sept. · 21:00 · Le Rio, Tunis                  │
│ │ À partir de 50 DT              Plus que 7 places       │ @@3
│ └────────────────────────────────────────────────────────┘
│ @C ● ○ ○ ○
├##┤
│  CATÉGORIES @R < Tout voir >
│  ( Concert ) ( Conférence ) ( Sport ) ( Théâtre ) ( Fes-> @@4
├##┤
│  CE WEEK-END À TUNIS @R < Tout voir >
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────
│ │▒▒▒ 3:2 ▒▒▒▒▒▒│ │▒▒▒ 3:2 ▒▒▒▒▒▒│ │▒▒▒ 3:2 ▒▒▒▒▒▒
│ ├──────────────┤ ├──────────────┤ ├──────────────
│ │ sam. 13 · 20h│ │ sam. 13 · 22h│ │ dim. 14 · 18h
│ │ Stand-up Club│ │ Techno Rooft…│ │ TUN - ALG
│ │ Sfax         │ │ Tunis        │ │ Radès
│ │ 25 DT COMPLET│ │ 40 DT        │ │ 15 DT
│ └──────────────┘ └──────────────┘ └──────────────
├## FOLD (844 px) ##┤
│  NOUVEAUTÉS @R < Tout voir >
│  ···  même gabarit de carte  ···
├##┤
│  À propos · Organisateurs · CGU · Confidentialité
│  Remboursement · Contact
├##┤
│  Découvrir  |  Recherche  |  Mes billets  |  Compte @@5
└##┘
```

**Layout intent.** Discovery is the product, not a search box
([Phase 1 §A.3](02-product-design-brief.md#a3-six-positioning-commitments)). The header carries a
_secondary_ search affordance; the primary affordances are the city scope, the date-window chips and
the rails. City is chosen once and scopes everything below it — the Fever move from
[Phase 1 §J](02-product-design-brief.md#j-competitive-inspiration) — and is persisted, so a returning
user lands already scoped. Nothing above the fold requires an account, and the only account control
is a ghost link in the header.

Every rail has a « Tout voir » link to a real filtered `/events` URL. A horizontal rail is not
accessible navigation on its own; the link is what makes the rail's content reachable by keyboard and
by a crawler.

| #   | Note                                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Header is a **three-state** shell: `unknown` → `logged-out` → `logged-in`. The `unknown` state renders neutral chrome so a returning user never sees « Se connecter » flash before their name (Phase 4 §1.2) |
| 2   | Each chip is a `dateFrom`/`dateTo` pair — no new backend capability. The chip is labelled with its **value**, never the field name                                                                           |
| 3   | Price and scarcity come from `EventListDto.ticketSummary` — `minPrice`, `totalAvailable`, `hasAvailableTickets`, `isSoldOut`. **No per-card follow-up request**, which is what makes this grid viable on 3G  |
| 4   | Ten categories from `EventCategory`, labelled with `displayNameFr` from the backend metadata so the label can never drift from the enum. Icons are decided in Phase 7 §9, not here                           |
| 5   | Four tabs, never five (Phase 1 §I.3). The bar is present logged in **and** logged out — « Mes billets » simply routes through `/login?next=/tickets`                                                         |

**States to draw:** `default` · `loading` (rail skeletons at the real card aspect ratio, zero CLS) ·
`empty-city` (« Rien de prévu à Sfax cette semaine » + « Voir tous les événements ») · `offline`
(persistent banner under the header) · `logged-in` (header delta only).

---

### 3.2 Discovery — `/events`

```text
ROUTE    /events                                   RENDER  SSR (no-store)
DATA     GET /events?category&city&country&dateFrom&dateTo
                     &minPrice&maxPrice&page&limit&sortBy&sortOrder
         -> { data, total, page, limit, totalPages,
              hasNextPage, hasPreviousPage }      (FLAT, not meta{})
         NB  there is no ?q here - forbidNonWhitelisted rejects it
             with a 400 (main.ts:31). Text search is /search.
PROVES   Four comparison axes - quand, où, combien, disponible -
         are legible on every card without a tap, at 360 px.

┌## 390 x 844 ##┐
│ <  Événements @R [?]
├##┤
│  ( Tunis ▾ ) ( Ce week-end ▾ ) ( Jusqu'à 50 DT ▾ ) ( Fil-> @@1
├##┤
│  24 événements @R Trier : Date ▾ @@2
├##┤
│ ┌────────────────────────────────────────────────────────┐
│ │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ POSTER 3:2 · imageUrl ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│
│ │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│
│ ├────────────────────────────────────────────────────────┤
│ │ CONCERT                        ven. 12 sept. · 21:00   │
│ │ Nuit Jazz à la Médina                                  │
│ │ Le Rio · Tunis                                         │
│ │ À partir de 50 DT              Plus que 7 places       │ @@3
│ └────────────────────────────────────────────────────────┘
│ ┌────────────────────────────────────────────────────────┐
│ │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ POSTER 3:2 ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│
│ ├────────────────────────────────────────────────────────┤
│ │ THÉÂTRE                        sam. 13 sept. · 19:30   │
│ │ Le Malade imaginaire                                   │
│ │ Théâtre municipal · Sfax                               │
│ │ 25 DT                          COMPLET                 │ @@4
│ └────────────────────────────────────────────────────────┘
├## FOLD (844 px) ##┤
│ ┌────────────────────────────────────────────────────────┐
│ │  ···  18 cartes de plus, même gabarit  ···             │
│ └────────────────────────────────────────────────────────┘
│ @C [ Charger plus - 20 sur 24 ]
│ @C {hasNextPage === false -> le bouton disparaît}  @@5
└##┘

                    --- FILTRES (feuille plein écran) ---

┌## sheet 390 x 844 ##┐
│ @C ═════
│  Filtres @R x
├##┤
│  VILLE
│  ( Tunis ) ( Sousse ) ( Sfax ) ( Hammamet ) ( Nabeul ) ->
│  CATÉGORIE
│  ( Concert ) ( Conférence ) ( Sport ) ( Théâtre ) ->
│  DATES
│  ( Du .............. )        ( Au .............. )
│  PRIX MAXIMUM
│  0 DT ────────────────●──────────────── 200 DT
│  Jusqu'à 50 DT
├##┤
│  < Tout effacer >
╔==╗
║ @C [[ Voir 24 événements ]] @@6
╚==╝
```

**Layout intent.** One column on mobile, two at `sm`, three to four at `lg` capped at 1280 px. The
whole card is **one link and one tab stop** — never a card with a nested « Réserver » button, which
would triple the tab stops in a 20-card grid. Filter state lives in the URL, so every filtered view
is a shareable, back-button-correct link; that is what makes WhatsApp forwarding work in Tickr's
favour.

Card content order is fixed and identical everywhere the card appears: poster → category → date/time
→ title → venue · city → price + availability. The price is the **face price** matching the poster
the organizer printed, not an all-in figure; the event's effective service fee appears when a quantity
exists ([§0.3](#03-contract-corrections-this-phase-inherits)).

| #   | Note                                                                                                                                                                    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Chips are labelled with their **applied value**, never the field name. « Filtres · 3 » counts the active ones. Chips scroll horizontally; the sheet is the complete set |
| 2   | `total` from the flat envelope. Sort options map to real `sortBy` values only — `startDate`, `soldTickets`, `publishedAt`, `title`, `totalCapacity`                     |
| 3   | Scarcity sentence from `ticketSummary.totalAvailable`; the threshold rule is in Phase 1 §E.2. **Never animated** — the number can legitimately go back up               |
| 4   | A sold-out card **stays in the grid**. Hiding it hides the information that the cheap tier existed and went                                                             |
| 5   | « Charger plus » is a real button, not scroll-only. Infinite scroll may _supplement_ it; it may never replace it                                                        |
| 6   | The apply button carries the live result count. On mobile the sheet is full-height; at `md` it becomes a centred modal                                                  |

**States to draw:** `default` · `loading` (6 card skeletons) · `empty-filtered` (echo the actual
filters, « Effacer les filtres ») · `empty-unfiltered` · `error` (« Connexion perdue » + « Réessayer »)
· `filters-sheet` · `offline`.

---

### 3.3 Event detail — `/events/[id]`

```
ROUTE    /events/[id]                              RENDER  SSR (dynamic, never ISR)
DATA     GET /events/:id -> ticketTypes[] carrying availableQuantity,
         isSoldOut, isOnSale. No organizer-profile endpoint exists.
PROVES   A buyer settles quand, où, combien and disponible before
         the prose, and the sticky bar never leaves the thumb.

┌──────────────────────────────────────┐ 390
│ ←                              ⤴ ♡?  │  back + share on a scrim (no ♡ in V1)
│                                      │
│         [ POSTER  4:5 ]              │  organizer artwork, uncropped
│                                      │
│  ┌────────┐                          │
│  │ VEN 12 │  ← date chip over poster │  readable before the title
│  └────────┘                          │
├──────────────────────────────────────┤
│ CONCERT                              │  overline, category displayNameFr
│ Nuit Jazz à Sidi Bou Saïd            │  display-xl
├──────────────────────────────────────┤
│ [cal] Vendredi 12 septembre, 21:00   │  FACTS FIRST — before any prose
│ [pin] Villa Sebastian, Hammamet      │
│    → Itinéraire                      │  only if lat/lng present
├──────────────────────────────────────┤
│ À partir de 50 DT                    │
│ + 6 % de frais de service            │  preview — effective API rate (§0.3)
├──────────────────────────────────────┤
│ BILLETS                              │
│ ┌──────────────────────────────────┐ │
│ │ Standard              50 DT      │ │
│ │ Accès général                    │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ VIP                  120 DT      │ │
│ │ Plus que 4 places                │ │  exact number, sun-400
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ Early bird           COMPLET     │ │  stays visible, disabled + labelled
│ │        < Vérifier à nouveau >    │ │  sold out is NOT terminal
│ └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│ À PROPOS                             │
│ Trois sets sous les ét… Lire la suite│  clamped
├──────────────────────────────────────┤
│ ORGANISATEUR                         │
│ Karim B.                             │  NAME ONLY — no profile link (role-guarded)
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │ dès 50 DT  │ Choisir mes billets │ │  STICKY, safe-area aware
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

| #   | What this must prove                                                                                                                                                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Decision-critical facts sit above the fold; prose is below. A user decides on _when · where · how much · still available_                                                                                                                                           |
| 2   | Every tier states its availability in words **and** numbers — never a bare disabled control                                                                                                                                                                         |
| 3   | The sold-out tier stays in the list with a re-check control. `soldQuantity` moves at **hold** time and is restored on expiry or cancellation, so availability is a per-fetch snapshot that can go back **up** — sold out is never terminal                          |
| 4   | The organizer block is a name with **no link**. `GET /events/organizer/:organizerId` is `@Roles('ORGANIZER','ADMIN')` **and** rejects any `organizerId` that is not the caller's (`events.controller.ts:405-407`, `:426`), so no public organizer profile can exist |
| 5   | The sticky bar is the product's most important control and never scrolls away                                                                                                                                                                                       |

**States to draw:** `default` · `loading` · `cancelled` (danger banner above poster, bar replaced by text,
imagery desaturated) · `completed` · `sold-out-entirely` · `error` · `404`.

---

### 3.4 Ticket selection sheet — over `/events/[id]`

```
ROUTE    sheet over /events/[id]                   RENDER  client state
DATA     ticketTypes[] already loaded by 3.3. On « Continuer » ->
         POST /orders { eventId, items[{ ticketTypeId, quantity,
         holders[{ name, email }] }] }  - this call also HOLDS.
PROVES   The complete arithmetic exists the instant a quantity does,
         and the total is the label of the button that commits it.

┌──────────────────────────────────────┐
│              ▁▁▁▁▁                   │  drag handle
│ Standard · 50 DT                  x  │
├──────────────────────────────────────┤
│ Combien de billets ?                 │
│                                      │
│           < - >  2  < + >            │  44px targets, tabular-nums
│                                      │
│ Maximum 10 billets par événement     │  the BINDING limit is named
├──────────────────────────────────────┤
│ 2 × Standard             100,000 DT  │  ← breakdown appears at qty ≥ 1
│ Frais de service (6 %)     6,000 DT  │     default-rate preview from API
│ ─────────────────────────────────    │
│ Total à payer            106,000 DT  │  heaviest number on screen
├──────────────────────────────────────┤
│ [x] Les billets sont à mon nom       │  DEFAULT CHECKED — biggest friction win
│                                      │
│ { décoché → nom/e-mail par billet }  │
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │   Continuer · 106,000 DT         │ │  TOTAL IN THE BUTTON LABEL
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

| #   | What this must prove                                                                                                                                                                                                                                                          |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The complete arithmetic appears the instant a quantity exists — never at the payment step                                                                                                                                                                                     |
| 2   | The total is in the button label, so the thumb never leaves the commitment                                                                                                                                                                                                    |
| 3   | « Les billets sont à mon nom » is checked by default; most purchases are 1–2 tickets, and unchecking reveals one `{ name, email }` pair per ticket                                                                                                                            |
| 4   | The stepper names _which_ limit is binding: the tier's `availableQuantity`, or the **10 tickets per event per user** cap (`TICKET_LIMIT_EXCEEDED` → 400). The third limit — **5 orders per hour** (`RATE_LIMITED` → 403) — is not a stepper bound and surfaces only on submit |
| 5   | Logged-out users reach this screen and see the price. Auth is requested on **Continuer**, and the selection survives it                                                                                                                                                       |
| 6   | A 3 % event-override variant shows 3,000 DT fees and 103,000 DT total for the same subtotal                                                                                                                                                                                   |

**States to draw:** `default` · `qty-selected` · `limit-reached` — one frame per binding limit
(`availableQuantity` · 10 billets par événement · the 403 « 5 commandes par heure » on submit) ·
`submitting` · `sold-out-conflict` (quantity auto-adjusts to what is available) · `auth-required` ·
`error`.

---

### 3.5 Checkout — `/checkout/[orderId]`

```
ROUTE    /checkout/[orderId]                       RENDER  CSR
DATA     GET /orders/:id -> subtotal, platformFee, paymentFees,
         total, expiresAt
         POST /orders/:id/pay { paymentMethod, idempotencyKey? }
              -> { id, paymentUrl?, clientSecret?, status }
PROVES   The only decisions left are provider and pay, with the
         hold visibly running out in both time forms.

┌──────────────────────────────────────┐
│              TICKR                   │  wordmark ONLY — no nav, no exits
├──────────────────────────────────────┤
│ Il reste 12:34                       │  relative …
│ Vos billets sont gardés jusqu'à 21:45│  … AND absolute (survives redirect)
├──────────────────────────────────────┤
│ Nuit Jazz à Sidi Bou Saïd            │
│ Vendredi 12 septembre, 21:00         │
├──────────────────────────────────────┤
│ 2 × Standard             100,000 DT  │
│ Frais de service (6 %)     6,000 DT  │
│ {Frais de paiement          0,000 DT}│  CONDITIONAL — only when > 0
│ ─────────────────────────────────    │
│ Total à payer            106,000 DT  │
├──────────────────────────────────────┤
│ MOYEN DE PAIEMENT                    │
│ ┌──────────────────────────────────┐ │
│ │ (o) Konnect                      │ │  LOCAL FIRST
│ │   Carte bancaire tunisienne      │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ ( ) Paymee                       │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ ( ) Stripe · Carte internationale│ │
│ └──────────────────────────────────┘ │
│                                      │
│   Vous allez être redirigé vers      │  announced BEFORE it happens
│   Konnect. Vous reviendrez           │
│   automatiquement.                   │
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │      Payer 106,000 DT            │ │  loading state mandatory
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

| #   | What this must prove                                                                                                                                                                                                                               |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The chrome is **stripped** — one wordmark, no navigation, nothing offering an exit mid-payment                                                                                                                                                     |
| 2   | The countdown is stated in both forms, because only the absolute one survives the gateway round trip                                                                                                                                               |
| 3   | `paymentFees` is `0` for every gateway today, so its row is drawn **conditionally**. It is a reserved buyer surcharge, not an estimate of Tickr's processor cost; any future non-zero value requires approved policy and disclosure before payment |
| 4   | Three named providers as radio cards, local first — never a dropdown                                                                                                                                                                               |
| 5   | The redirect is announced before it occurs                                                                                                                                                                                                         |

**States to draw:** `default` · `provider-selected` · `submitting` (button locked, idempotency key held) ·
`expired` · `payment-failed` · `rate-limited (403)` · `error`.

---

### 3.6 Payment return — `/checkout/[orderId]/retour`

```
ROUTE    /checkout/[orderId]/retour                RENDER  CSR + polling
DATA     GET /orders/:id polled with back-off to a ~60 s ceiling.
         The gateway return parameters are NEVER read as an outcome.
PROVES   A screen whose truth has not arrived yet can wait honestly
         without ever offering a retry.

┌──────────────────────────────────────┐
│              TICKR                   │
├──────────────────────────────────────┤
│                                      │
│    { indicateur de progression }     │  calm indicator, not a bare spinner
│                                      │
│   Nous confirmons votre paiement…    │
│   Ne fermez pas cette page.          │  waiting is EXPECTED, and said so
│                                      │
│   Référence : 3f2a…2210              │  short form of order.id
│                                      │
│ Il reste 9:02                        │  countdown keeps running
│                                      │
└──────────────────────────────────────┘

  past the ~60 s ceiling ─────────────▶

┌──────────────────────────────────────┐
│ Votre paiement est en cours de       │  NOT an error. NOT a retry.
│ vérification.                        │
│ Vous recevrez un e-mail dès          │  « e-mail » — never « notification »
│ confirmation.                        │
│ Référence : 3f2a…2210                │
│ ┌──────────────────────────────────┐ │
│ │      Voir mes commandes          │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

| #   | What this must prove                                                                                                                                                                                        |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The outcome is **never** inferred from URL parameters — the screen polls `GET /orders/:id`                                                                                                                  |
| 2   | A prolonged `PROCESSING` is presented as verification in progress, never as failure                                                                                                                         |
| 3   | **No retry exists while the status is `PENDING`/`PROCESSING`** — a retry there is how double payments happen. A fresh attempt is offered only after a terminal `FAILED`, and then with a different provider |
| 4   | The reference is visible in every state, so a user can always quote it. ⚠ `OrderDto` has **no `orderNumber`** — the reference is a short form of the `id` UUID and must be selectable                      |

**States to draw:** `polling` · `paid` → success · `failed` → recovery with a different provider ·
`ceiling-reached` (above) · `expired`.

---

### 3.7 Ticket — `/tickets/[id]`

```
ROUTE    /tickets/[id]                             RENDER  CSR + offline cache
DATA     GET /tickets/:id -> qrCode, a plain "v1-{uuid}-{checksum}"
         string rendered locally (ticket.dto.ts:33, qr-code.vo.ts)
         GET /tickets/:id/pdf -> 302 to a signed S3 URL, owner only
PROVES   The pass is a physical object at a dark door with no signal.

┌──────────────────────────────────────┐
│ ←  Mon billet                        │  dark ink-950 surface
├──────────────────────────────────────┤
│  Nuit Jazz à Sidi Bou Saïd           │
│  Ven 12 sept · 21:00                 │
│  Villa Sebastian, Hammamet           │
│ ╌╌╌╌╌╌╌╌╌╌╌◜◝╌╌╌╌╌╌╌◜◝╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌│  perforation notch
│                                      │
│      ┌────────────────────┐          │
│      │                    │          │
│      │    [ QR ≥ 240px ]  │          │  WHITE bg + quiet zone on dark
│      │                    │          │  rendered client-side → works offline
│      └────────────────────┘          │
│                                      │
│           Yasmine B.                 │  holder name — the door needs it
│             1 sur 2                  │
│                                      │
│      < Augmenter la luminosité >     │
│      < Télécharger le PDF >          │  backup path — 404 until the PDF exists
└──────────────────────────────────────┘
```

| #   | What this must prove                                                                                                                               |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The QR is the largest element and is reachable in **one tap** from the home surface                                                                |
| 2   | The QR is rendered locally from the cached `qrCode` string with **no network** — venue basements have no signal, and no image endpoint is involved |
| 3   | `CHECKED_IN` visually _spends_ the ticket: dimmed QR, stamp, timestamp — the door must not be able to reuse it by accident                         |
| 4   | The holder name is prominent, because multi-ticket orders need per-pass identification                                                             |

**States to draw:** `confirmed` · `checked-in` · `expired` · `cancelled` · `event-cancelled` · `offline` · `loading`.

`TicketDto.qrCode` is a plain `v1-{uuid}-{checksum}` string (`ticket.dto.ts:33`, `qr-code.vo.ts`)
that the client renders itself, so the pass works offline exactly as drawn — the QR is **not** a
blocker for P0. What is still open is the **cache policy**: the string is stable for the ticket's
life except across a transfer, which mints a new one (`ticket.entity.ts:461`), so a successful
`POST /tickets/:id/transfer` must invalidate the persisted pass
([Phase 4 §7.9](05-screen-inventory.md#7-other-contract-gaps-that-shape-screens)).

---

### 3.8 Remaining archetypes — compact specs

The seven below follow the same conventions; they are specified rather than drawn because their
layouts are conventional and carry no money risk. The Figma frames are still required.

| Archetype               | Route                              | Layout intent                         | Must prove                                                                                                                                                                                                                                                                                                                                                |
| ----------------------- | ---------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Order confirmation**  | `/orders/[id]`                     | Success moment, but informational     | `total` paid, the reference, the event, « e-mail en route », one dominant CTA « Voir mes billets ». The refund rule — remboursement = `subtotal` + `paymentFees`, **la commission n'est pas remboursée** — is stated here, before it matters                                                                                                              |
| **My tickets**          | `/tickets`                         | Vertical list of `TicketCard`         | Today's event promoted to the top; `status` unmistakable per row. ⚠ `GET /tickets` **accepts `?status` and silently ignores it** — the handler calls `findByUserId(userId, page, limit)` only (`get-user-tickets.handler.ts:32-36`), so upcoming/past tabs filter the **loaded pages** and must say so                                                   |
| **Login**               | `/login`, `/register`              | Centred card, no nav                  | Returns to `?next=` exactly; never blocks a price view. ⚠ A `403` on `POST /auth/login` means the e-mail is unverified and nothing else (`auth.controller.ts:188`); a deactivated account is a `401` indistinguishable from bad credentials (`local.strategy.ts:73`). **No resend-verification endpoint exists**, so the 403 has no recovery to draw yet |
| **Organizer dashboard** | `/organizer`                       | 3 KPI tiles + event list              | `totalRevenue` labelled **« Ventes de billets brutes · avant remboursements et ajustements »**; net/payable earnings unavailable                                                                                                                                                                                                                          |
| **Create event**        | `/organizer/events/new`            | Poster → title → date → venue → tiers | Live participant-price arithmetic as the price is typed; DRAFT vs PUBLISHED unmistakable                                                                                                                                                                                                                                                                  |
| **Event analytics**     | `/organizer/events/[id]/analytics` | Stat row + sales timeline             | Empty state is a _first-run_, not an error; `lastUpdated` rendered verbatim; gross ticket sales clearly distinguished from unavailable net/payable earnings                                                                                                                                                                                               |
| **Scanner**             | `/check-in`                        | Full-bleed camera, huge targets       | Select from `GET /events/check-in-access/me`; valid/invalid unambiguous in the dark and one-handed; duplicate differs from invalid. `POST /tickets/check-in` requires `eventId`, `qrCode`, `deviceId`, and `locationGate`; revoked access returns to event selection                                                                                      |

---

## 4. Tracking

One row per archetype, numbered exactly as in [§2.1](#21-the-fourteen-archetypes) — that number is
the `<NN>` in the Figma frame name.

| #   | Archetype              | ASCII spec | Figma frame | Reviewed |
| --- | ---------------------- | ---------- | ----------- | -------- |
| 01  | Landing                | ✅ §3.1    | ☐           | ☐        |
| 02  | Discovery              | ✅ §3.2    | ☐           | ☐        |
| 03  | Event detail           | ✅ §3.3    | ☐           | ☐        |
| 04  | Ticket selection sheet | ✅ §3.4    | ☐           | ☐        |
| 05  | Checkout               | ✅ §3.5    | ☐           | ☐        |
| 06  | Payment return         | ✅ §3.6    | ☐           | ☐        |
| 07  | Order confirmation     | ✅ §3.8    | ☐           | ☐        |
| 08  | My tickets             | ✅ §3.8    | ☐           | ☐        |
| 09  | Ticket + QR            | ✅ §3.7    | ☐           | ☐        |
| 10  | Login                  | ✅ §3.8    | ☐           | ☐        |
| 11  | Organizer dashboard    | ✅ §3.8    | ☐           | ☐        |
| 12  | Create event           | ✅ §3.8    | ☐           | ☐        |
| 13  | Event analytics        | ✅ §3.8    | ☐           | ☐        |
| 14  | Scanner                | ✅ §3.8    | ☐           | ☐        |

**Figma file:** _link here once created._

---

## 5. Review protocol

1. Wireframes are reviewed **against the five UX principles** in
   [Phase 1 §E](02-product-design-brief.md#e-ux-principles), not against taste.
2. Every frame must show its **states**, not just the happy path. A frame set without an error state
   is rejected.
3. Money-path frames (§3.3–§3.7) require a second reviewer.
4. Reviewers check the [§1.6](#16-what-makes-a-wireframe-rejectable) rejection list before approving.

---

## Acceptance Criteria

- [x] Wireframe conventions defined (mobile-first 390 px, B/W, notation, frame naming)
- [x] The fourteen archetypes identified, with how the remaining routes inherit from them
- [x] Money-path screens drawn in full, with what each must prove and its state list
- [x] Remaining archetypes specified with layout intent and proof obligations
- [x] Review protocol and rejection criteria defined
- [ ] **Figma frames produced for all 14 archetypes** — external deliverable
- [ ] **Every Phase 4 screen mapped to a frame** — after Figma
- [ ] **Reviewed for UX/navigation correctness** — after Figma

---

**Next:** [Phases 9–10 — Hi-Fi, Responsive & Prototype](10-hifi-and-responsive.md).
