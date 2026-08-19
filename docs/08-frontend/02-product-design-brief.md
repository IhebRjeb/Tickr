# Tickr — Product Design Brief & Design Direction

**Phase:** 1 — Design Discovery
**Status:** Proposed / awaiting sign-off
**Date:** August 2026
**Applies to:** `frontend/` (Next.js 16 · React 19 · TypeScript 5 strict · TailwindCSS 4)
**Backend contract:** `https://api.tickr.tn/api` — V1 MVP, source of truth
**Supersedes:** the placeholder styling in `frontend/src/app/page.tsx` and `frontend/src/app/globals.css`

---

## Contents

| | Section | What it fixes |
|---|---|---|
| **A** | [Product positioning](#a-product-positioning) | The market gap and six positioning commitments |
| **B** | [Target users](#b-target-users) | Participant, organizer, admin — and the 70/25/5 design weighting |
| **C** | [Brand personality](#c-brand-personality) | Seven attributes made operational, voice, and anti-patterns |
| **D** | [Visual direction](#d-visual-direction) | Colour, type, shape, imagery, spacing — all contrast-validated |
| **E** | [UX principles](#e-ux-principles) | Five testable rules every screen must pass |
| **F** | [Core purchase experience](#f-core-purchase-experience) | Discovery → ticket → payment → QR, step by step |
| **G** | [Error and edge-case UX](#g-error-and-edge-case-ux) | Three failure shapes, the full status mapping, five money-critical states |
| **H** | [Accessibility](#h-accessibility) | WCAG 2.1 AA as concrete build obligations |
| **I** | [Responsive strategy](#i-responsive-strategy) | Mobile as the design target, not the fallback |
| **J** | [Competitive inspiration](#j-competitive-inspiration) | Meetup · Fever · Eventbrite · DICE · Shotgun — one takeaway each |
| **K** | [Design system foundations](#k-design-system-foundations) | The Tailwind 4 token set |
| **L** | [Open contract questions](#l-open-contract-questions-for-the-backend) | Eight gaps found while grounding this brief |
| **M** | [**Design Decisions Locked For Next Phase**](#m-design-decisions-locked-for-next-phase) | **What Phase 2 can safely build on** |
| **N** | [Appendix — source references](#n-appendix--source-references) | Every backend claim, traced to a file |

---

## 0. How to read this document

This is **not** an implementation plan and it does not describe every screen. It fixes the
**product direction, visual language and UX rules** that every future Tickr screen must obey, so
that Phase 2 (Information Architecture) and Phase 3 (Screen Design) can proceed without
re-litigating colour, tone, checkout behaviour or error handling.

Everything in this document is constrained by what the backend actually exposes. Where a common
ticketing pattern is **not** buildable on the V1 API, it is listed explicitly as a non-goal rather
than quietly designed in. Where the current API contract is ambiguous for the UI, it is flagged in
[§L Open contract questions](#l-open-contract-questions-for-the-backend) instead of being invented.

**Backend facts this document is built on** (verified against source, not assumed):

| Fact | Value | Source |
|---|---|---|
| Reservation hold | **15 minutes** | `reserve-tickets.handler.ts:24` (`RESERVATION_TTL_MINUTES = 15`) |
| Order expiry | **15 minutes**, configurable | `create-order.handler.ts:42` (`ORDER_EXPIRATION_MINUTES`) |
| Platform commission | **6 %**, configurable, **added on top** of the ticket price | `create-order.handler.ts:41` (`PLATFORM_COMMISSION_RATE=0.06`); `order.entity.ts:192` (`total = subtotal + subtotal × rate`) |
| Currency | **TND**, symbol `DT`, **3 decimals** (millimes) | `shared/domain/value-objects/currency.vo.ts` |
| Payment providers | `STRIPE` · `KONNECT` · `PAYMEE` | `payment-method.vo.ts` |
| Payment hand-off | `paymentUrl` (redirect) **or** `clientSecret` (Stripe, in-page) | `payment-provider.types.ts` |
| Purchase limits | **5 orders/hour/user**, **10 tickets/event/user** | `fraud-detection.service.ts:36-43` |
| Reservation size | **1–10 holders** per reservation call | `reserve-tickets.dto.ts` (`@ArrayMaxSize(10)`) |
| Refund rule | Refund = subtotal + payment fees — **commission is non-refundable** | `request-refund.handler.ts:56` |
| Notification channels | **EMAIL and SMS only** (`PUSH` exists in the enum but is unsupported) | `notification-channel.vo.ts` |
| Roles | `PARTICIPANT` · `ORGANIZER` · `ADMIN` | `user-role.vo.ts` |

---

## A. Product positioning

### A.1 The one-sentence position

> **Tickr is the fastest, clearest way to find something to do in Tunisia tonight — and to hold
> the ticket in your hand ninety seconds later, paid in dinars, with nothing hidden.**

### A.2 The market gap Tickr is entering

Event ticketing in Tunisia today is fragmented across Facebook event pages, WhatsApp numbers,
physical box offices, and a small number of local platforms. The result for a would-be attendee is
a familiar sequence of friction: *find a poster on social media → screenshot it → message a number
→ negotiate a transfer or drive somewhere with cash → hope the ticket is real.*

Tickr's opportunity is **not** to have more events than anyone else on day one. It is to be the
place where the last three steps of that sequence collapse into one screen. Everything in this
design direction serves that collapse.

### A.3 Six positioning commitments

Each commitment is stated as a design obligation, not an aspiration.

**1. Discovery is the product, not a search box.**
The home screen is a curated, browsable surface of event imagery — not an empty search field
waiting for a query the user cannot phrase. The backend supports filtering on `q`, `category`,
`city`, `country`, `dateFrom`, `dateTo`, `minPrice`, `maxPrice`. Those become *visible, tappable
lenses* (category rails, city chips, a date scrubber, a price ceiling) rather than a hidden
"advanced filters" panel. A user who does not know what they want must still be able to leave the
home screen with something to click.

**2. Simplicity is measured, not claimed.**
The target: **poster to paid in under 90 seconds** for a returning, logged-in user, and **under
three minutes** for a first-timer including registration. Any proposed screen that adds a step to
the purchase path must remove one elsewhere or be rejected.

**3. Trust is engineered into the pixels, because it cannot be assumed.**
A large share of the Tunisian market has never completed an online card payment. The interface
must therefore over-communicate at exactly the moments where a first-time online payer hesitates:
before choosing a provider, during the redirect to Konnect/Paymee, and in the seconds between
returning from the gateway and the webhook confirming. Trust signals are structural — a persistent
price breakdown, a named provider, an always-visible countdown, an order reference the user can
quote — never a badge that says "100 % Secure".

**4. Fast checkout means fewer decisions, not smaller buttons.**
Tickr's checkout asks for exactly four things: *which ticket type, how many, who is attending, how
you want to pay.* Nothing else. There is no upsell, no newsletter checkbox, no address form, no
account creation wall placed before the user has seen the price.

**5. Mobile-first is the default case, not the degraded one.**
The primary device is a mid-range Android phone at 360–412 px on a congested 3G/4G connection,
often held one-handed in a noisy street or a café. The desktop layout is derived from the mobile
one, not the other way around. Primary actions live in the bottom third of the screen.

**6. Local by construction: TND, French-first, local rails.**
Prices are TND with millimes handled correctly. The interface is French-first (`fr-TN`, matching
the existing `locale: 'fr_TN'` in `layout.tsx`) with the type stack chosen so Arabic can be added
without redesign. Payment offers **Konnect** and **Paymee** as first-class local options alongside
**Stripe** for international cards — and the ordering of those options on screen reflects local
reality, not Stripe-first habit.

### A.4 What Tickr is deliberately not

| Not this | Why |
|---|---|
| A public organizer profile page | `GET /events/organizer/:organizerId` requires the `ORGANIZER` or `ADMIN` role — an anonymous visitor cannot list an organizer's events. |
| A social network for events | No social graph, follows, comments or friend-attendance exists in the API. Designing for it would create dead UI. |
| An algorithmic "for you" feed | No recommendation engine exists. Curation in V1 is **editorial and filter-driven**, and must look intentional rather than broken. |
| A seat-map / assigned-seating product | Ticket types are quantity-based (`quantity` / `soldQuantity`). No seat inventory exists. |
| A resale marketplace | A ticket `transfer` endpoint exists (peer-to-peer), but there is no pricing, listing or escrow. Transfer is a *courtesy*, not a market. |
| A generic corporate SaaS dashboard | Even the organizer console is an event product: poster-led, warm, legible on a phone at a venue door. |

---

## B. Target users

Three roles exist in the backend (`UserRole`): `PARTICIPANT`, `ORGANIZER`, `ADMIN`. Design weight
is allocated roughly **70 / 25 / 5**.

### B.1 Primary persona — the Participant

> **Yasmine, 26, Tunis.** Works in a marketing agency in Lac 2. Discovers most of what she does
> through Instagram stories and friends' WhatsApp groups. Owns a mid-range Android phone. Has a
> local bank card and has used it online perhaps four times — she is not afraid of it, but she
> double-checks every amount. Decides on Thursday evening what she is doing on Friday.

**What she is actually doing, and what the interface owes her at each moment:**

**1. Discovering.** She arrives with *no query in mind*. She is browsing for a feeling — "something
Friday", "something not expensive", "something in Tunis". → *The home screen must be answerable by
thumb, not by keyboard.* Category rails (the API's ten categories, each with a defined
`displayNameFr`, icon and colour already in `event-category.vo.ts`), a city chip row, and a
date-window shortcut carry the discovery load. Search is present but is not the primary affordance.

**2. Comparing.** She has three candidate events open in her head. She is comparing on four axes and
four only: **when**, **where**, **how much**, **is it still available**. → *Every event card must
carry all four without a tap.* A card that shows a beautiful poster and a title but forces a tap to
learn the price has failed her.

**3. Checking the information.** Before spending money she wants to confirm the practical facts —
the exact start time, the venue and how to get there, what the ticket tiers actually differ on, and
whether the organizer looks real. → *The event page's first screenful is facts over prose.* The
long description is important but sits below the decision-critical block.

**4. Selecting tickets.** She usually buys **2** — for herself and one friend. Occasionally 4–6 for
a group. She needs to know, before she commits, how many are left and what she will actually pay.
→ *Quantity selection and the all-in price must be in the same visual unit.* The backend caps her
at 10 tickets per event and 1–10 holders per reservation; those limits must be shown as guidance
*before* they are hit, never discovered through an error.

**5. Paying quickly.** Her anxiety peak is the payment step. She wants to recognise the payment
brand, know she is leaving the site and coming back, and never wonder whether she has been charged
twice. → *Provider choice is explicit and named; the redirect is announced before it happens; the
return is handled with patience rather than a premature failure message.*

**6. Getting and using the ticket.** At the venue door, at night, on a phone with 4 % battery and no
signal. → *The QR must be reachable in one tap from the app's home surface, render at maximum
practical size, force screen brightness up, and survive an offline load.* This is the single most
unforgiving context in the product.

**Failure modes that would lose her permanently:** a price that grows between the event page and
the payment screen; a countdown that expires with no explanation of what she lost; a payment that
leaves her unsure whether she was charged; a QR that will not load at the door.

### B.2 Secondary persona — the Organizer

> **Karim, 34, Sousse.** Programmes a 300-capacity music venue and runs four to six events a month.
> Currently tracks sales in a WhatsApp group and a notebook. Uses a laptop to set an event up and
> his phone for everything after that — especially on the night.

Karim has two completely different modes, and the design must treat them as two different products:

**Creation mode (desktop, calm, once per event).** He builds the event and its ticket types. His
model of the world is the poster: image first, then title, date, venue, then price tiers. The
creation flow should mirror that order, and should show him a **live preview of the participant's
event card** as he types — because that card is what determines whether anyone buys. He needs the
`DRAFT → PUBLISHED` distinction to be unmistakable: a draft is invisible to the world, and he must
never be in doubt about which state he is in.

**Operating mode (phone, urgent, during sale and on the night).** He wants three numbers: *how many
sold, how much revenue, how many are through the door.* The API gives him
`GET /analytics/events/:id`, `GET /analytics/dashboard`, `GET /analytics/events/:id/sales-timeline`
and `GET /tickets/event/:eventId/stats`. Check-in (`POST /tickets/check-in`) happens standing at a
door in the dark — that screen is a scanning tool, not a dashboard: enormous target areas, an
unambiguous valid/invalid response, and readable in one glance.

**What Karim must understand without asking:** that the commission is added on top of his ticket
price, so his 50 DT ticket costs the buyer **53 DT** — and that if he wants the buyer to pay a round
number, he prices the ticket accordingly. The event-creation form should show this arithmetic live
as he types a price.

> ⚠️ **What Karim is paid is not yet answerable, and this brief will not invent it.** The
> buyer-facing half is unambiguous and implemented: `total = subtotal + subtotal × rate`
> (`order.entity.ts:192`), so 50 DT becomes 53 DT. The organizer-facing half is not. The economic
> model in `docs/02-technique/04-modele-economique.md` shows the organizer netting **47 TND** on a
> 50 TND ticket — i.e. a *second* 6 % deducted from the organizer's side, which `docs/README.md`
> describes as « payé par organisateur » — but **no payout or deduction logic exists anywhere in the
> V1 codebase.** The organizer dashboard's revenue figures therefore cannot be designed until this
> is settled; see [§L](#l-open-contract-questions-for-the-backend), gap 8. Until then, organizer
> surfaces show **gross sales**, clearly labelled as such, and never imply a net payout.

**One rule the creation form must enforce:** price and availability information belongs in the
*structured fields*, never in the description. Competitor research found real Meetup event pages
announcing "There's a $10 reservation fee" in the middle of the prose body, far below the fold and
invisible to every card, filter and sort. Tickr's description field should actively discourage this
— the form makes the structured price prominent enough that prose pricing feels redundant, because
a price that lives in a paragraph cannot be filtered on, cannot appear on a card, and cannot be
trusted.

### B.3 Tertiary persona — the Admin

> **The platform operator.** Small in number, high in privilege.

Admin surfaces are the one place where information density beats visual warmth — but they still use
the same design system, never a bolted-on admin theme. Admin has access to
`GET /analytics/platform`, `GET /analytics/revenue-report`, `POST /analytics/export`, and the full
user directory (`GET /users`). Design priority is **legibility of tabular data and traceability of
actions**, not visual delight. Admin gets roughly 5 % of design investment and reuses participant
and organizer components wherever possible.

---

## C. Brand personality

### C.1 The personality in one line

> **Tickr behaves like a well-connected friend who always knows what's on — enthusiastic about the
> event, completely straight with you about the money.**

That sentence contains the product's central tension, and resolving it is the whole design problem:
**maximum energy around the event, maximum sobriety around the transaction.** These are not
compromised into a bland middle. They are separated by surface.

### C.2 The seven attributes, made operational

| Attribute | What it means concretely | How it shows up | Where it must stop |
|---|---|---|---|
| **Modern** | Contemporary type, generous negative space, no skeuomorphism, no gradients-as-decoration | Flat surfaces, one accent, editorial layout | Never trend-chasing: no glassmorphism, no neon glow, no 3D |
| **Energetic** | Imagery is loud, motion is quick and purposeful | Full-bleed posters, 120–200 ms transitions, saturated accent | Never in checkout — the money path is still and calm |
| **Premium** | Restraint, precision, and craft in the details | Tight optical alignment, tabular figures, consistent radii, real photography | Never luxury-coded: no gold, no serif italics, no "exclusive" tone |
| **Trustworthy** | The user always knows what they will pay, what they've bought, and what happens next | Persistent price breakdown, visible timer, named providers, order references | Never performed via badges, padlock icons or "100 % secure" copy |
| **Social** | Events feel attended, not listed | Attendance and scarcity signals, shareable event pages, group-buy phrasing ("Combien de billets ?") | Never fabricated social proof — no invented "12 friends going" |
| **Simple** | One decision per screen; a clear default on every choice | Single primary action per view, sensible pre-selection | Never simple-by-omission — the fee is never hidden to look simpler |
| **Young, not childish** | Confident, direct, informal French; no corporate hedging | "Tu" is avoided; the tone is warm "vous" — direct, short sentences | No emoji in the product chrome, no exclamation marks in system copy, no mascot |

### C.3 Voice and tone

**Language:** French-first (`fr-TN`). All strings must be externalised from day one so Arabic and
English can follow — even though V1 ships French only. No hard-coded French in components.

**Register:** Warm "vous". Short sentences. Verbs over nouns. The interface speaks in the user's
terms ("Il reste 4 billets"), never in the system's (`INSUFFICIENT_AVAILABILITY`).

**Three tone modes:**

| Mode | Where | Example |
|---|---|---|
| **Editorial** — energetic, evocative, brief | Discovery, event pages, marketing surfaces | *« Vendredi soir à Tunis »* · *« Plus que quelques places »* |
| **Transactional** — precise, neutral, arithmetic | Checkout, order summary, payment | *« Frais de service (6 %) — 3,000 DT »* · *« Total à payer — 53,000 DT »* |
| **Reassuring** — calm, specific, actionable | Errors, expiry, payment failure | *« Le paiement n'a pas abouti. Aucun montant n'a été débité. Vos billets sont encore réservés pendant 6 minutes. »* |

**Copy rules that are non-negotiable:**

1. Never apologise for a system state the user caused or that is normal ("Oups !" is banned).
2. Never use a technical term in user-facing copy — no "erreur 409", no "token", no "payload".
3. Money is always written with its currency and never abbreviated away.
4. Every error sentence answers three questions in order: *what happened · what it means for my
   money · what I do now.*
5. Never promise what the backend cannot deliver — notifications are **email and SMS**, so never
   write "vous recevrez une notification" when you mean an email.

### C.4 Anti-patterns — what Tickr must never look like

- **A generic SaaS dashboard.** No sidebar-plus-white-cards-plus-blue-links default. Even
  `/dashboard` is poster-led.
- **A bank portal.** Trust must not be bought with corporate navy, stock photography of handshakes,
  or dense legal type.
- **A discount aggregator.** No countdown-pressure marketing, no strikethrough fake pricing, no
  red "URGENT" banners. The only countdown in the product is the *real* 15-minute reservation hold.
- **A Facebook event clone.** No blue-on-white social chrome, no engagement metrics as decoration.

---

## D. Visual direction

### D.1 The governing idea: **the poster is the product, the interface is the frame**

Tickr's screens contain two kinds of material, and they must never compete:

- **Event material** — posters, photography, artist images, venue shots. Loud, saturated,
  uncontrollable, supplied by organizers. This carries the energy.
- **Interface material** — chrome, controls, prices, status, forms. Quiet, warm-neutral, precise,
  entirely under our control. This carries the trust.

The design language is therefore a **gallery**: a calm, warm, slightly off-white room whose walls
never argue with what is hung on them, with a single electric accent used sparingly for action, and
a deep ink used for weight. Every visual decision below follows from that.

The practical consequence — and the rule that resolves most future arguments — is:
**colour enters a screen through the imagery, not through the chrome.** If a screen has no event
image on it, it should look almost monochrome.

### D.2 Colour

#### Primary — **Cobalt** (`#2E3DE8`)

An electric, high-saturation cobalt. It is chosen for three reasons: it carries the Mediterranean /
Sidi Bou Saïd blue that reads unmistakably Tunisian without being a flag cliché; it is far enough
from the social-network blue and the banking navy to feel like a product rather than a category;
and at `#2E3DE8` it clears **7.12 : 1** against white, so white-on-cobalt buttons are AAA-compliant
at any size.

Cobalt has exactly one job: **action and interactive identity.** Primary buttons, links, active
tabs, selected states, focus rings, the quantity stepper's active state. It is *not* a background
colour, not a header fill, and not decoration. On a screen with no available action, cobalt should
be absent.

| Token | Hex | Use | Verified contrast |
|---|---|---|---|
| `cobalt-700` | `#2430C9` | Pressed / active button state | white on it — **8.97 : 1** ✅ AAA |
| `cobalt-600` | `#2E3DE8` | **Primary action**, links, focus ring | white on it — **7.12 : 1** ✅ AAA · on white — **7.12 : 1** ✅ AAA · on canvas — **6.65 : 1** ✅ AA |
| `cobalt-500` | `#3B4DF5` | Hover state, illustrative accents | white on it — **5.89 : 1** ✅ AA |
| `cobalt-100` | `#E6E9FF` | Selected-row tint, info callout background | `cobalt-600` on it — **5.92 : 1** ✅ AA |
| `cobalt-50` | `#F0F2FF` | Subtle selected/hover wash | decorative |

#### Accent — **Sun** (`#FFD23F`)

A warm, high-energy yellow — Mediterranean sun, jasmine, festival lighting. It exists to make the
product feel alive in a way a blue alone cannot, and it is the strongest colour in the system, so
it is rationed hard.

Sun's jobs, and only these: scarcity and momentum badges (« Bientôt complet »), the reservation
countdown's attention state, editorial highlight moments on discovery, and the brand mark. Ink text
on Sun clears **13.25 : 1** — the highest-contrast pairing in the system, which is exactly why it
draws the eye.

**Sun is never used for:** a primary button (that is always cobalt — one action colour, no
ambiguity), an error or warning state (that is `danger`/`warning` — yellow must not acquire a
failure meaning), or large background fills.

| Token | Hex | Use | Verified contrast |
|---|---|---|---|
| `sun-400` | `#FFD23F` | Scarcity badge, countdown attention, brand | ink-950 on it — **13.25 : 1** ✅ AAA |
| `sun-500` | `#F5B80B` | Icon fills needing more weight on light surfaces | ink-950 on it — **10.70 : 1** ✅ AAA |
| `sun-700` | `#8A5B00` | Sun-family **text** on light backgrounds | on white — **5.87 : 1** ✅ AA |

#### Neutrals — warm ink and warm paper

The neutrals are **warm**, not the cool blue-greys of default Tailwind. Warm neutrals make
photography look better, read as gallery paper rather than software chrome, and keep the interface
from feeling clinical. The page ground is `#F8F7F4` — a warm off-white — and cards are pure white,
so cards *lift* off the page without needing a shadow.

| Token | Hex | Role | Verified |
|---|---|---|---|
| `canvas` | `#F8F7F4` | Page background (warm paper) | — |
| `surface` | `#FFFFFF` | Cards, sheets, inputs — lifts off canvas by value alone | — |
| `surface-2` | `#F1EFEA` | Inset areas: order-summary block, disabled fields, table stripes | — |
| `ink-950` | `#0B0F1A` | Primary text, headlines, dark surfaces | on white — **19.13 : 1** ✅ AAA |
| `ink-700` | `#374151` | Body copy, secondary headings | on white — **10.31 : 1** ✅ AAA · on `surface-2` — **8.97 : 1** ✅ AAA |
| `ink-500` | `#6B7280` | Supporting text, metadata, captions | on white — **4.83 : 1** ✅ AA · on canvas — **4.51 : 1** ✅ AA |
| `ink-400` | `#9CA3AF` | **Non-text only** — disabled glyphs, decorative icons | on white — 2.54 : 1 ❌ |
| `border` | `#E5E3DD` | Decorative hairlines, card edges | 1.28 : 1 — decorative only |
| `border-strong` | `#7F848F` | **Control boundaries** — inputs, checkboxes, radios, steppers | on white — **3.75 : 1** ✅ meets WCAG 1.4.11 non-text |

> **Two hard rules that came out of validating this palette — both are easy to violate by accident:**
> 1. **`ink-400` is never text.** At 2.54 : 1 on white it fails AA outright. Disabled *text* uses
>    `ink-500` at full opacity with a `surface-2` fill and `aria-disabled`, never a lighter grey.
> 2. **`ink-500` is not allowed on `surface-2`.** That pairing measures **4.21 : 1** — it fails AA
>    for normal text. Inside order summaries and other `surface-2` blocks, supporting text steps up
>    to `ink-700`. This matters because the order summary is the single most important block in the
>    product to be able to read.
>
> Likewise `border` (`#E5E3DD`, 1.28 : 1) may draw a card edge but may **never** be the only
> boundary of an input or a checkbox — that requires `border-strong`.

#### Semantic colours

Semantics are used only for genuine state, never for decoration. Each has a **text-safe 700** and a
**fill-safe 600** plus a **tint 100** for callout backgrounds.

| Role | Text (`-700`) | Fill (`-600`) | Tint (`-100`) | Meaning in Tickr | Verified |
|---|---|---|---|---|---|
| **Success** | `#047857` | `#059669` | `#D1FAE5` | Order paid · ticket confirmed · checked in | `-700` on white **5.48 : 1** ✅ · on tint **4.84 : 1** ✅ · white on `-700` **5.48 : 1** ✅ |
| **Warning** | `#B45309` | `#D97706` | `#FEF3C7` | Reservation expiring · low availability · sales window closing | `-700` on white **5.02 : 1** ✅ · on tint **4.51 : 1** ✅ |
| **Danger** | `#B91C1C` | `#DC2626` | `#FEE2E2` | Payment failed · reservation expired · event cancelled | `-700` on white **6.47 : 1** ✅ · on tint **5.30 : 1** ✅ · white on `-600` **4.83 : 1** ✅ |

`-600` fills clear 3 : 1 against white and so are valid for icons, bars and borders, but **must not
carry small text** except `danger-600`, which does. When in doubt, text uses `-700`.

#### Status colour mapping

The backend already ships display metadata for statuses (`EVENT_STATUS_METADATA` carries Material
palette hexes). **The frontend does not consume those hexes** — they are Material-family colours
that would break this palette. The frontend maps backend *enum values* to Tickr's own tokens:

| Backend enum | Tickr treatment |
|---|---|
| `EventStatus.PUBLISHED` | No badge — the normal case is silent |
| `EventStatus.DRAFT` | Neutral badge, `ink-700` on `surface-2` — organizer surfaces only |
| `EventStatus.CANCELLED` | `danger` tint badge, plus a full-width banner on the event page |
| `EventStatus.COMPLETED` | Neutral badge, imagery desaturated to 60 % |
| `OrderStatus.PENDING` / `PROCESSING` | `warning` tint + animated indicator |
| `OrderStatus.PAID` | `success` |
| `OrderStatus.FAILED` / `CANCELLED` | `danger` |
| `OrderStatus.REFUNDED` | Neutral `ink-700` — a refund is a completed outcome, not an error |
| `TicketStatus.CONFIRMED` | `success` · QR live |
| `TicketStatus.RESERVED` | `warning` + countdown |
| `TicketStatus.CHECKED_IN` | Neutral + timestamp — QR visually "spent" |
| `TicketStatus.EXPIRED` / `CANCELLED` | `ink-500` on `surface-2`, QR hidden |

#### Dark surfaces

Tickr is a **light product with dark moments**, not a dark product. Two surfaces are dark by
design: the **ticket pass** in the wallet, and the **check-in scanner**. Both benefit — a dark
ticket reads as a physical object, and a dark scanner is usable at a venue door at night.

On `ink-950` (`#0B0F1A`): body text is `#E8E6E1` (**15.34 : 1** ✅ AAA), supporting text may use
`ink-400` (**7.54 : 1** ✅ AAA — the one place `ink-400` is legitimate as text), and `sun-400`
reaches **13.25 : 1**. Note that `ink-900` on `ink-950` is only 1.08 : 1, so **dark surfaces must be
separated by a 1 px `rgba(255,255,255,0.08)` hairline, never by fill value alone.**

A full app-wide dark theme is **out of scope for V1** and must not be half-implemented. The
`prefers-color-scheme` block currently in `globals.css` is placeholder scaffolding and should be
removed rather than left partially wired.

### D.3 Typography

**Two families, one purpose each.**

| Role | Family | Why |
|---|---|---|
| **Display** — event titles, page headings, numbers that should feel like a poster | **Archivo** (variable, Google Fonts) | Grotesque with real poster energy at heavy weights, tightens beautifully at display sizes, full Latin-Extended for French diacritics, variable so weight costs nothing extra |
| **UI / body** — everything else, and *all* money | **Inter** (variable, already installed) | The most legible UI face at small sizes on low-density Android screens; excellent French coverage; **has true tabular figures**, which the money rules below depend on |
| *Future — Arabic* | **IBM Plex Sans Arabic** | Reserved now so the RTL locale is a font swap plus logical properties, not a redesign. Not loaded in V1. |

Both load via `next/font/google` with `display: 'swap'` and Latin + Latin-Extended subsets only.
**Total web-font budget: two families, variable, ≤ 4 loaded axes** — this is a hard performance
ceiling for a 3G-first product.

#### Type scale

Mobile-first sizes; the display steps grow at `lg`. Nine steps, each with an assigned job — no step
exists without one.

| Token | Size / line-height | Weight · tracking | Job |
|---|---|---|---|
| `display-xl` | 36 / 40 → 44 / 48 at `lg` | Archivo 700 · −2 % | Event title on the event page hero |
| `display-l` | 28 / 32 | Archivo 700 · −1.5 % | Section heroes, page titles |
| `h1` | 22 / 28 | Archivo 600 · −1 % | Card titles, sheet titles |
| `h2` | 18 / 24 | Inter 600 | Sub-sections, ticket-type names |
| `body` | 16 / 24 | Inter 400 | Default body — **never below 16 px for primary reading** |
| `body-sm` | 14 / 20 | Inter 400 | Metadata, helper text, dense lists |
| `caption` | 13 / 18 | Inter 500 | Timestamps, legal, fine print — **floor for any text in the product** |
| `overline` | 12 / 16 | Inter 600 · +6 % · uppercase | Category eyebrows, section labels — **short strings only** |
| `mono-num` | inherits | Inter · `font-variant-numeric: tabular-nums` | **All money, all counts, all countdowns** |

#### The money typography rules

Money is the highest-stakes text in the product, so it gets explicit rules:

1. **Every monetary value uses `tabular-nums`.** Non-tabular digits make a countdown jitter and
   make a price column fail to align — both read as unreliability.
2. **TND has three decimal places (millimes)** — this is in `currency.vo.ts` and is not optional.
   But displaying `50,000 DT` for a fifty-dinar ticket invites a catastrophic misreading.
   **The rule: render millimes only when they are non-zero.** `50 DT` · `53 DT` · `52,500 DT`.
   Full three-decimal precision is always used in the order summary total and on receipts.
3. **A non-breaking space before `DT`**, which never wraps to its own line.
4. **Never construct a price client-side from a rate.** The API returns `subtotal`, `platformFee`
   and `total` on the order — display those verbatim. The commission rate is configurable and the
   calculator applies a floor, so a client-side `× 1.06` will eventually disagree with the charge.
5. **The total is always the visually heaviest number on any screen it appears on.**

### D.4 Shape, surface and depth

**Radius philosophy — *posters are square, tickets are round*.**

Imagery keeps its corners so it reads as a printed poster; interactive and physical-feeling objects
round progressively with size. Six values, each with a job:

| Token | Value | Applies to |
|---|---|---|
| `radius-none` | `0` | Full-bleed hero imagery, edge-to-edge media |
| `radius-sm` | `8 px` | Inputs, chips, badges, small controls |
| `radius-md` | `12 px` | Buttons, compact cards, thumbnails |
| `radius-lg` | `16 px` | Cards, panels, order summary block |
| `radius-xl` | `24 px` | Bottom sheets, modals, the ticket pass |
| `radius-full` | `9999 px` | Avatars, filter pills, quantity stepper, status dots |

**Cards.** The default event card is: full-bleed 3 : 2 image with `radius-lg` on the top corners
only, on a `surface` body, with a `1 px border` edge and **no shadow at rest**. It lifts off `canvas`
by value, not by depth — which keeps a dense grid of cards calm. Shadow appears only on hover
(pointer devices) as a 2 px lift. The card is entirely clickable, with the title as the accessible
name and the whole card as one link — never nested interactive elements.

**Elevation.** Shadows are warm-tinted (`rgba(11, 15, 26, …)` rather than pure black) and there are
only five levels, because a flat product with real photography does not need more:

| Token | Value | Use |
|---|---|---|
| `shadow-none` | — | Default for cards at rest |
| `shadow-sm` | `0 1px 2px rgba(11,15,26,.06), 0 2px 8px rgba(11,15,26,.04)` | Card hover, raised chips |
| `shadow-md` | `0 4px 12px rgba(11,15,26,.08), 0 2px 4px rgba(11,15,26,.04)` | Dropdowns, popovers, date pickers |
| `shadow-lg` | `0 12px 32px rgba(11,15,26,.14)` | Bottom sheets, modals |
| `shadow-sticky` | `0 -1px 0 var(--color-border), 0 -8px 24px rgba(11,15,26,.08)` | The sticky purchase bar — shadow points **upward** |

### D.5 Buttons

One primary action per screen. Always.

| Variant | Fill / text | Height | Use |
|---|---|---|---|
| **Primary** | `cobalt-600` → white · hover `cobalt-500` · active `cobalt-700` | 48 px (mobile) / 44 px (desktop) | The one action that moves the user forward |
| **Secondary** | `surface` → `ink-950`, `1 px border-strong` | 44 px | Alternative, non-committal actions |
| **Ghost** | transparent → `cobalt-600` | 44 px | Tertiary, in-card actions |
| **Danger** | `danger-600` → white (4.83 : 1 ✅) | 44 px | Cancel order, delete event — always behind a confirmation |
| **On-image** | `surface` → `ink-950`, with a scrim behind | 44 px | Actions overlaid on posters (share, save) |

Shape `radius-md`, Inter 600, no uppercase, no letter-spacing, no gradient, no icon-only primary
buttons except in the wallet and scanner where the icon is universally understood.

**Every button has five defined states** — rest, hover, focus-visible, active, and **loading** —
and the loading state is mandatory on any button that triggers a network call. Loading preserves
the button's exact width (no layout shift), replaces the label with a spinner plus an
`aria-live="polite"` status, and disables re-entry. On the payment button this is not a nicety: it
is the primary defence against a double charge, alongside the `idempotencyKey` the API accepts.

### D.6 Forms

Tickr's forms are short and high-stakes (registration, holder details, event creation). The style is
**large, boxed, and explicit** — floating labels and placeholder-as-label are banned outright,
because they fail at exactly the moment a user is unsure.

- **Label above the field**, always visible, `body-sm` Inter 600 in `ink-700`.
- **Field**: 48 px tall on mobile, `surface` fill, `1 px border-strong` (3.75 : 1 ✅), `radius-sm`,
  16 px text — **16 px is mandatory**, since a smaller font triggers iOS Safari's zoom-on-focus.
- **Helper text** below the field in `ink-500`, present from the start where a constraint exists
  (e.g. « Ce nom apparaîtra sur le billet »), not revealed only on failure.
- **Errors** are `danger-700` text plus a `danger-600` left border plus an icon — **never colour
  alone** — wired with `aria-describedby` and `aria-invalid`, and validated on blur, never on every
  keystroke.
- **Required is marked; optional is marked too** when a form mixes both, since `*` alone is
  routinely missed.
- Zod schemas are the single source of truth for validation messages, in French, mirroring the
  backend's `class-validator` constraints (e.g. holder name 1–200 chars, phone ≤ 20 chars) so the
  client never permits what the server will reject.

### D.7 Iconography

**Heroicons** exclusively — it is already a fixed dependency, and mixing icon sets is the fastest
way to make a product look assembled rather than designed.

- **24 px outline** as the default, **20 px solid** for active/selected states and dense rows.
- Icons are `1.5 px` stroke, inherit `currentColor`, and are `aria-hidden` unless they are the only
  content of a control — in which case the control carries an `aria-label`.
- **An icon never carries meaning alone.** Every status icon is paired with text. This is both an
  accessibility requirement and a hedge against cultural icon ambiguity.
- The backend's `EVENT_CATEGORY_METADATA` supplies an `icon` name per category (`music`,
  `microphone`, `trophy`, …). The frontend keeps a **single explicit map** from those names to
  Heroicons components — never dynamic component lookup — so an unknown category degrades to a
  default glyph instead of crashing.

### D.8 Image treatment

Event imagery is user-supplied via `POST /events/:id/image`, which means it is **uncontrolled**: it
will arrive at wrong aspect ratios, with baked-in text, over- and under-exposed. The system must
make bad images acceptable and good images spectacular.

1. **Fixed aspect ratios, never distorted.** `3 : 2` for cards, `16 : 9` for the desktop event hero,
   `4 : 5` for the mobile event hero (portrait posters are what organizers actually have),
   `1 : 1` for compact list rows. Always `object-fit: cover`, centre-weighted.
2. **A scrim, never a guess.** Any text over an image sits on a defined gradient scrim
   (`linear-gradient(to top, rgba(11,15,26,.85) 0%, rgba(11,15,26,.45) 40%, transparent 75%)`),
   which guarantees the 4.5 : 1 minimum regardless of what the organizer uploaded. Text is never
   placed on a raw image.
3. **No filters on event imagery.** The organizer's poster is their identity; Tickr does not
   restyle it. The one exception is `COMPLETED` and `CANCELLED` events, desaturated to 60 % to
   communicate that they are past.
4. **Every image needs a graceful absence.** The empty state is not a grey box: it is a
   category-tinted panel carrying the category glyph and the event's initials, generated
   deterministically from the event ID so it is stable across renders. A poster-led product must be
   beautiful even with zero uploads.
5. **Loading is progressive**: `next/image` with a blurred placeholder, `priority` on the event-page
   hero only, lazy everywhere else, AVIF/WebP served responsively. On a 3G connection the layout
   must be stable before the image lands — **every image container has a reserved aspect-ratio box**,
   so there is no cumulative layout shift.

### D.9 Spacing and density

**4 px base unit.** Ten steps, each with an assigned job:

| Token | px | Job |
|---|---|---|
| `space-1` | 4 | Icon-to-label, tight inline pairs |
| `space-2` | 8 | Inside chips and badges, dense stacks |
| `space-3` | 12 | Input padding, list-row rhythm |
| `space-4` | 16 | **Default gap**, card padding, mobile gutter |
| `space-5` | 20 | Between related blocks |
| `space-6` | 24 | Card padding at `md`+, tablet gutter |
| `space-8` | 32 | Between sections within a screen, desktop gutter |
| `space-10` | 40 | Section separation on mobile |
| `space-12` | 48 | Major section separation |
| `space-16` | 64 | Page-level top/bottom rhythm on desktop |

**Density philosophy — comfortable, and identical across breakpoints.** Touch targets do not shrink
on desktop; a 44 px control is also more comfortable with a mouse. Density increases in exactly two
places: admin data tables and the organizer sales list, which may drop to 40 px rows.

**Overall visual density: medium-low.** Discovery is generous — imagery needs air to look premium,
and a crowded grid looks like a classifieds site. Checkout is *tighter*, deliberately: the entire
order summary plus the primary action should fit in one viewport on a 390 × 844 screen without
scrolling, because a total that requires scrolling to see is a total that gets misread.

---

## E. UX principles

Five principles. Each is a **testable rule**, not a value — every one can be failed by a specific
screen, and a design review can check it in seconds.

---

### E.1 — Two taps from poster to checkout, and never ask who you are before showing the price

**The rule.** From any event card anywhere in the product, the user reaches the ticket-selection
sheet in **at most two taps**. Ticket-type selection and quantity selection require **no account**.
Authentication is requested exactly once — at order creation — and the user's full selection
survives it.

**Why it is a Tickr principle.** Tickr's traffic will arrive from Instagram and WhatsApp links onto
a single event page. That user has no account and no patience. Every ticketing product that puts a
login wall in front of the price loses that user permanently.

**What it forbids.** A login wall before the price is visible. An interstitial "choose your ticket"
page that only lists types. Losing selection state on redirect to `/auth/login`. A checkout that
begins with account creation.

**How it is tested.** From `/events/[id]`, tap the sticky purchase bar → the ticket sheet is open.
Choose a quantity while logged out → the primary action reads « Continuer » and the sign-in step
returns to exactly this sheet with the quantity intact.

---

### E.2 — Availability is stated in words and numbers, never implied by a disabled button

**The rule.** Every ticket type displays its availability state explicitly, at every place it is
purchasable. A user must never have to infer scarcity from a greyed-out control.

**The four states.** The backend does the computation for us — `TicketTypeDto` already exposes
`availableQuantity`, `isSoldOut` and `isOnSale`, and `EventListDto` exposes `availableCapacity`,
`salesProgress` (0–100) and `isSoldOut`. **The frontend derives nothing it can read:**

| State | Condition (from the API) | Treatment |
|---|---|---|
| **Available** | `isOnSale && availableQuantity > 20 %` of `quantity` | No badge — the normal case is silent |
| **Limited** | `isOnSale && availableQuantity ≤ 20 %` | `sun-400` badge, « Plus que N places » using `availableQuantity` — an exact number, not a vague warning |
| **Sold out** | `isSoldOut` | `ink-500` on `surface-2`, « Complet », control disabled **and labelled**, tier stays visible |
| **Not on sale** | `!isOnSale` — outside `salesStartDate`/`salesEndDate`, or `isActive: false` | « En vente le 12 septembre » or « Ventes terminées », using the real dates — never just "unavailable" |

On discovery cards the same logic runs one level up, from `isSoldOut` and `salesProgress`, so a card
and the tier row it leads to can never disagree.

**A crucial subtlety about the counter.** `soldQuantity` is incremented at **hold** time, not at
payment time — `reserve-tickets.handler.ts:99` performs the atomic decrement the moment tickets are
reserved — and it is **incremented back** when a reservation expires or is cancelled
(`expire-tickets.handler.ts:93`, `cancel-tickets.handler.ts:105`). This means **the remaining count
can legitimately go back up.** Three design rules follow:

- **Availability is a per-fetch snapshot, never a live counter.** The number is rendered as a
  statement of what was true when the data was fetched. It is never animated, never transitioned,
  and never polled on a short interval — a figure visibly ticking upward reads as a bug or a lie.
- **Refetch on focus and re-render; do not draw attention to the change.** No "2 more available!"
  flourish, no count-up animation.
- **Sold out is not terminal.** Because a lapsed hold can return stock, a sold-out tier gets a
  « Vérifier à nouveau » refetch affordance rather than being treated as a dead end — which also
  gives the sold-out state something useful to do.

This also rules out the "N people are viewing this" and "N tickets in someone's basket" patterns
outright: the data would support them and they would be actively dishonest here.

**Why it is a Tickr principle.** Availability is the second-most common reason a purchase is
abandoned, and the first-most common reason a user feels cheated — discovering at the payment step
that the tier they picked was gone. The backend rejects an over-large order with
`INSUFFICIENT_AVAILABILITY` *and returns the true remaining count in its message*; that number
belongs on screen **before** the user hits the wall, not after.

**What it forbids.** Hiding sold-out tiers (the user needs to know the cheap tier existed and went).
A disabled button with no adjacent explanation. A quantity stepper that silently stops incrementing.

---

### E.3 — Disclose the service fee the instant a quantity exists — never at the payment step

**The rule.** The moment the user selects a quantity greater than zero, the interface displays the
**complete arithmetic**: line subtotal, service fee, total. That breakdown then remains visible,
unchanged in structure and value, through every subsequent screen until payment completes.

```
2 × Standard                              100,000 DT
Frais de service (6 %)                      6,000 DT
─────────────────────────────────────────────────────
Total à payer                             106,000 DT
```

**Why it is a Tickr principle.** Tickr's 6 % commission is **added on top** of the organizer's
ticket price (`order.entity.ts:192`) — a 50 DT ticket costs the buyer 53 DT. This is the single
largest trust risk in the product: a price that grows between the poster and the payment screen is
precisely how ticketing platforms earn their reputation. Tickr's answer is not to hide the fee but
to surface it *earlier than anyone expects* — at the first moment it can be calculated, framed as a
named service fee with its rate shown.

**Implementation constraints — and one real complication.** Three facts from the backend shape how
this principle is actually built:

1. **`platformFee` from the API is always authoritative.** `POST /orders` returns `subtotal`,
   `platformFee`, `paymentFees` and `total`. Those values are rendered verbatim. The rate is
   configurable and the domain applies a minimum-fee floor, so a client-side `× 1.06` will
   eventually disagree with the actual charge.
2. **⚠️ No endpoint currently exposes the commission rate.** `PLATFORM_COMMISSION_RATE` lives only
   as a backend environment variable read inside `create-order.handler.ts`; there is no
   `GET /config/public` controller in the codebase despite one being described in
   `docs/02-technique/05-configuration-management.md`. So **before an order exists, the frontend has
   no authoritative rate to display.** The interim design: a build-time
   `NEXT_PUBLIC_PLATFORM_COMMISSION_RATE` supplies the *indicative* pre-order figure, every such
   figure is explicitly labelled an estimate, and the value is read from a single constant module so
   there is exactly one place to correct. This is a **known-drift compromise, not a good design** —
   resolving it is the highest-priority item in [§L](#l-open-contract-questions-for-the-backend).
3. **The total can legitimately gain a fourth line after provider selection.**
   `OrderEntity.setPaymentFees()` (`order.entity.ts:563`) recomputes
   `total = subtotal + platformFee + paymentFees`. Nothing calls it in V1, so `paymentFees` is
   currently always 0 — but the aggregate is deliberately built to allow gateway fees to change the
   total once a provider is chosen. **The summary component must therefore render `paymentFees` as a
   conditional line that appears only when non-zero, and must re-read the order's `total` after
   provider selection rather than caching the figure from order creation.** Designing for a
   three-line breakdown today would break the first time gateway fees are switched on.

**What it forbids.** A fee that first appears on the payment screen. A « frais » line without an
amount. A total that differs by even one millime from what the gateway charges. A hard-coded "6 %"
string anywhere in a component. Advertising "0 % fees".

---

### E.4 — The 15-minute hold is a visible, explained contract with a way out

**The rule.** From the moment an order is created, a countdown is visible in the **same position on
every checkout screen**, it states what it is holding, and it never simply reaches zero and
abandons the user.

**The three phases:**

| Phase | Treatment |
|---|---|
| **> 5 min** | Neutral. `ink-700` on `surface-2`. « Vos billets sont réservés pendant 14:32 » |
| **≤ 5 min** | `warning` tint, no animation. « Il reste 4:12 pour finaliser » |
| **≤ 1 min** | `sun-400` attention state, a single pulse per 10 s — **suppressed entirely under `prefers-reduced-motion`** |
| **Expired** | A blocking, calm state — see [§G](#g-error-and-edge-case-ux) |

**The countdown is always stated in two forms at once** — the relative « Il reste 12:34 » *and* the
absolute « Vos billets sont gardés jusqu'à 21:45 ». This is not redundancy. The relative form is the
one a user reads at a glance; the **absolute form is the only one that survives** a redirect to
Konnect, a backgrounded browser tab, an OTP SMS arriving, and a return three minutes later. A user
who comes back to a page whose timer was frozen at « 4:12 » has been misinformed; a user who reads
« jusqu'à 21:45 » can always check their own clock. DICE ships exactly this pairing, and it is the
single most transferable idea in [§J](#j-competitive-inspiration).

**Why it is a Tickr principle.** Both the ticket reservation (`RESERVATION_TTL_MINUTES = 15`) and
the order (`ORDER_EXPIRATION_MINUTES`, default 15) expire. A background job expires reservations
server-side. A user who is redirected to Konnect, fights with an OTP SMS, and comes back to a dead
order with no explanation will assume Tickr took their money. The countdown is the contract that
prevents that assumption.

**Non-obvious requirements this creates:**
- The countdown is driven by the **server's `expiresAt`** on the order, never by a client-side
  `setTimeout` started at mount — a backgrounded mobile browser throttles timers and will drift.
- Every countdown re-derives from `expiresAt` on tab focus and on every order refetch.
- The countdown **keeps running visibly during the payment redirect return**, because that is when
  it matters most.
- Reaching zero **never silently navigates**. It swaps to an explicit expired state with the tickets
  the user had selected preserved so a rebuild is one tap.
- The remaining time is announced to screen readers at the 5-minute and 1-minute thresholds via
  `aria-live="polite"` — never on every tick.

---

### E.5 — Every failure names its cause in French, in money terms, and offers exactly one way forward

**The rule.** No error state in Tickr may consist of a message alone. Every one carries: **what
happened** (in the user's terms), **what it means for their money** (explicitly, including "nothing
was charged" when true), and **one primary recovery action** — plus at most one secondary.

**Why it is a Tickr principle.** Tickr's failure modes are unusually money-adjacent: an expired
hold, a declined card, an abandoned gateway redirect, a webhook that has not landed yet. For a user
who is paying online for one of the first times, ambiguity about whether they were charged is worse
than the failure itself. "Aucun montant n'a été débité" is the most important sentence in the
product.

**The mandatory shape:**

> **Le paiement n'a pas abouti**
> Votre banque a refusé la transaction. **Aucun montant n'a été débité.**
> Vos billets restent réservés pendant **6:12**.
> **[ Réessayer le paiement ]**  ·  Choisir un autre moyen de paiement

**What it forbids.** A raw HTTP status or backend error type shown to a user. A toast as the only
handling of a failed purchase — money failures are page or sheet states, never a message that
disappears in four seconds. A dead end with only a "Retour" link. Silence while polling.

---

## F. Core purchase experience

> `Discovery → Event details → Ticket selection → Reservation → Order → Payment → Confirmation → Ticket`

The whole flow is designed as **one continuous act with a single visible price**, not eight
independent pages. Steps 3 to 5 happen inside **one bottom sheet on mobile** so the user never
loses the event context, and the sheet's summary block is literally the same component that later
appears on the order and confirmation screens.

---

### F.1 Discovery

**Surfaces:** `GET /events`, `GET /events/upcoming`, `GET /events/search`, `GET /events/category/:category`.
**Available lenses:** `q`, `category`, `city`, `country`, `dateFrom`, `dateTo`, `minPrice`,
`maxPrice`, `page`, `limit`, plus `sortBy` (`startDate`, `soldTickets`, `publishedAt`, `title`, …)
and `sortOrder`. Two of those sorts are genuinely useful as *editorial* surfaces rather than as a
sort dropdown: `soldTickets DESC` becomes « Les plus populaires » and `publishedAt DESC` becomes
« Nouveautés ».

The home screen answers *"what can I do?"* before it asks *"what are you looking for?"*:

- A **hero rail** of a small number of editorially-weighted upcoming events, full-bleed poster,
  horizontally swipeable, with paging dots and real focus management.
- **Category rails** built from the API's ten categories, using each category's `displayNameFr`
  from the backend metadata so labels never drift from the enum.
- A **city chip row** (Tunis, Sousse, Sfax, Hammamet, …) mapping to the `city` filter, with the
  user's last choice remembered in Zustand and persisted to `localStorage`.
- A **date-window control** offering « Ce soir », « Ce week-end », « Cette semaine » — each of which
  is simply a `dateFrom`/`dateTo` pair, requiring no new backend capability.
- Search is a persistent but secondary affordance in the header.

**Every event card carries, without a tap:** poster (`imageUrl`), title, day + time (`startDate`),
venue and city (`location`), entry price and a scarcity badge. Critically, **this is all buildable
from the list response alone** — `EventListDto` ships `ticketSummary.minPrice` / `maxPrice` /
`currency` alongside `availableCapacity`, `salesProgress` and `isSoldOut`. So « À partir de 50 DT »
and « Plus que quelques places » require **no per-card follow-up request**, which is what makes a
dense discovery grid viable on 3G. This is a direct consequence of
[E.2](#e2--availability-is-stated-in-words-and-numbers-never-implied-by-a-disabled-button) and of
Yasmine's comparison behaviour.

**Filter state lives in the URL.** Every filtered view is a shareable, back-button-correct link —
this is what makes the WhatsApp-forwarding culture work in Tickr's favour.

**Pagination:** infinite scroll on mobile with an explicit « Charger plus » fallback button (never
scroll-only — it is unreachable by keyboard and unreliable on flaky connections); classic pagination
on desktop. The response carries `hasNextPage` / `hasPreviousPage` / `totalPages`, so the control
never has to infer whether more exists. Page size 20, max 100.

---

### F.2 Event details

`GET /events/:id`. The first screenful is **decision-critical facts**; prose comes after.

**Order of content on mobile:**

1. **Poster**, 4 : 5, full-bleed, with a back control on a scrim.
2. **Title** (`display-xl`) and category eyebrow.
3. **The facts block** — date and time in full (`date-fns` with the `fr` locale, e.g.
   « Vendredi 12 septembre 2026, 21:00 »), venue name, address, city. Events carry optional
   `latitude`/`longitude`, so the venue block links out to a maps URL when coordinates are present
   and falls back to the written address when they are not. A map is progressive enhancement, never
   a dependency — a large share of events will be created without coordinates.
4. **Price entry point** — « À partir de 50 DT » with the service-fee note.
5. **Ticket types**, each with name, description, price and its availability state from
   [E.2](#e2--availability-is-stated-in-words-and-numbers-never-implied-by-a-disabled-button).
6. **Description** — the organizer's long copy, clamped with « Lire la suite ».
7. **Organizer** — name only. `EventDto` carries the organizer's `firstName` / `lastName` /
   `displayName`, so the name is free. **A public organizer profile is not possible in V1:**
   `GET /events/organizer/:organizerId` is guarded by `@Roles('ORGANIZER', 'ADMIN')`
   (`events.controller.ts:406`), so "see their other events" cannot be built for a logged-out
   visitor. Design the block as a name and nothing more, and do not leave a link stub.
8. **Share** — native share sheet on mobile, copy-link on desktop.

**The sticky purchase bar** is present from the moment the user scrolls past the price block:
lowest price on the left, « Choisir mes billets » on the right, `shadow-sticky` pointing upward, and
it respects the iOS safe area. It is the product's most important single control.

**If `EventStatus.CANCELLED`:** a full-width `danger` banner sits above the poster, the purchase bar
is replaced by non-interactive text, and the imagery desaturates. Existing ticket-holders see a
link to their ticket and to refund information.

---

### F.3 Ticket selection

Opens as a **bottom sheet** (Headless UI `Dialog`, `radius-xl`, focus-trapped, dismissible by swipe
and by <kbd>Esc</kbd>) so the event never leaves the screen behind it.

- **One ticket type at a time is selected.** This matches the reservation contract, which takes a
  single `ticketTypeId` per call, and it keeps the mental model simple. The order API does accept
  multiple item lines, so multi-tier baskets remain possible later without redesign — but V1 ships
  the single-tier flow.
- **Quantity** uses a large stepper (`radius-full`, 44 px targets, `tabular-nums`). It is bounded by
  three limits, and **the binding one is always named on screen**:
  - remaining availability for the tier,
  - **10 holders** maximum per reservation (`@ArrayMaxSize(10)`),
  - **10 tickets per event per user** (`maxTicketsPerEvent`) — which the user may already have
    partially consumed, so this limit can bind unexpectedly and must be explained if it does.
- **The breakdown appears immediately** at quantity ≥ 1, per [E.3](#e3--disclose-the-service-fee-the-instant-a-quantity-exists--never-at-the-payment-step), marked as an estimate until the order exists.
- **Holder details.** The API requires a `name` and `email` per ticket plus an optional `phone`, and
  a separate order-level `holder` (`firstName`, `lastName`, `email`) described in the DTO as contact
  info for the Tunisian gateways. The UI therefore asks for the buyer's details once, **pre-fills
  ticket 1 from the buyer's profile**, and collapses tickets 2..n behind « Les billets sont à mon
  nom » — checked by default. Only a user who unchecks it fills in per-ticket names. This is the
  single biggest friction reduction available in the flow, since most purchases are 1–2 tickets.
- **The primary action** reads « Continuer · 106,000 DT ». **The total is always in the button
  label** — the user should never have to look away from their thumb to know what they are agreeing
  to.

---

### F.4 Reservation and order creation

**One call, not two.** `POST /orders` validates the event and every tier, applies the fraud limits,
creates the order **and reserves the tickets internally** through the Tickets module
(`create-order.handler.ts`, step 5). The frontend therefore **does not call `POST /tickets/reserve`
itself** in the participant flow — doing so would create a second, orphaned hold. This is a decision
locked in [§M](#m-design-decisions-locked-for-next-phase).

The response gives the UI everything the checkout needs: `id`, `status: PENDING`, `items[]` with
`ticketTypeName`, `unitPrice` and `lineTotal`, plus `subtotal`, `platformFee`, `total`, `currency`
and — critically — **`expiresAt`**, which becomes the countdown's single source of truth.

**Authentication happens here**, and only here, for a logged-out user: the sheet's selection is
persisted, the user signs in or registers, and returns to the sheet exactly as they left it.

**Failure at this step is not generic** — each backend error type gets its own recovery, detailed in
[§G.2](#g2-http-and-business-error-mapping). `RATE_LIMITED` is the notable one: it arrives as a
**403**, not a 429, and means "you have placed 5 orders in the last hour" — which must be said in
those words, not as "accès refusé".

---

### F.5 Payment

`POST /orders/:id/pay` with `{ paymentMethod, idempotencyKey }`.

**Provider selection** is an explicit, named choice — three large radio cards, never a dropdown:

| Provider | Presented as | Mechanism |
|---|---|---|
| **Konnect** | « Carte bancaire tunisienne · e-DINAR » | Returns `paymentUrl` → full-page redirect |
| **Paymee** | « Carte bancaire tunisienne » | Returns `paymentUrl` → full-page redirect |
| **Stripe** | « Carte internationale (Visa / Mastercard) » | Returns `clientSecret` → in-page confirmation |

Local providers are listed **first**, with the last-used provider pre-selected for returning users.
Each card carries the provider's name and a one-line description of what card it accepts —
recognition of the payment brand is a primary trust signal in this market.

**The two mechanisms are different UX problems and must be designed as such:**

- **Redirect providers.** The user leaves Tickr. Before that happens, an explicit line states it:
  « Vous allez être redirigé vers Konnect pour payer en toute sécurité. Vous reviendrez
  automatiquement. » The order ID is persisted before navigating, so the return is recoverable even
  if the browser drops session state. The return URL lands on a dedicated
  `/checkout/[orderId]/retour` route which **never assumes an outcome from URL parameters** — it
  reads the authoritative status from `GET /orders/:id`.
- **Stripe.** Confirmation happens in-page. The countdown stays visible throughout.

**Idempotency is a design requirement, not just a backend feature.** The client generates one UUID
per payment attempt, keeps it for the lifetime of that attempt, and reuses it on retry — so a
double-tap or a flaky-network retry cannot double-charge. Combined with the mandatory button
loading state from [D.5](#d5-buttons), this is the product's double-charge defence.

---

### F.6 Confirmation

**The hardest state in the product is the honest one: `PROCESSING`.** Confirmation is webhook-driven
(`POST /payments/webhooks/{stripe,paymee}`, `GET /payments/webhooks/konnect`), so when the user
returns from the gateway the order may legitimately still be `PENDING` or `PROCESSING` for several
seconds.

**The rule: never guess.** The return screen polls `GET /orders/:id` — via TanStack Query with a
short interval that backs off, and a hard ceiling of roughly 60 seconds — and shows a calm, explicit
waiting state throughout: « Nous confirmons votre paiement… Ne fermez pas cette page. » A spinner
alone is not acceptable here; the user needs to know that waiting is expected.

The terminal states are read from `OrderStatus` and nothing else:

| Status | Screen |
|---|---|
| `PAID` | Success — see below |
| `FAILED` | Payment failure with recovery ([§G](#g-error-and-edge-case-ux)) |
| `PENDING` / `PROCESSING` past the ceiling | **Not a failure.** « Votre paiement est en cours de vérification. Vous recevrez un email dès confirmation. » with the order reference and a link to `/mes-commandes`. Under no circumstances is this presented as an error, and under no circumstances is a retry offered here — that is how double payments happen. |

**The success screen** is the product's best moment and should feel like one — but its job is
informational: confirmation of the amount paid, the order reference, the event with its date and
venue, a note that a confirmation email is on its way (`ORDER_CONFIRMATION` / `TICKET_CONFIRMED`
notifications are **email/SMS**, so the copy says "email", never "notification"), and one dominant
primary action: **« Voir mes billets »**.

---

### F.7 The ticket

`GET /tickets`, `GET /tickets/:id`, `GET /tickets/:id/pdf`.

The ticket is designed as **a physical object**, on a dark `ink-950` pass with `radius-xl`, a
perforation notch, and the event's poster as a muted header. It is the one place in the product
where a dark surface is used for delight rather than utility.

**Design requirements, all driven by the venue-door context:**

1. **One tap from the app's home surface** to the QR — via a persistent "Mes billets" entry and, for
   an event happening today, a card promoted to the top of the home screen.
2. **The QR is the largest element**, rendered on pure white with a generous quiet zone regardless
   of the surrounding dark surface, at a minimum of 240 px.
3. **Brightness.** Opening a ticket raises screen brightness where the browser permits, and always
   offers an explicit « Augmenter la luminosité » full-screen mode.
4. **Offline resilience.** The confirmed ticket's QR payload is cached so it renders without a
   network connection. Venue basements have no signal; a ticket that requires connectivity at the
   door is a broken product. The PDF download is offered as an explicit secondary backup.
5. **Status is unmistakable.** `CONFIRMED` shows a live QR. `CHECKED_IN` visually "spends" the
   ticket — dimmed QR, a success stamp and the check-in timestamp — so a re-presented ticket is
   obvious to both the holder and the door staff. `EXPIRED` and `CANCELLED` hide the QR entirely and
   explain why.
6. **Holder name is prominent** on the pass, because for multi-ticket orders the door needs to know
   which pass belongs to whom.

---

## G. Error and edge-case UX

### G.0 The three shapes of failure

Every failure in Tickr is rendered in exactly one of three shapes. Choosing the right one is not a
stylistic decision — it is determined by **whether money or a ticket is at stake**.

| Shape | When | Behaviour |
|---|---|---|
| **Toast** | Non-blocking, no money involved, fully recoverable — a failed filter fetch, a copy-to-clipboard | Auto-dismisses at 5 s, `aria-live="polite"`, never the sole handling of a purchase failure |
| **Inline** | Scoped to one control or one block — a field validation error, one tier gone | Rendered next to the thing that failed, does not move the page |
| **Blocking state** | **Anything touching money, tickets or an expired hold** | Owns the viewport or the sheet, cannot be dismissed by accident, carries exactly one primary recovery action |

**The rule:** if a user could be left wondering whether they were charged, it is a **blocking
state**. Never a toast.

### G.1 Loading, skeletons and empty states

**Loading.** Skeletons everywhere, never spinners, for content that has a known shape — a skeleton
that matches the real layout keeps CLS at zero and makes a 3G connection feel deliberate rather than
broken. Spinners are reserved for actions inside buttons. Any load exceeding ~5 s adds a line of
reassuring copy; TanStack Query's cached data is shown immediately with a subtle refresh indicator
rather than being replaced by a skeleton on refetch.

**Empty states** are never a bare sentence. Each has an illustration or category glyph, a plain
explanation, and an action that resolves it:

| Empty state | Copy direction | Primary action |
|---|---|---|
| **No search results** | « Aucun événement pour "jazz" à Sfax en septembre » — echo back the *actual* filters | « Effacer les filtres » + show what the widest matching lens would return |
| **No events in a category** | « Rien de prévu en Théâtre pour l'instant » | « Voir tous les événements » |
| **No tickets yet** (participant) | « Vous n'avez pas encore de billets » | « Découvrir des événements » |
| **No orders** | Same treatment as tickets | « Découvrir des événements » |
| **Organizer dashboard, no events** | A genuine first-run experience, not an error — explain what publishing does | « Créer mon premier événement » |
| **Organizer event, no sales** | « Aucune vente pour l'instant » + the shareable event link, prominently | « Copier le lien de l'événement » |
| **No notifications** | « Aucune notification » — the calmest state in the product, no illustration needed | none |

The two organizer empty states matter disproportionately: they are the moment an organizer decides
whether Tickr is worth their time.

### G.2 HTTP and business-error mapping

The backend returns a consistent envelope — `{ statusCode, message, error, timestamp, path }`
(`shared/infrastructure/common/filters/http-exception.filter.ts`). The frontend maps **status plus
context** to a designed state. The raw `message` is never rendered directly to a user.

| Code | Real backend cause | User-facing treatment | Recovery |
|---|---|---|---|
| **400** | `EVENT_NOT_PUBLISHED`, `INSUFFICIENT_AVAILABILITY`, `VALIDATION_ERROR`, `ORDER_EXPIRED`, `INVALID_STATUS`, `MAX_ATTEMPTS_EXCEEDED`, `GATEWAY_ERROR` | **Never one generic message.** Disambiguated by context and mapped to the specific states below | Varies — see rows |
| **401** | Access token expired or absent | **Silent refresh first.** Attempt `POST /auth/refresh-token`, replay the original request once, and only then show a session-expired state | Re-authenticate and return to the exact page — selection and checkout state preserved |
| **403** | Insufficient role **or `RATE_LIMITED` on order creation** | ⚠️ **These are two entirely different situations behind one status.** Role → « Cette page est réservée aux organisateurs ». Rate-limit → « Vous avez atteint la limite de 5 commandes par heure » | Role → go to the appropriate home. Rate limit → state when they can retry |
| **404** | Event, ticket type, order or ticket not found | A designed 404 with the search entry point, not a bare page. For a **deleted or unpublished event**, say so rather than implying a broken link | « Découvrir des événements » |
| **409 / sold out** | See the note below — currently surfaces as **400 `INSUFFICIENT_AVAILABILITY`** with the true remaining count in the message | Blocking sheet state: « Il ne reste que 2 billets Standard » with the quantity **auto-adjusted** to what is actually available | « Continuer avec 2 billets » as primary; other tiers offered as secondary |
| **429** | Throttler — 3 req/s and 20 req/10 s | « Trop de tentatives. Réessayez dans quelques instants. » Disable the action and re-enable it on a visible timer | Automatic retry with exponential back-off for GETs; a manual, timed retry for anything that mutates |
| **5xx / network** | Server or connectivity failure | « Connexion perdue » — and **if the failure happened during payment, explicitly state that the order status is unknown and must be checked, never that it failed** | « Réessayer », plus a link to `/mes-commandes` |

> **⚠️ Contract gap to resolve with the backend — flagged, not designed around.**
> The specification for this phase anticipated **409** for sold-out and business conflicts, but the
> V1 implementation maps `INSUFFICIENT_AVAILABILITY` to **400** (`tickets.controller.ts`,
> `orders.controller.ts`) and `RATE_LIMITED` to **403**. That means the frontend currently cannot
> distinguish "sold out" from "bad input" without parsing a French/English message string, which is
> brittle and untranslatable.
> **Recommendation:** add a stable machine-readable `code` field to the error envelope, carrying the
> existing domain error types (`INSUFFICIENT_AVAILABILITY`, `RATE_LIMITED`, `ORDER_EXPIRED`,
> `MAX_ATTEMPTS_EXCEEDED`, …) which the handlers already produce internally. Until that exists, the
> frontend keys off status + endpoint context and treats message parsing as a temporary shim,
> isolated in a single `mapApiError()` module so there is exactly one place to fix. See [§L](#l-open-contract-questions-for-the-backend).

### G.3 The money-critical states, in detail

These five states are the product. They get designed screens, not generic error components.

---

**① Payment failure** — `OrderStatus.FAILED`, or a `GATEWAY_ERROR` from `POST /orders/:id/pay`

> **Le paiement n'a pas abouti**
> Votre banque a refusé la transaction. **Aucun montant n'a été débité.**
> Vos billets restent réservés pendant **6:12**.
> **[ Réessayer le paiement ]** · Choisir un autre moyen de paiement

The non-negotiable elements: the explicit **"nothing was charged"** statement; the **countdown
still running**, since the reservation usually survives a failed attempt; and **a different provider
offered as the secondary action** — a Konnect failure is very often solved by trying Paymee, and the
three-provider architecture is only valuable if the UI actually uses it at the moment of failure.

`MAX_ATTEMPTS_EXCEEDED` is a distinct case: retrying is no longer possible, so the state must say so
and route to `/mes-commandes` rather than offering a button that will fail.

---

**② Reservation / order expiry** — countdown reaches zero, or `ORDER_EXPIRED` on payment

> **Votre réservation a expiré**
> Les billets ont été remis en vente. **Aucun montant n'a été débité.**
> **[ Reprendre ma sélection ]** · Retour à l'événement

Requirements: the user's **selection is preserved** so rebuilding is one tap; the expiry never
navigates silently; and re-reserving is a fresh `POST /orders`, which may legitimately now fail on
availability — a case that must be handled rather than assumed away.

---

**③ Sold out during checkout** — availability lost between selection and order

Rendered in the sheet, without losing context. The message states the *true* remaining count from
the API, the quantity stepper **auto-adjusts to what is available**, and other tiers with stock are
offered inline.

If nothing remains at all, the state does two things rather than one. It offers
**« Vérifier à nouveau »**, because a lapsed 15-minute hold genuinely can return stock (see
[E.2](#e2--availability-is-stated-in-words-and-numbers-never-implied-by-a-disabled-button)) — and
it turns the dead end into a discovery moment: **« Complet — voici d'autres événements à Tunis »**
over a grid pulled from `GET /events/search` filtered by the same `city` and `category`. That
recovery costs one existing endpoint call and converts the product's worst state into its second-best.

---

**④ Cancelled event** — `EventStatus.CANCELLED`

Two different audiences, two different treatments:
- **A browser** sees a `danger` banner on the event page, a disabled purchase bar, and no path to buy.
- **A ticket-holder** sees a banner on their ticket and in `/mes-billets` stating the event is
  cancelled and what happens next regarding their money. The `EVENT_CANCELLED` notification type
  exists, so this is also an email — and the on-screen copy must match what the email says.

---

**⑤ Refund** — `POST /orders/:id/refund`, `OrderStatus.REFUNDED`, `RefundStatus`

The design-critical fact: **the platform commission is not refunded.** The backend computes the
refund as `subtotal + paymentFees` (`request-refund.handler.ts:56`). A user who paid 106,000 DT for
two 50 DT tickets receives 100,000 DT back.

This *must* be stated **before** a refund is requested, not discovered afterwards, with the exact
arithmetic:

```
Montant payé                              106,000 DT
Frais de service (non remboursables)       −6,000 DT
─────────────────────────────────────────────────────
Montant remboursé                         100,000 DT
```

`RefundStatus.PENDING` shows a neutral in-progress state with an expected timeframe;
`FAILED` shows a support contact path, never a retry button, because gateway refunds are not
safely client-retryable.

### G.4 Remaining edge cases

| Case | Treatment |
|---|---|
| **Session expiry mid-checkout** | Silent token refresh; if it fails, a re-auth sheet **over** the checkout that returns to the exact step — never a redirect that loses the order |
| **User returns to a completed order** | `/checkout/[orderId]` on a `PAID` order redirects to the ticket, never re-offers payment |
| **Back button after payment** | The payment step is replaced in history, not pushed, so Back cannot re-trigger a charge |
| **Double-tap on pay** | Button loading state + reused `idempotencyKey` |
| **Event starts during checkout** | Order creation fails on `EVENT_NOT_PUBLISHED` / status change; the state explains it plainly |
| **Offline** | A persistent offline banner; cached tickets and QRs remain readable; mutating actions are disabled with an explanation rather than failing on tap |
| **Slow 3G** | Skeletons with reserved aspect-ratio boxes; images lazy except the hero; no layout shift on arrival |
| **Organizer views their own unpublished event** | Full preview plus a persistent « Brouillon — invisible par le public » bar, with publish as the primary action |

---

## H. Accessibility

**Target: WCAG 2.1 Level AA**, treated as a build requirement rather than an audit item. The
following are the concrete, checkable obligations.

### H.1 Colour and contrast

Every foreground/background pair in [§D.2](#d2-colour) has been **numerically validated** — the
ratios in those tables are computed, not estimated. The resulting rules:

- **Body and interactive text ≥ 4.5 : 1.** Large text (≥ 24 px, or ≥ 19 px bold) ≥ 3 : 1.
- **Non-text contrast ≥ 3 : 1** (WCAG 1.4.11) for every control boundary, focus indicator, icon that
  carries meaning, and chart element. This is why `border-strong` (`#7F848F`, 3.75 : 1) exists and
  why `border` (`#E5E3DD`, 1.28 : 1) may never bound an input.
- **`ink-400` is never text on a light surface** (2.54 : 1). **`ink-500` is never text on
  `surface-2`** (4.21 : 1). Both are easy to do by accident and both fail AA.
- **Colour is never the sole carrier of meaning.** Every status pairs a colour with a label and an
  icon — availability, order status, ticket status, form errors. This is checked by viewing any
  screen in greyscale: it must remain fully comprehensible.
- **Text over imagery** always sits on the defined scrim from [§D.8](#d8-image-treatment); contrast
  is never left to the uploaded image.

### H.2 Keyboard navigation

- **Every interactive element is reachable and operable by keyboard**, in a logical DOM order that
  matches the visual order. No positive `tabindex`, ever.
- **Headless UI is the default** for every overlay — `Dialog`, `Popover`, `Listbox`, `Menu`,
  `Disclosure` — precisely because it brings focus trapping, `Esc` handling, and roving tabindex
  correctly. Bespoke overlays are not permitted.
- **Focus is managed on navigation:** opening the ticket sheet moves focus into it; closing returns
  focus to the trigger; a route change moves focus to the page's `h1`.
- **A skip link** (« Aller au contenu principal ») is the first focusable element on every page.
- **The card pattern**: one link wrapping the card, so a grid of 20 events is 20 tab stops, not 60.
- **The quantity stepper** responds to arrow keys as well as its buttons.
- **Custom keyboard traps are forbidden**; the countdown never steals focus.

### H.3 Focus-visible states

- Focus uses **`:focus-visible`, never `:focus`** — so pointer users do not see rings on click while
  keyboard users always do.
- The indicator is a **3 px `cobalt-600` ring with a 2 px offset in the surrounding surface colour**,
  which guarantees the 3 : 1 non-text minimum on both `canvas` and `surface`.
- **On dark surfaces** (ticket pass, scanner) the ring switches to **`sun-400`** (13.25 : 1 on
  `ink-950`) with an `ink-950` offset. Two tokens — `--ring` and `--ring-offset` — make this a
  surface-level swap rather than a per-component decision.
- `outline: none` without a replacement indicator is a **build-breaking** rule, enforced by lint.
- The ring is never clipped by `overflow: hidden` — a common failure in card and carousel layouts.

### H.4 Forms

- Every input has a **persistent visible `<label>`** programmatically associated. Placeholders are
  never labels.
- Errors use `aria-invalid="true"` and `aria-describedby` pointing at the message; the message is
  text plus icon plus colour, never colour alone.
- On submit failure, **focus moves to the first invalid field** and an `aria-live="assertive"`
  summary announces the count.
- Validation runs on **blur**, not on every keystroke — mid-typing errors are hostile, especially on
  a phone keyboard.
- Autocomplete attributes are set correctly (`email`, `given-name`, `family-name`, `tel`,
  `cc-number` where applicable) — a major real-world speed win on mobile.
- Input `font-size` is **≥ 16 px** to prevent iOS zoom-on-focus, which otherwise breaks the layout
  mid-checkout.
- The correct `inputmode` is set for numeric fields.

### H.5 Buttons and controls

- A real `<button>` or `<a>` is used for anything interactive — never a `div` with a click handler.
- **`<button>` for actions, `<a>` for navigation**, decided by whether the URL changes.
- Icon-only controls carry an `aria-label`; their icons are `aria-hidden`.
- Loading buttons set `aria-busy="true"` and announce completion politely.
- Disabled controls use `aria-disabled` and remain focusable so a keyboard user can discover *why*
  they are disabled — a genuinely important detail on sold-out tiers.
- Toggle controls expose `aria-pressed` or `aria-expanded` as appropriate.

### H.6 Screen-reader semantics

- **One `<h1>` per page**, and a heading hierarchy with no skipped levels.
- Correct landmarks: `<header>`, `<nav>`, `<main>`, `<footer>`, with `aria-label` on repeated
  landmarks.
- **The event card's accessible name is the event title**, not "Lire la suite".
- **Prices are announced fully.** `53,000 DT` must not be read as "cinquante-trois virgule zéro
  zéro zéro" — the visible tabular text is accompanied by a `<span class="sr-only">` reading
  « 53 dinars » so the announcement is human. This matters most on the order total.
- **The countdown** uses `aria-live="polite"` and announces **only at the 5-minute and 1-minute
  thresholds** — a per-second live region is unusable.
- **Status changes** — order paid, payment failed, tickets reserved — are announced via a live
  region, not left as a silent visual change.
- **The QR code** carries an accessible description including the ticket reference, so a
  screen-reader user can confirm they have opened the right ticket.
- Decorative images have empty `alt`; event posters use the event title as `alt`.

### H.7 Touch targets

- **Minimum 44 × 44 px** for every interactive element (WCAG 2.5.5 AAA — adopted as a baseline here
  because the product is thumb-first), with a **minimum 8 px gap** between adjacent targets.
- Primary CTAs are **48 px** tall.
- The tap area may exceed the visual bounds via padding — a small visual chip can still have a
  44 px target.
- **The bottom 88 px of the mobile viewport is reserved** for the primary action and respects
  `env(safe-area-inset-bottom)`.
- Destructive actions are never adjacent to primary ones.

### H.8 Motion

- **`prefers-reduced-motion: reduce` is honoured globally**, not per component: transforms and
  parallax are removed, transitions collapse to opacity at ≤ 100 ms, carousels stop auto-advancing,
  and the countdown's pulse is **removed entirely while the countdown itself keeps working**.
- No animation loops indefinitely except deliberate loading indicators.
- No auto-playing video or carousel with motion beyond a gentle fade.
- Nothing flashes more than three times per second.
- Motion never carries information on its own.

---

## I. Responsive strategy

### I.1 Mobile is the design target, not the fallback

Design starts at **390 × 844** (the realistic modern default) and is verified at **360 px**, which
remains extremely common on mid-range Android in Tunisia. Tablet and desktop are **expansions of a
mobile design**, never compressions of a desktop one. A layout that only works by hiding things
below `md` has failed.

The practical test: **if a feature is worth showing on desktop, it is worth designing a mobile
place for it.** Nothing is desktop-only except admin data tables and the event-creation form's
side-by-side preview.

### I.2 Breakpoints

Tailwind's defaults, unmodified — inventing custom breakpoints creates drift with no benefit:

| Token | Min width | Primary target |
|---|---|---|
| *(base)* | 0 | **Phone — the design target.** Single column |
| `sm` | 640 px | Large phones, small tablets portrait — 2-column grids appear |
| `md` | 768 px | Tablet portrait — sidebar layouts become possible |
| `lg` | 1024 px | Tablet landscape / small laptop — **the desktop layout begins here** |
| `xl` | 1280 px | Desktop — max content width caps at 1280 px |
| `2xl` | 1536 px | Large desktop — content stays capped, gutters grow |

Content is capped at **1280 px** with a centred container; text measure never exceeds **~72
characters**, which on the event description means a max-width column rather than a full-bleed
paragraph.

### I.3 Mobile (base → `sm`)

- **Single column throughout.** Gutter `space-4` (16 px).
- **Bottom-anchored primary actions.** The sticky purchase bar and the checkout CTA live in the
  thumb zone, above `env(safe-area-inset-bottom)`.
- **Bottom sheets instead of modals** for ticket selection, filters and provider choice — reachable,
  dismissible by swipe, and native-feeling.
- **Horizontal rails** for discovery, with snap points and momentum; each rail has a visible « Tout
  voir » link so its content is also reachable as a full page (rails alone are not accessible
  navigation).
- **Bottom tab navigation**: Découvrir · Recherche · Mes billets · Compte. Four items, never five.
- **The event hero is 4 : 5 portrait** — portrait is the aspect organizers actually produce.
- Filters open as a full-height sheet with the result count live on the apply button
  (« Voir 24 événements »).
- Tables never appear on mobile; they become stacked cards.

### I.4 Tablet (`md` → `lg`)

Explicitly designed, not left to reflow:

- **Two-column event grids**; three at the upper end.
- Bottom sheets become **centred modals** at `md`.
- Bottom tabs are replaced by a **top navigation bar**.
- The event page moves to a **two-column layout at `lg`**: content left, a **sticky ticket-selection
  panel right** — which replaces the sticky bottom bar.
- The organizer dashboard becomes genuinely usable here, with side-by-side metric cards.

### I.5 Desktop (`lg` →)

- **Three- to four-column event grids**, capped at 1280 px.
- The event page's **right rail holds the entire ticket-selection and summary flow** — on desktop
  the purchase never leaves the event page until payment.
- Hover states become meaningful (card lift, image scale ≤ 1.02); they are additive only and never
  the sole affordance.
- The organizer console gains a persistent left navigation and **real data tables** at 40 px rows —
  the one place density increases.
- Keyboard shortcuts are offered for organizer-heavy screens, and are discoverable rather than
  hidden.

### I.6 Cross-cutting rules

- **Fluid type only where it earns it.** `display-xl` and `display-l` use `clamp()`; everything else
  steps at breakpoints. Fluid body text produces awkward intermediate sizes.
- **Images are always responsive** via `next/image` `sizes`, matching the real grid at each
  breakpoint so a phone never downloads a desktop-sized poster.
- **No horizontal page scroll at any width** — wide content (tables, timelines, rails) scrolls
  inside its own container.
- **Layout is tested at 360 px, 390 px, 768 px, 1024 px and 1440 px**, and at **200 % browser zoom**
  at 1280 px, which WCAG 1.4.10 effectively requires.

---

## J. Competitive inspiration

Five products were examined against their live sites, app-store listings, help-centre fee and
ticketing pages, and published design case studies. Each is assigned **one distinct territory**, so
the five takeaways do not collapse into "show the price and use nice photos" — they cover discovery
controls, curation model, event-page structure, price honesty, and the checkout surface respectively.

### J.1 Summary — one actionable takeaway each

| Competitor | What they do well | Actionable takeaway for Tickr |
|---|---|---|
| **Meetup** | Filter chips display their **current value**, not the field name — "Any day", "Within 18 miles" — and cards carry a seats-left count | Label every Tickr filter chip with its applied value (« Tunis », « Ce week-end », « Jusqu'à 50 DT ») instead of its field name, and print `ticketSummary.totalAvailable` as « Il reste 7 billets » on the discovery card itself |
| **Fever** | City is chosen **first** and scopes everything; the feed is then named editorial rails, so there is never a blank state or a lonely search box | Make city a persistent header control that scopes all of `/events`, and build the home feed from named editorial rails driven by real filters (« Ce week-end à Tunis », « Nouveautés », « Les plus demandés » via `sortBy=soldTickets`) — curation Tickr can ship with zero recommendation engine |
| **Eventbrite** | The event page has an **invariant section order**, so a returning buyer knows where to look, and the hold timer is an accepted norm rather than a surprise | Freeze Tickr's `/events/[id]` section order as a contract — hero → title → date/time → venue → price entry → ticket tiers → description → organizer → related — and never let a screen reorder it for a "special" event |
| **DICE** | "The price you'll pay. No surprises later." — plus the hold stated **twice**, relative *and* absolute, and tickets cached for offline use at the door | State Tickr's 15-minute hold in both forms, exactly as DICE does — « Il reste 12:34 » **and** « Vos billets sont gardés jusqu'à 21:45 » — because an absolute time is the only form that survives a Konnect redirect and a backgrounded browser |
| **Shotgun** | Checkout **drops the app's dark chrome entirely** for a stripped white surface: wordmark, bare mm:ss counter, no nav, no exits | Strip `/checkout/[orderId]` to a dedicated surface — Tickr wordmark instead of navigation, the countdown, the money block, the provider radios, nothing else — so the one screen handling money has no competing affordance |

### J.2 Per competitor

**Meetup** — *territory: discovery controls that state their own state.*
Meetup's discovery is unglamorous and unusually honest: four filter chips that read « Any day »,
« Any size », « Any type », « Within 18 miles » tell the user the *current* state of the filter
rather than naming an abstract field, and event cards carry a live "7 seats left" line plus a
"Waitlist" badge before the tap. Its 2025 rebrand explicitly fixed CTAs that "blended into the
background". **Tickr should learn** both moves directly: value-labelled chips, and per-card
availability drawn from `ticketSummary.totalAvailable` and `isSoldOut` — data the list endpoint
already returns, so this costs nothing in requests. **Tickr should do differently** by not adopting
Meetup's group/RSVP model at all — Tickr has no groups, no recurring communities and no waitlist
endpoint, and its unit of value is a paid ticket, not a membership. Meetup also publishes no service
fee percentage in its help centre; Tickr's whole position is the opposite.

**Fever** — *territory: curation as a substitute for personalisation.*
Fever opens on "Find your city" and lets that choice scope the entire product, then presents a stack
of named editorial rails — "Top 10 in New York", "Fever Originals" — so a user is never confronted
with an empty search field. Its cards are ruthlessly minimal: image, rating, venue, title, date
range, "From $XX". Its fee is a separate additive string beside the price — "$40.00 + $3.20 booking
fee" — which is structurally exactly Tickr's situation. **Tickr should learn** the city-first scoping
and the named-rail model, which delivers a curated feel with nothing more than the `city`,
`dateFrom`/`dateTo` and `sortBy` parameters the API already exposes — this is how Tickr looks
curated on day one without a recommendation engine. **Tickr should do differently** on the app wall:
Fever makes tickets retrievable only in-app, which reviewers resent. Tickr is a web product and its
QR must work in a mobile browser, offline, with no install prompt. Tickr also has no ratings or
reviews, so the rating number that anchors every Fever card is simply absent — the card design must
not leave a hole where it would sit.

**Eventbrite** — *territory: structural predictability.*
Eventbrite's strength is boring in the best way: every event page runs the same top-to-bottom order —
hero, title, organizer badge, date/time, location, Get tickets, description, tiers, "Good to Know"
with the posted refund policy, map, organizer, related events. Its tier rows pair a name with a
one-line description of what the tier includes, its quantity control is a 1–10 enumeration that
communicates the per-order cap by existing, and its checkout carries a ~20-minute inventory hold that
buyers have simply learned to accept. Fees are shown as separate line items rather than folded in.
**Tickr should learn** the invariant section order and the habit of publishing the refund policy on
the event page — given that Tickr's commission is non-refundable, that block is doing real work.
The 1–10 quantity enumeration is also a neat expression of Tickr's own 10-ticket cap.
**Tickr should do differently** by refusing Eventbrite's accumulated density: the "Absorb fees"
checkbox, custom organizer questions and BNPL options are the kind of accretion that made
Eventbrite's checkout long. Tickr's checkout asks four things and stops.

**DICE** — *territory: price honesty and the ticket as a physical, offline object.*
DICE puts "The price you'll pay. No surprises later." directly on the event page under the price,
folds its booking fee into the face price, and shows an order summary with no fee line at all.
Its hold is stated twice — « %d min left » alongside "We'll hold them until {{time}} on {{date}}" —
and mid-flow price movement gets dedicated copy rather than a silent change. Its ticket is white on
black with the type name, an "N OF M" mono counter, a large centred QR and the holder's name beneath;
tickets are cached for offline use after first view, and door staff are instructed to max screen
brightness. **Tickr should learn** the dual-form countdown and the entire offline-ticket posture —
both are already locked into [E.4](#e4--the-15-minute-hold-is-a-visible-explained-contract-with-a-way-out) and [F.7](#f7-the-ticket), and DICE is the proof they matter.
**Tickr should do differently on the fee, deliberately.** DICE can fold its fee into the face price
because it controls the price shown everywhere. Tickr cannot: Tunisian organizers advertise the face
price on physical posters and Instagram flyers, so a card quoting 53 DT against a poster saying
50 DT would read as *Tickr adding a markup*, which is the opposite of the intended effect. Tickr
therefore takes **Fever's structure with DICE's discipline** — the face price in discovery, matching
the poster, and the complete arithmetic from the first moment a quantity exists, per
[E.3](#e3--disclose-the-service-fee-the-instant-a-quantity-exists--never-at-the-payment-step). If and when `GET /config/public` lands ([§L](#l-open-contract-questions-for-the-backend), gap 1), an
all-in « frais inclus » quote in discovery becomes possible and should be A/B tested against the
face-price form. Note also that DICE's waitlists, SMS on-sale reminders and resale have no backend
equivalent and must not be designed in.

**Shotgun** — *territory: the checkout as a separate, stripped trust surface.*
Shotgun is the closest cultural analogue to what Tickr wants to feel like: near-black surfaces, the
organizer's raw poster used **uncropped and unretouched** as both hero and card image, a date chip
laid over the poster so the date is readable before the title, heavy condensed uppercase headings,
and a coral accent reserved for dates and live status. Then at checkout it does something notable —
it **drops the dark app chrome entirely** for a white, focused surface carrying a bare "7:59"
counter and a thin gradient rule as the only progress indicator, with no nav and no exits.
**Tickr should learn** three things: the uncropped-poster policy (already locked in
[D.8](#d8-image-treatment) — the organizer's artwork is their identity), the date chip on the card,
and above all the stripped checkout surface. **Tickr should do differently** on payment presentation:
Shotgun collapses payment into a single "Apple Pay — Modify" row because its market has one dominant
method. Tickr's three providers are a genuine, meaningful choice for a Tunisian buyer — Konnect and
Paymee are recognised local brands and Stripe covers international cards — so Tickr expands where
Shotgun collapses, presenting three named radio cards. Shotgun's resale marketplace and follow graph
are also out of scope.

### J.3 Where Tickr wins

All five competitors are strong at the top of the funnel and progressively less local as you move
down it. None of them prices in TND, none settles through Konnect or Paymee, and none states a
commission rate a Tunisian buyer can check. Meetup publishes no fee percentage at all; DICE and
Shotgun hide the fee inside the price; Fever admits a second processing fee appears "at the final
step"; Eventbrite discloses honestly but inside a checkout that has grown long.

**Tickr's opening is the narrow, specific gap where local payment rails meet published arithmetic.**
It is the only product in this set that can say, in French, to a buyer paying with a Tunisian card:
*this ticket is 50 DT, our service fee is 6 %, that is 3 DT, you will pay 53 DT, and here is the
Konnect page where you pay it.* Combined with a QR that works offline at a venue door on a
mid-range Android phone and a web product with no app to install, that is a defensible position
that none of the five can reach into Tunisia to contest — and every design decision in this brief
is chosen to protect it.
---

## K. Design system foundations

These are the initial TailwindCSS 4 tokens implied by everything above. They are deliberately
**small**: every token listed has at least one named job in this document, and no token exists
merely to complete a scale. The ratios quoted have been computed, not estimated.

This replaces the placeholder `@theme` block currently in `frontend/src/app/globals.css`.

### K.1 Token definition — `globals.css`

```css
@import "tailwindcss";

@theme {
  /* ── Colour · brand ────────────────────────────────────────────────
     Cobalt is the ONLY action colour. Sun is accent/scarcity only —
     never a primary button, never an error.                          */
  --color-cobalt-700: #2430C9;   /* pressed          · white 8.97:1 AAA */
  --color-cobalt-600: #2E3DE8;   /* PRIMARY / focus  · white 7.12:1 AAA */
  --color-cobalt-500: #3B4DF5;   /* hover            · white 5.89:1 AA  */
  --color-cobalt-100: #E6E9FF;   /* selected tint    · 600 on it 5.92:1 */
  --color-cobalt-50:  #F0F2FF;   /* wash                                */

  --color-sun-400: #FFD23F;      /* accent/scarcity  · ink 13.25:1 AAA */
  --color-sun-500: #F5B80B;      /* weightier icon fill                */
  --color-sun-700: #8A5B00;      /* sun-family TEXT  · white 5.87:1 AA */

  /* ── Colour · warm neutrals ──────────────────────────────────────── */
  --color-canvas:    #F8F7F4;    /* page ground (warm paper)           */
  --color-surface:   #FFFFFF;    /* cards — lifts by value, not shadow */
  --color-surface-2: #F1EFEA;    /* inset: order summary, disabled     */

  --color-ink-950: #0B0F1A;      /* primary text     · white 19.13:1   */
  --color-ink-700: #374151;      /* body             · white 10.31:1   */
  --color-ink-500: #6B7280;      /* supporting       · white  4.83:1   */
  --color-ink-400: #9CA3AF;      /* ⚠ NON-TEXT on light (2.54:1)       */
  --color-ink-100: #E8E6E1;      /* text on dark     · ink-950 15.34:1 */

  --color-border:        #E5E3DD; /* decorative hairline only          */
  --color-border-strong: #7F848F; /* CONTROL boundaries · 3.75:1 ✓1.4.11 */

  /* ── Colour · semantic ──────────────────────────────────────────────
     -700 = text-safe · -600 = fill-safe (≥3:1) · -100 = callout tint  */
  --color-success-700: #047857;  --color-success-600: #059669;  --color-success-100: #D1FAE5;
  --color-warning-700: #B45309;  --color-warning-600: #D97706;  --color-warning-100: #FEF3C7;
  --color-danger-700:  #B91C1C;  --color-danger-600:  #DC2626;  --color-danger-100:  #FEE2E2;

  /* ── Typography ───────────────────────────────────────────────────── */
  --font-display: var(--font-archivo), ui-sans-serif, system-ui, sans-serif;
  --font-sans:    var(--font-inter),   ui-sans-serif, system-ui, sans-serif;

  --text-display-xl: 2.25rem;  --text-display-xl--line-height: 2.5rem;   /* 36/40 → clamp to 44 at lg */
  --text-display-l:  1.75rem;  --text-display-l--line-height:  2rem;     /* 28/32 */
  --text-h1:         1.375rem; --text-h1--line-height:         1.75rem;  /* 22/28 */
  --text-h2:         1.125rem; --text-h2--line-height:         1.5rem;   /* 18/24 */
  --text-body:       1rem;     --text-body--line-height:       1.5rem;   /* 16/24 — floor for reading */
  --text-body-sm:    0.875rem; --text-body-sm--line-height:    1.25rem;  /* 14/20 */
  --text-caption:    0.8125rem;--text-caption--line-height:    1.125rem; /* 13/18 — absolute floor */
  --text-overline:   0.75rem;  --text-overline--line-height:   1rem;     /* 12/16 uppercase +6%   */

  /* ── Spacing · 4px base ───────────────────────────────────────────── */
  --spacing: 0.25rem;          /* Tailwind 4 derives 1–16 from this     */

  /* ── Radius · posters are square, tickets are round ───────────────── */
  --radius-sm:   8px;          /* inputs, chips, badges                 */
  --radius-md:  12px;          /* buttons, compact cards                */
  --radius-lg:  16px;          /* cards, panels, summary block          */
  --radius-xl:  24px;          /* sheets, modals, ticket pass           */

  /* ── Elevation · warm-tinted, five levels only ────────────────────── */
  --shadow-sm: 0 1px 2px rgb(11 15 26 / .06), 0 2px 8px rgb(11 15 26 / .04);
  --shadow-md: 0 4px 12px rgb(11 15 26 / .08), 0 2px 4px rgb(11 15 26 / .04);
  --shadow-lg: 0 12px 32px rgb(11 15 26 / .14);
  --shadow-sticky: 0 -1px 0 var(--color-border), 0 -8px 24px rgb(11 15 26 / .08);

  /* ── Motion ───────────────────────────────────────────────────────── */
  --ease-standard: cubic-bezier(.2, 0, 0, 1);
  --ease-exit:     cubic-bezier(.4, 0, 1, 1);
}

/* Focus ring — surface-level swap, not a per-component decision */
:root                { --ring: var(--color-cobalt-600); --ring-offset: var(--color-canvas); }
.on-surface          { --ring-offset: var(--color-surface); }
.on-dark             { --ring: var(--color-sun-400);     --ring-offset: var(--color-ink-950); }

:where(a, button, input, select, textarea, [tabindex]):focus-visible {
  outline: 3px solid var(--ring);
  outline-offset: 2px;
  box-shadow: 0 0 0 2px var(--ring-offset);
}

/* Money and counts never jitter */
.tabular { font-variant-numeric: tabular-nums; }

/* Motion preference is honoured globally, not per component */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
    scroll-behavior: auto !important;
  }
}

body { background: var(--color-canvas); color: var(--color-ink-950); }
```

### K.2 Colour roles at a glance

| Role | Token | Never used for |
|---|---|---|
| Action / interactive identity | `cobalt-600` | Backgrounds, headers, decoration |
| Accent / scarcity / brand | `sun-400` | Primary buttons, errors, warnings |
| Page ground | `canvas` | Cards |
| Raised content | `surface` | Page background |
| Inset content | `surface-2` | Anything carrying `ink-500` text (4.21 : 1 ✗) |
| Primary text | `ink-950` | — |
| Body text | `ink-700` | — |
| Supporting text | `ink-500` | Text on `surface-2` |
| Disabled glyphs | `ink-400` | **Any text on a light surface** (2.54 : 1 ✗) |
| Decorative edges | `border` | Input / control boundaries (1.28 : 1 ✗) |
| Control boundaries | `border-strong` | — |

### K.3 Typography hierarchy

| Token | Family · weight | Job |
|---|---|---|
| `display-xl` | Archivo 700 | Event title, event-page hero |
| `display-l` | Archivo 700 | Page and section titles |
| `h1` | Archivo 600 | Card and sheet titles |
| `h2` | Inter 600 | Sub-sections, ticket-type names |
| `body` | Inter 400 | Default reading text |
| `body-sm` | Inter 400 | Metadata, helper text |
| `caption` | Inter 500 | Timestamps, fine print — floor size |
| `overline` | Inter 600 · uppercase | Category eyebrows, section labels |
| `.tabular` | modifier | **All money, counts and countdowns** |

Loaded via `next/font/google`, variable, `display: 'swap'`, Latin + Latin-Extended only.
**Budget: two families. Adding a third requires removing one.**

### K.4 Spacing scale

Derived from `--spacing: 4px`. Ten steps in active use, each with a job:

`space-1` 4 · `space-2` 8 · `space-3` 12 · **`space-4` 16 (default gap, mobile gutter)** ·
`space-5` 20 · `space-6` 24 (tablet gutter) · `space-8` 32 (desktop gutter) · `space-10` 40 ·
`space-12` 48 · `space-16` 64

### K.5 Radius, shadow, breakpoints

Radius: `sm` 8 · `md` 12 · `lg` 16 · `xl` 24 · `full` — plus `none` for full-bleed media.
Shadow: `none` (default) · `sm` (hover) · `md` (popover) · `lg` (sheet) · `sticky` (upward).
Breakpoints: Tailwind defaults, unmodified — `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280 · `2xl` 1536.
Content caps at 1280 px; text measure caps at ~72 characters.

### K.6 Motion principles

| Token | Duration | Use |
|---|---|---|
| `fast` | 120 ms | State changes — hover, press, chip toggle |
| `base` | 200 ms | Small surfaces entering and leaving |
| `slow` | 320 ms | Bottom sheets, modals, route transitions |

Easing: `--ease-standard` for entering and moving, `--ease-exit` for leaving. Four rules govern all
motion: it must communicate **spatial relationship or state change** (never decorate); nothing in
checkout animates beyond a fade; **nothing animates the price**; and `prefers-reduced-motion` is
honoured globally by the rule above, with the countdown's pulse removed while the countdown itself
keeps running.

### K.7 Component density

| Element | Mobile | Desktop |
|---|---|---|
| Primary CTA height | 48 px | 44 px |
| Standard control height | 44 px | 44 px |
| Input height | 48 px | 44 px |
| Minimum touch target | 44 × 44 px | 44 × 44 px |
| List row | 56–72 px | 56–72 px |
| Data table row | *(not used)* | 40 px — **the only density increase in the system** |
| Card padding | `space-4` | `space-6` |
| Page gutter | `space-4` | `space-8` |

Density is **comfortable and near-identical across breakpoints**. Controls do not shrink on desktop.

### K.8 The first components to build

Phase 2 should treat these as the system's primitives, in this order — they are the ones the
purchase path depends on:

1. `PriceDisplay` — TND formatting, millimes-only-when-non-zero, `tabular-nums`, `sr-only` spoken form
2. `OrderSummary` — the subtotal / fee / *conditional* payment-fee / total block, used unchanged on
   the sheet, the order screen and the confirmation
3. `ReservationCountdown` — driven by the server's `expiresAt`, three phases, threshold-only announcements
4. `TicketTypeRow` — name, description, price, and the four availability states
5. `EventCard` — poster, title, date, venue, entry price, scarcity badge; one link, one tab stop
6. `QuantityStepper` — 44 px targets, three named limits
7. `Button` — five variants, five states, mandatory loading state
8. `ErrorState` — the blocking-state shape: cause · money implication · one primary recovery
9. `EmptyState` — glyph, explanation, resolving action
10. `Field` — label above, `border-strong`, 16 px text, `aria-describedby` error wiring

---

## L. Open contract questions for the backend

These are gaps found while grounding this brief against the actual API. Gap 8 blocks the organizer
revenue UI; none of the others blocks Phase 2, but each one forces the frontend into a workaround
that should be removed rather than entrenched. They are listed in priority order.

| # | Gap | Impact on the design | Proposed resolution |
|---|---|---|---|
| **1** | **The commission rate is not exposed by any endpoint.** `PLATFORM_COMMISSION_RATE` is read only inside `create-order.handler.ts`; no `config` controller exists, although `docs/02-technique/05-configuration-management.md` specifies `GET /config/public` | [E.3](#e3--disclose-the-service-fee-the-instant-a-quantity-exists--never-at-the-payment-step) requires the fee to be shown *before* the order exists. The frontend must currently duplicate the rate in a build-time env var — which will silently lie to users the day ops changes it | **Implement the already-documented `GET /config/public`** returning at minimum `{ commissionRate, currency, reservationTtlMinutes }`. Cache it in React Query with a long stale time. This single endpoint removes the only known-drift compromise in the brief |
| **2** | **No machine-readable error code.** The envelope is `{ statusCode, message, error, timestamp, path }`; the rich domain error types (`INSUFFICIENT_AVAILABILITY`, `RATE_LIMITED`, `ORDER_EXPIRED`, `MAX_ATTEMPTS_EXCEEDED`, …) are discarded at the controller boundary | [G.2](#g2-http-and-business-error-mapping) needs to distinguish "sold out" from "bad input" — both are 400. The frontend must key off endpoint context and, in the worst case, parse a message string, which cannot be translated | **Add a stable `code` field** carrying the existing domain error type. Zero new logic — the handlers already produce these values |
| **3** | **Status codes do not match their semantics.** `INSUFFICIENT_AVAILABILITY` → 400 (expected 409); `RATE_LIMITED` → 403 (expected 429) | A 403 that means "you have ordered 5 times this hour" cannot be told apart from a genuine role failure, so the generic 403 handler would show the wrong message on a checkout screen | Return **409** for availability/business conflicts and **429** for rate limiting. Resolving #2 makes this lower-priority but not unnecessary |
| **4** | **`paymentFees` is exposed but never populated.** `OrderEntity.setPaymentFees()` exists and rewrites the total, but nothing calls it | The order summary must be built for a conditional fourth line that is always zero today — untestable against real data | Confirm the intent: either wire gateway fees in, or mark the field reserved. Either way the summary component stays conditional |
| **5** | **The QR payload contract is undefined for the client.** `QRCodeVO` exists on the ticket entity, but what the client receives — a string to render, or a pre-rendered image URL — is not settled | [F.7](#f7-the-ticket) requires **offline** QR rendering at the venue door. A server-rendered image URL makes that impossible | Return the **QR payload as a string** so the client renders it locally and can cache it. Keep the PDF as the separate backup path |
| **6** | **`PUSH` exists in `NotificationChannel` but is unsupported** (`isSupportedChannel` allows only EMAIL and SMS) | Notification-preference UI must not offer a channel that silently does nothing | Hide `PUSH` in V1. All copy says « email » or « SMS », never « notification » |
| **7** | **One image per event** (`POST /events/:id/image`) | No gallery is possible; the event page is designed around a single hero image, which is correct for V1 but should be a conscious choice | Confirm single-image is intended for V1 |
| **8** | **Organizer payout is undefined — and the docs contradict each other.** `04-modele-economique.md` shows the organizer netting 47 TND on a 50 TND ticket (a second 6 % on the organizer side, echoed by « payé par organisateur » in `docs/README.md`), while the same document's own breakdown does not add up (6.00 TND to the platform, then 3.00 + 1.58 beneath it). **No payout or organizer-side deduction exists in the code** | The organizer dashboard cannot show revenue, and the event-creation form cannot show « vous recevrez X » — the two numbers an organizer most wants. This is the single largest blocked area in the organizer experience | **Settle the model, then implement it.** Decide whether the platform takes 6 % from the buyer only (code today) or 6 % from each side (the economic model), correct the losing document, and expose a payout/earnings figure. Until then organizer surfaces show gross sales only |

**Also worth noting** — the frontend's current `src/lib/api/client.ts` hard-redirects to
`/auth/login` and clears the token on **any** 401, with no refresh attempt, even though
`POST /auth/refresh-token` exists. Under [G.2](#g2-http-and-business-error-mapping) that is a defect:
a token expiring mid-checkout would destroy the user's order context. The interceptor needs a
single-flight refresh-and-replay before it ever redirects. This is a Phase 3 implementation item,
recorded here because the UX rule depends on it.

---

## M. Design Decisions Locked For Next Phase

Phase 2 — Information Architecture — can build on all of the following without re-opening them.
Anything **not** on this list is still open.

### M.1 Product and scope

1. **Positioning:** discovery-led, trust-engineered, mobile-first event ticketing for Tunisia.
   Target: **poster to paid in under 90 seconds** for a returning user.
2. **Design weight: 70 % participant / 25 % organizer / 5 % admin.**
3. **Confirmed non-goals for V1** — do not design IA for them: recommendations/personalised feed,
   favourites, reviews or ratings, social graph, seat maps, promo codes, waitlists, resale market,
   multi-image galleries, push notifications, full app-wide dark theme.
4. **French-first (`fr-TN`)**, all strings externalised from day one; Arabic is a planned locale and
   the type stack already accommodates it.

### M.2 Visual language

5. **Governing idea: the poster is the product, the interface is the frame.** Colour enters a screen
   through imagery, not chrome.
6. **Primary `cobalt-600` `#2E3DE8`** is the sole action colour. **Accent `sun-400` `#FFD23F`** is
   scarcity, attention and brand only — never a primary button, never an error.
7. **Warm neutrals**: `canvas #F8F7F4`, `surface #FFFFFF`, `surface-2 #F1EFEA`, warm ink scale.
   Cards lift by value, not shadow.
8. **Three validated accessibility constraints** that the token set encodes:
   `ink-400` is never text on a light surface (2.54 : 1); `ink-500` is never text on `surface-2`
   (4.21 : 1); `border` never bounds a control — that is `border-strong` (3.75 : 1).
9. **Type: Archivo (display) + Inter (UI/body)**, two families, variable. Nine type steps.
   **All money uses `tabular-nums`.**
10. **TND formatting: millimes shown only when non-zero** (`50 DT`, `52,500 DT`), full three-decimal
    precision in totals and receipts, non-breaking space before `DT`.
11. **Radius:** posters square, tickets round — `sm` 8 / `md` 12 / `lg` 16 / `xl` 24 / `full`.
12. **Elevation:** five levels, warm-tinted, cards flat at rest.
13. **Spacing:** 4 px base, ten steps, `space-4` the default gap.
14. **Iconography: Heroicons only**, 24 px outline default, never meaning-bearing alone, with an
    explicit map from the backend's category `icon` names.
15. **Imagery:** fixed aspect ratios (3 : 2 card, 4 : 5 mobile hero, 16 : 9 desktop hero), mandatory
    scrim behind any text, no filters except desaturation for past/cancelled events, deterministic
    category-tinted fallback for missing images.

### M.3 The five UX principles

16. Two taps from poster to checkout; **no login before the price**; selection survives authentication.
17. **Availability is stated in words and numbers**, driven by the API's `availableQuantity`,
    `isSoldOut`, `isOnSale`, `salesProgress` — never derived, never implied by a disabled control.
    Because `soldQuantity` moves at **hold** time and reverses on expiry, availability is rendered as
    a **per-fetch snapshot, never a live counter**, and sold-out is never terminal — it carries a
    re-check action and a same-city/same-category recovery grid.
18. **The service fee is disclosed the instant a quantity exists**, never at the payment step.
19. **The 15-minute hold is a visible contract**, driven by the server's `expiresAt`, in three
    phases, stated in **both relative and absolute form**, never expiring silently.
20. **Every failure names its cause, states the money implication, and offers one recovery action.**

### M.4 The purchase flow

21. **`POST /orders` is the single entry point to checkout.** It creates the order *and* reserves the
    tickets internally. The participant flow **does not call `POST /tickets/reserve` directly** —
    doing so would create an orphaned hold.
22. **Steps 3–5 happen in one bottom sheet on mobile**, one right rail on desktop. The event never
    leaves the screen.
23. **One ticket type per purchase in V1.** The order API supports multiple item lines, so multi-tier
    baskets remain possible later without redesign.
24. **The `OrderSummary` component is literally the same component** on the sheet, the order screen
    and the confirmation. It renders `subtotal`, `platformFee`, a **conditional** `paymentFees` line,
    and `total` — always from the API, never computed.
25. **The total is always in the primary button's label.**
26. **Holder details default to "all tickets in my name"**, pre-filled from the buyer's profile.
27. **Payment providers are three named radio cards, local-first**: Konnect, Paymee, then Stripe.
    Redirect providers (`paymentUrl`) and in-page Stripe (`clientSecret`) are two distinct designs.
28. **An `idempotencyKey` is generated per payment attempt and reused on retry**, alongside a
    mandatory button loading state — together, the double-charge defence.
29. **Confirmation polls `GET /orders/:id` and never guesses.** A prolonged `PENDING`/`PROCESSING`
    is presented as *verification in progress*, never as failure, and never offers a retry.
30. **The ticket is a dark `ink-950` pass**; the QR is the largest element, ≥ 240 px, on white with a
    quiet zone, reachable in one tap, brightness-boosted, and **rendered offline**.

### M.5 Errors, accessibility, responsive

31. **Three failure shapes** — toast / inline / blocking. **Anything touching money is blocking.**
32. **Every error answers: what happened · what it means for my money · what I do now.**
    « Aucun montant n'a été débité » is mandatory whenever it is true.
33. **Refunds exclude the platform commission**, and the arithmetic is shown *before* the request.
34. **WCAG 2.1 AA** with 44 px minimum touch targets, `:focus-visible` only, a two-token focus ring
    that swaps on dark surfaces, labels always visible, blur-time validation, and countdown
    announcements at thresholds only.
35. **Breakpoints are Tailwind defaults, unmodified.** Design at 390 px, verify at 360 px, cap
    content at 1280 px.
36. **Mobile: bottom sheets, bottom tabs (4 items), bottom-anchored CTAs. Desktop: right-rail
    purchase panel.** Density is identical across breakpoints except admin/organizer data tables.

37. **Organizer payout is NOT locked** — the buyer pays `subtotal + 6 %`, but what the organizer
    nets is contradicted between the economic model and the code. Organizer surfaces show **gross
    sales only** until [§L](#l-open-contract-questions-for-the-backend) gap 8 is settled.

### M.6 What Phase 2 must decide (explicitly *not* locked here)

- The full route map and URL scheme, including French vs. English path segments.
- Navigation structure for the organizer console and the admin area.
- The onboarding and registration flow's step sequence.
- Search and filter IA: which lenses are primary, which live behind a sheet.
- Notification-preferences IA.
- Empty-state illustration style (the *behaviour* is locked; the artwork is not).

---

## N. Appendix — source references

Every backend claim in this document is traceable to source:

| Claim | File |
|---|---|
| 15-minute reservation TTL | `backend/src/modules/tickets/application/commands/reserve-tickets/reserve-tickets.handler.ts:24` |
| Order expiry, commission rate | `backend/src/modules/payments/application/commands/create-order/create-order.handler.ts:41-42` |
| Order total = subtotal + commission | `backend/src/modules/payments/domain/entities/order.entity.ts:192` |
| `setPaymentFees` rewrites the total | `backend/src/modules/payments/domain/entities/order.entity.ts:563` |
| Refund excludes commission | `backend/src/modules/payments/application/commands/request-refund/request-refund.handler.ts:56` |
| Fraud limits (5/hour, 10/event) | `backend/src/modules/payments/infrastructure/services/fraud-detection.service.ts:36-43` |
| TND = 3 decimals, symbol `DT` | `backend/src/shared/domain/value-objects/currency.vo.ts` |
| Order / ticket / event status machines | `order-status.vo.ts`, `ticket-status.vo.ts`, `event-status.vo.ts` |
| Payment providers and hand-off shape | `payment-method.vo.ts`, `application/types/payment-provider.types.ts` |
| Discovery filters and sorts | `backend/src/modules/events/application/dtos/event-filter.dto.ts` |
| Card-level price and availability | `event-list.dto.ts`, `ticket-type.dto.ts` (`TicketTypeSummaryDto`) |
| `soldQuantity` moves at **hold** time | `backend/src/modules/tickets/infrastructure/adapters/event-query.adapter.ts:75` (atomic `sold_quantity + :qty`), called from `reserve-tickets.handler.ts:99` |
| Availability restored on expiry / cancel | `expire-tickets.handler.ts:93`, `cancel-tickets.handler.ts:105` |
| Order creation reserves tickets internally | `create-order.handler.ts` (step 5, `ticketReservation.reserveTickets`) |
| Reservation holder limits (1–10) | `backend/src/modules/tickets/application/dtos/reserve-tickets.dto.ts` |
| Error envelope | `backend/src/shared/infrastructure/common/filters/http-exception.filter.ts` |
| Rate limiting (3/s, 20/10s) | `backend/src/modules/users/infrastructure/users.module.ts:131` |
| Notification channels and types | `notification-channel.vo.ts`, `notification-type.vo.ts` |
| Commission model and 6 % rationale | `docs/02-technique/04-modele-economique.md`, `docs/02-technique/10-commission-rate-update.md` |
| Organizer-payout contradiction (47 vs 50 TND) | `docs/02-technique/04-modele-economique.md:24-64` vs `order.entity.ts:192` — no payout code exists |
