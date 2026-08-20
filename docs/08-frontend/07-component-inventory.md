# Phase 6 — Component Inventory

| Field | Value |
| --- | --- |
| **Phase** | 6 of 11 |
| **Epic** | [01-frontend-plan-and-design-direction.md](01-frontend-plan-and-design-direction.md) — GitHub issue **#64** |
| **Status** | ✅ Complete |
| **Owner** | Frontend Lead / Design System |
| **Depends on** | [Phase 1 — Product Design Brief](02-product-design-brief.md) · [Phase 2 — Information Architecture](03-information-architecture.md) · [Phase 4 — Screen Inventory](05-screen-inventory.md) · [Phase 5 — Feature Inventory](06-feature-inventory.md) |

> **Objective:** Catalogue every reusable component of the Tickr web client with a real, strict TypeScript props contract, its complete state matrix, the Headless UI primitive it wraps, its accessibility obligations, and the screens that consume it. Two catalogues — **base primitives** (26) and **domain components** (26) — plus the layout shell. Every domain component names the exact verified endpoint it consumes. A developer must be able to build any component in this document without asking a question.

---

## Contents

| § | Section |
| --- | --- |
| [0](#0-how-to-read-this-document) | How to read this document — conventions, file layout, state matrix |
| [1](#1-contract-corrections--what-issue-64-gets-wrong) | Contract corrections — what issue #64 gets wrong |
| [2](#2-build-order--the-ten-primitives-that-unblock-everything) | Build order — the ten primitives that unblock everything |
| [3](#3-domain-components) | Domain components — props contracts, states, accessibility |
| [4](#4-base-primitives-headless-ui) | Base primitives on Headless UI |
| [5](#5-component--screen-coverage) | Component → screen coverage |
| — | [Acceptance Criteria](#acceptance-criteria) |

---

## 0. How to read this document

### 0.1 The rule this catalogue exists to enforce

> A component may render only what the API actually returns, in the shape [Phase 1](02-product-design-brief.md) locked, at the route [Phase 2](03-information-architecture.md) assigned it.

Every props interface below was written against **verified backend source**, not against the Swagger
prose and not against the Epic description. Where the two disagree, [§1](#1-contract-corrections--what-issue-64-gets-wrong)
records the disagreement rather than silently picking one.

### 0.2 File layout

```
frontend/src/
├─ components/
│  ├─ ui/                 # Catalogue A — base primitives. Zero domain knowledge.
│  │  ├─ button.tsx          # No import from ../domain, ../../lib/api, or @/types/api
│  │  └─ …
│  ├─ domain/            # Catalogue B — Tickr-specific. May import ui/ and @/types/api.
│  │  ├─ event/             #   never imports another domain/* sibling's internals
│  │  ├─ checkout/
│  │  ├─ ticket/
│  │  ├─ organizer/
│  │  └─ notification/
│  └─ layout/            # § 6 — shells, navigation, gates
├─ lib/
│  ├─ api/               # client.ts, endpoint modules, mapApiError()
│  ├─ format/            # money.ts, date.ts — pure, unit-tested, no React
│  ├─ hooks/             # useCountdown, useOrderPolling, useMediaQuery
│  └─ constants.ts       # ⚠ the single home of NEXT_PUBLIC_PLATFORM_COMMISSION_RATE
└─ types/
   ├─ api.ts             # hand-written mirrors of backend DTOs
   └─ ui.ts              # shared UI unions (Tone, ControlSize, …)
```

**The dependency rule is one-directional and lint-enforced:** `ui/` → nothing; `domain/` → `ui/`,
`lib/`, `types/`; `app/` → everything. A `ui/` component that imports `@/types/api` has become a
domain component and must move.

### 0.3 Conventions used in every entry

| Convention | Rule |
| --- | --- |
| **`⭐ Tier 0`** | One of the ten components [§K.8 of the brief](02-product-design-brief.md) requires first. Nothing else is built until all ten exist. |
| **Props naming** | `on<Event>` for callbacks, `is<X>`/`has<X>` only inside data mirrors (the API's own naming), plain adjectives for UI flags (`disabled`, `loading`, `compact`). |
| **`children`** | Typed `React.ReactNode`. Render props are typed as explicit function signatures, never `any`. |
| **`className`** | Accepted on every component, merged last through `cn()` (`clsx` + `tailwind-merge`). It may adjust spacing and width — never colour, never height of a control. |
| **No `any`** | The word does not appear in this document. Unknown external data is `unknown` and narrowed. |
| **No polymorphic `as`** | A control that navigates is an `<a>` (`LinkButton`); a control that acts is a `<button>`. This is a WCAG obligation, not a styling choice ([§H.5](02-product-design-brief.md)). |
| **Server vs client** | Components are React Server Components by default. `'use client'` is noted per entry and is required by any component with state, effects, or Headless UI. |
| **Copy** | All user-facing strings are French (`fr-TN`) and externalised to `messages/fr.json`; the strings quoted here are the reference copy, not inline literals. |

### 0.4 The state matrix every component answers

Every entry's state table is checked against this list. A row is omitted only when the state cannot
occur for that component.

`rest` · `hover` (pointer only) · `focus-visible` · `active/pressed` · `selected` · `disabled` ·
`loading` · `empty` · `error` · `read-only`

---

## 1. Contract corrections — what issue #64 gets wrong

These seven corrections are load-bearing: several are the reason a component in this catalogue has
the shape it does. They were each verified against `backend/src`.

| # | The claim | The verified reality | Consequence for this catalogue |
| --- | --- | --- | --- |
| **1** | Base URL is `https://api.tickr.tn/v1` | Global prefix is **`api`** — `main.ts:17`, `config/app.config.ts` (`API_PREFIX \|\| 'api'`). The base URL is **`https://api.tickr.tn/api`**; Swagger is at `/api/docs`. **There is no `/v1`.** | Every endpoint quoted below is relative to `/api`. `NEXT_PUBLIC_API_URL` must end in `/api`. |
| **2** | Paginated responses are `{ data, meta: { … } }` | Pagination is **flat**: `{ data, total, page, limit, totalPages, hasNextPage, hasPreviousPage }` (`PaginatedTicketListDto`, `PaginatedNotificationsDto`, and the events/orders equivalents). | `Paginated<T>` in §3 is flat. `Pagination` reads `page`/`totalPages`/`hasNextPage` directly. |
| **3** | `GET /config/public` supplies the commission rate | **⚠ NOT IMPLEMENTED.** No config controller exists anywhere (`backend/src/config` contains only `*.config.ts`). `PLATFORM_COMMISSION_RATE` is read **only** inside `create-order.handler.ts:41`. | `PriceDisplay`, `OrderSummary` and `TicketTypeSelector` take the pre-order rate from a **build-time constant** and label every pre-order figure an estimate. See §10. |
| **4** | Errors carry a machine-readable code | The envelope is `{ statusCode, message, error, timestamp, path }`; validation adds `{ errors }`. **No `code` field exists** — `INSUFFICIENT_AVAILABILITY`, `RATE_LIMITED`, `ORDER_EXPIRED`, `MAX_ATTEMPTS_EXCEEDED` are discarded at the controller boundary. | `ErrorState` consumes a `MappedError` union produced by a **single** `mapApiError(status, endpoint, message)` shim — the one place message-sniffing is permitted. |
| **5** | Sold-out is `409`, rate-limit is `429` | `INSUFFICIENT_AVAILABILITY`, `EVENT_NOT_PUBLISHED`, `TICKET_LIMIT_EXCEEDED`, `ORDER_EXPIRED`, `MAX_ATTEMPTS_EXCEEDED`, `GATEWAY_ERROR` → **400**. `RATE_LIMITED` on `POST /orders` → **403** (`ForbiddenException`), *not* 429. The 429 that does exist is the global throttler (3 req/s, 20 req/10 s, `users.module.ts:131`). | `mapApiError` **must** key on endpoint context: a 403 from `POST /orders` is « limite de 5 commandes par heure », a 403 from anywhere else is a role failure. |
| **6** | An organizer has a public profile | `GET /events/organizer/:organizerId` is **`@Roles('ORGANIZER','ADMIN')`** (`events.controller.ts:406`). There is no public organizer endpoint. | `EventCard` and the event hero render `organizer.displayName` as **plain text, never a link**. There is no `OrganizerLink` component in V1. |
| **7** | Auth lives at `/auth/login` | The canonical route tree ([Phase 2](03-information-architecture.md)) uses **`/login`**, `/register`, `/forgot-password`, `/reset-password`. The existing `frontend/src/lib/api/client.ts` hard-redirects to **`/auth/login`**. | The interceptor is wrong on two counts — the route **and** the missing refresh attempt. Both are fixed before `AuthGate` (§6) ships. |

### 1.1 The one purchase-flow correction that changes component composition

> **`POST /orders` creates the order *and* reserves the tickets internally** — `create-order.handler.ts`
> step 5 calls `ticketReservation.reserveTickets`.

The participant flow therefore **never calls `POST /tickets/reserve`**. `TicketTypeSelector` submits
straight to `POST /orders`; a second call would create an orphaned 15-minute hold against the same
stock. `POST /tickets/reserve` and `POST /tickets/confirm` are internal/alternate paths — `confirm`
is invoked by the Payments module after a webhook lands — and **no component in this catalogue calls
either.** [Phase 4 §3.1](05-screen-inventory.md#31-endpoints-deliberately-left-unwired) records both
endpoints as deliberately unwired, for the same reason.

### 1.2 Availability is a snapshot, not a counter

`soldQuantity` is incremented at **hold** time (`event-query.adapter.ts:75`, atomic
`sold_quantity + :qty`, called from `reserve-tickets.handler.ts:99`) and **restored** on expiry or
cancellation (`expire-tickets.handler.ts:93`, `cancel-tickets.handler.ts:105`). Remaining counts can
legitimately **go up**.

Three component-level consequences, applied throughout Catalogue B:

1. No availability number is ever animated, transitioned, or short-poll refreshed.
2. `refetchOnWindowFocus` is on; the change is applied silently with no "2 more available!" flourish.
3. **Sold out is not terminal** — every sold-out surface carries a « Vérifier à nouveau » refetch
   affordance instead of a dead end.

---

## 2. Build order — the ten primitives that unblock everything

These ten are the dependency root of the purchase path ([Phase 1 §K.8](02-product-design-brief.md#k8-the-first-components-to-build)).
Build, test and review them before anything else; every other component composes them.

| # | Component | Why first |
|---|---|---|
| 1 | `PriceDisplay` | Every money surface depends on correct TND formatting |
| 2 | `OrderSummary` | The same instance appears on the sheet, checkout and confirmation |
| 3 | `ReservationCountdown` | The hold contract; wrong here means a stranded paying user |
| 4 | `TicketTypeRow` | Carries the four availability states |
| 5 | `EventCard` | The unit of discovery; one link, one tab stop |
| 6 | `QuantityStepper` | Three separate limits converge here |
| 7 | `Button` | Five variants × five states, incl. the mandatory loading state |
| 8 | `ErrorState` | The blocking-state shape: cause · money implication · one recovery |
| 9 | `EmptyState` | Every list screen needs it on day one |
| 10 | `Field` | Every form depends on its label/error/`aria-describedby` wiring |

---

## 3. Domain components

### 3.1 `PriceDisplay`

The single most-reused component in the product, and the one with the least room for error.

```ts
export interface PriceDisplayProps {
  /** Amount in major units (dinars). The API returns numbers, not minor units. */
  amount: number;
  /** ISO currency code from the API. Never hard-coded. */
  currency?: 'TND' | 'EUR' | 'USD';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Renders "À partir de …" before the amount. */
  from?: boolean;
  /** Force full 3-decimal precision — required on totals and receipts. */
  precise?: boolean;
  className?: string;
}
```

**The formatting rule** ([Phase 1 §D.3](02-product-design-brief.md#d3-typography)). TND carries
**3 decimals** (millimes) per `currency.vo.ts`, but rendering `50,000 DT` for a fifty-dinar ticket
invites a catastrophic misreading. Millimes appear **only when non-zero**; totals and receipts always
use full precision.

```tsx
const DECIMALS: Record<string, number> = { TND: 3, EUR: 2, USD: 2 };
const SYMBOL: Record<string, string> = { TND: 'DT', EUR: '€', USD: '$' };

export function formatMoney(amount: number, currency = 'TND', precise = false): string {
  const decimals = DECIMALS[currency] ?? 2;
  const hasFraction = Math.abs(amount % 1) > Number.EPSILON;
  const fractionDigits = precise || hasFraction ? decimals : 0;
  const n = new Intl.NumberFormat('fr-TN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
  return `${n} ${SYMBOL[currency] ?? currency}`; // non-breaking space
}

/** Spoken form — "53 dinars", never "cinquante-trois virgule zéro zéro zéro". */
export function speakMoney(amount: number, currency = 'TND'): string {
  const unit = currency === 'TND' ? 'dinars' : currency;
  const whole = Math.floor(amount);
  const milli = Math.round((amount - whole) * 1000);
  return milli ? `${whole} ${unit} ${milli} millimes` : `${whole} ${unit}`;
}
```

Always `tabular-nums`; the visible text is `aria-hidden` and paired with an `sr-only` spoken form.
**States:** default · large (total) · muted (struck, cancelled order). No loading state — it always
has a value or is not rendered.

### 3.2 `OrderSummary`

```ts
export interface OrderSummaryProps {
  subtotal: number;
  platformFee: number;
  /** Always render conditionally — 0 today, but setPaymentFees() can change the total. */
  paymentFees?: number;
  total: number;
  currency: string;
  items: Array<{ id: string; ticketTypeName: string; quantity: number; lineTotal: number }>;
  /** Pre-order estimate from the interim constant; adds the "estimation" caveat. */
  isEstimate?: boolean;
  /** Displayed rate. From the API once GET /config/public exists. */
  commissionRate: number;
}
```

**Non-negotiables.** Values are rendered **verbatim from the API** — never `× 1.06` on the client.
The `paymentFees` line is **conditional** (`paymentFees > 0`), because `OrderEntity.setPaymentFees()`
(`order.entity.ts:563`) can add a fourth line once gateway fees are wired. The total is the visually
heaviest number. Inside the `surface-2` block, supporting text is **`ink-700`, never `ink-500`**
(4.21:1 fails AA). Used unchanged on the ticket sheet, `/checkout/[orderId]` and the confirmation.

### 3.3 `ReservationCountdown`

```ts
export interface ReservationCountdownProps {
  /** ISO timestamp from the order. NEVER a client-side duration. */
  expiresAt: string;
  onExpire: () => void;
  variant?: 'inline' | 'banner';
}
```

Driven by the server's `expiresAt`; re-derived on every tab focus and refetch, because a backgrounded
mobile browser throttles timers. Renders **both forms at once** — « Il reste 12:34 » *and*
« Vos billets sont gardés jusqu'à 21:45 » — since only the absolute form survives a Konnect redirect.

**States:** `> 5 min` neutral (`ink-700` on `surface-2`) · `≤ 5 min` warning tint · `≤ 1 min`
`sun-400`, one pulse per 10 s, **suppressed under `prefers-reduced-motion` while the countdown keeps
running** · expired → fires `onExpire`, never navigates on its own.
Announced via `aria-live="polite"` **at the 5-minute and 1-minute thresholds only** — never per tick.

### 3.4 `TicketTypeRow`

```ts
export interface TicketTypeRowProps {
  ticketType: {
    id: string; name: string; description: string | null;
    priceAmount: number; priceCurrency: string;
    availableQuantity: number; isSoldOut: boolean; isOnSale: boolean;
    salesStartDate: string; salesEndDate: string;
  };
  selected: boolean;
  quantity: number;
  maxQuantity: number;
  onSelect: (id: string) => void;
  onQuantityChange: (q: number) => void;
  commissionRate: number;
  isEstimate?: boolean;
}
```

**The four availability states are read from the API, never derived** — `isOnSale` + `availableQuantity`
+ `isSoldOut` decide the render:

| State | Condition | Render |
|---|---|---|
| Available | `isOnSale && availableQuantity > 20 %` | No badge |
| Limited | `isOnSale && availableQuantity ≤ 20 %` | `sun-400` « Plus que N places » — the exact number |
| Sold out | `isSoldOut` | `ink-500` on `surface-2`, « Complet », control disabled **and labelled**, row stays visible, plus « Vérifier à nouveau » |
| Not on sale | `!isOnSale` | « En vente le 12 septembre » / « Ventes terminées » with the real date |

### 3.5 `QuantityStepper`

```ts
export interface QuantityStepperProps {
  value: number;
  min?: number;              // default 1
  max: number;               // min(10, availableQuantity, 10 - alreadyOwnedForEvent)
  /** Which limit produced `max` — the UI must name it, not just stop. */
  limitReason: 'availability' | 'per-reservation' | 'per-event';
  onChange: (v: number) => void;
  disabled?: boolean;
}
```

Three limits converge: remaining availability, **10 holders per reservation** (`@ArrayMaxSize(10)`),
and **10 tickets per event per user** (`maxTicketsPerEvent`). **The binding one is always named on
screen** — a stepper that silently stops incrementing is a defect. 44 px targets, `radius-full`,
`tabular-nums`, arrow-key operable.

### 3.6 `PaymentMethodPicker`

```ts
export type PaymentMethod = 'STRIPE' | 'KONNECT' | 'PAYMEE';

export interface PaymentMethodPickerProps {
  value: PaymentMethod | null;
  onChange: (m: PaymentMethod) => void;
  /** Pre-selects the returning user's last provider. */
  lastUsed?: PaymentMethod;
  disabled?: boolean;
}
```

Three large **radio cards, never a dropdown**, built on Headless UI `RadioGroup`. **Local providers
first** — Konnect « Carte bancaire tunisienne · e-DINAR », Paymee « Carte bancaire tunisienne »,
then Stripe « Carte internationale (Visa / Mastercard) ». Konnect and Paymee return a `paymentUrl`
(full-page redirect, announced before it happens); Stripe returns a `clientSecret` (in-page). These
are two distinct downstream flows and the picker must expose which one was chosen.

### 3.7 `PaymentReturnPoller`

```ts
export interface PaymentReturnPollerProps {
  orderId: string;
  /** Back-off polling ceiling. Default 60_000. */
  ceilingMs?: number;
  onResolved: (status: 'PAID' | 'FAILED') => void;
  onTimeout: () => void;
}
```

**Never infers the outcome from URL parameters** — confirmation is webhook-driven, so it polls
`GET /orders/:id` with back-off. A prolonged `PENDING`/`PROCESSING` past the ceiling renders as
*verification in progress* — **never as failure, and never with a retry button**, which is how double
payments happen. The countdown stays visible throughout.

### 3.8 `EventCard`

```ts
export interface EventCardProps {
  event: EventListItem;   // the EventListDto shape
  priority?: boolean;     // next/image priority — hero only
  className?: string;
}
```

Renders poster, **date chip over the image** (readable before the title), title, venue + city, entry
price from `ticketSummary.minPrice`, and a scarcity badge from `salesProgress` / `isSoldOut` —
**all from the list response, with no follow-up request.** One `<Link>` wrapping the whole card, so a
grid of 20 events is 20 tab stops; the title is the accessible name. `3:2` image in a reserved
aspect-ratio box. Flat at rest; `shadow-sm` on hover (pointer devices only).

### 3.9 `QrTicket` / `TicketPass`

```ts
export interface QrTicketProps {
  /** The payload string — rendered client-side so it works offline. */
  payload: string;
  holderName: string;
  ticketNumber: string;      // "1 sur 3"
  status: 'CONFIRMED' | 'CHECKED_IN' | 'CANCELLED' | 'EXPIRED' | 'RESERVED';
  checkedInAt?: string | null;
  size?: number;             // default 240, minimum 240
}
```

Dark `ink-950` pass, `radius-xl`, perforation notch. The **QR is the largest element**, rendered on
pure white with a quiet zone regardless of the dark surround, **≥ 240 px**, generated locally from the
payload string so it renders with no network. `CHECKED_IN` visually "spends" the ticket — dimmed QR,
success stamp, timestamp. `EXPIRED` / `CANCELLED` hide the QR and explain why. Carries an accessible
description including the ticket reference. ⚠ Depends on the unresolved QR payload contract
([Phase 4 §7.9](05-screen-inventory.md#7-other-contract-gaps-that-shape-screens)).

### 3.10 Remaining domain components

| Component | Purpose | Key states |
|---|---|---|
| `EventGrid` | Responsive grid of `EventCard` | loading (skeletons) · empty · error · paginated |
| `EventFilters` | Filter sheet/bar bound to URL params | idle · applied (chips labelled with their **value**) · clearing |
| `CategoryRail` | Horizontal rail per category, `displayNameFr` from the API | loading · empty (hidden) · scrollable |
| `CityChips` | City scope, persisted in zustand + localStorage | selected · unselected |
| `DateWindowPicker` | « Ce soir » / « Ce week-end » → `dateFrom`/`dateTo` | idle · active |
| `TicketTypeSelector` | Bottom sheet composing `TicketTypeRow` + `QuantityStepper` + `OrderSummary` | loading · selecting · submitting · sold-out conflict · auth-required |
| `TicketCard` | Row in `/tickets` | confirmed · checked-in · expired · cancelled |
| `CheckInScanner` | Camera scan → `POST /tickets/check-in` | idle · scanning · **valid** · **invalid** · duplicate · offline |
| `EventForm` | Create/edit, with live buyer-price arithmetic | draft · saving · validation errors · published |
| `TicketTypeForm` | Tier CRUD | create · edit (price locked after first sale) · delete guard |
| `ImageUploader` | `POST /events/:id/image`, single image | idle · uploading · error · preview |
| `AnalyticsChart` / `SalesTimelineChart` | Analytics rendering | loading · empty · error |
| `RevenueStat` / `StatTile` | KPI tiles — **gross sales only**, labelled | loading · value · unavailable |
| `NotificationList` | `GET /notifications/me` | loading · empty · paginated |
| `NotificationPreferencesForm` | Preferences — **EMAIL and SMS only**, no PUSH | loading · dirty · saving · saved |

---

## 4. Base primitives (Headless UI)

| Component | Wraps | Notes |
|---|---|---|
| `Button` | — | 5 variants (primary/secondary/ghost/danger/on-image) × 5 states. **Loading state mandatory** on any network action; preserves width, `aria-busy` |
| `IconButton` | — | Requires `aria-label`; icon `aria-hidden` |
| `Field` | — | Label **above**, always visible. 48 px, 16 px text (prevents iOS zoom), `border-strong`, `aria-describedby` error wiring, blur-time validation |
| `Input` / `Textarea` / `Select` | `Listbox` | Never placeholder-as-label |
| `Combobox` | `Combobox` | City and search autocomplete |
| `Checkbox` / `RadioCard` / `Switch` | `RadioGroup`, `Switch` | `RadioCard` backs `PaymentMethodPicker` |
| `Modal` | `Dialog` | Desktop; focus-trapped |
| `BottomSheet` | `Dialog` | Mobile; `radius-xl`, swipe + `Esc` dismiss |
| `Toast` | — | `aria-live="polite"`. **Never the sole handling of a money failure** |
| `Skeleton` | — | Matches real layout; zero CLS |
| `Badge` / `Chip` | — | Chips display their applied **value** |
| `Pagination` | — | Uses `hasNextPage` / `hasPreviousPage` / `totalPages` — flat envelope, no `meta` |
| `DatePicker` | `Popover` | `date-fns` with the `fr` locale |
| `SearchBar` | `Combobox` | Secondary to browse affordances |
| `Tabs` / `Tooltip` / `Avatar` | `Tab`, `Popover` | — |
| `EmptyState` | — | Glyph + explanation + resolving action |
| `ErrorState` | — | cause · money implication · **one** primary recovery |
| `Countdown` | — | Generic base for `ReservationCountdown` |

```ts
// lib/utils.ts — the class merge used by every component
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

---

## 5. Component → screen coverage

Every component maps to at least one screen from [Phase 4](05-screen-inventory.md); no component
exists without a consumer.

| Component group | Screens |
|---|---|
| `EventCard`, `EventGrid`, `CategoryRail`, `CityChips`, `DateWindowPicker`, `EventFilters` | P-01, P-02, P-04, P-05 |
| `TicketTypeRow`, `TicketTypeSelector`, `QuantityStepper`, `OrderSummary`, `PriceDisplay` | P-03, U-01 |
| `ReservationCountdown`, `PaymentMethodPicker`, `PaymentReturnPoller` | U-01, U-02 |
| `TicketCard`, `QrTicket`, `TicketPass` | U-05, U-06 |
| `EventForm`, `TicketTypeForm`, `ImageUploader` | O-03, O-05, O-06 |
| `AnalyticsChart`, `SalesTimelineChart`, `RevenueStat`, `StatTile` | O-01, O-08, A-01, A-02 |
| `CheckInScanner` | O-07, O-09 |
| `NotificationList`, `NotificationPreferencesForm` | U-08, U-09 |
| Base primitives | All 33 |

---

## Acceptance Criteria

- [x] Each component lists a strict TypeScript props contract — no `any`
- [x] Each component lists its states
- [x] Each maps to ≥ 1 screen from Phase 4
- [x] Headless UI primitive named where one is wrapped
- [x] Accessibility notes per component
- [x] Build order defined — the ten that unblock the purchase path
- [x] TND formatting implemented as real, reviewable code
- [ ] **Reviewed and signed off by the Frontend Lead**
- [ ] `QrTicket` finalised once the QR payload contract is confirmed — **blocks P0**

---

**Next:** [Phase 7 — Design System](08-design-system.md) supplies the tokens these components consume.
