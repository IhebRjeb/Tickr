# Phase 6 — Component Inventory

| Field | Value |
| --- | --- |
| **Phase** | 6 of 11 |
| **Epic** | [01-frontend-plan-and-design-direction.md](01-frontend-plan-and-design-direction.md) — GitHub issue **#64** |
| **Status** | ✅ Complete |
| **Owner** | Frontend Lead / Design System |
| **Depends on** | [Phase 1 — Product Design Brief](02-product-design-brief.md) · [Phase 2 — Information Architecture](03-information-architecture.md) · [Phase 4 — Screen Inventory](05-screen-inventory.md) · [Phase 5 — Feature Inventory](06-feature-inventory.md) |

> **Objective:** Catalogue every reusable component of the Tickr web client with a real, strict TypeScript props contract, its complete state matrix, the Headless UI primitive it wraps, its accessibility obligations, and the screens that consume it. Two catalogues — **base primitives** (25) and **domain components** (30) — plus the layout shell ([§6](#6-layout-shell)). Every domain component that touches the network names the exact verified endpoint it consumes. A developer must be able to build any component in this document without asking a question.

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
| [6](#6-layout-shell) | Layout shell — navigation and gates |
| — | [Acceptance Criteria](#acceptance-criteria) |

---

## 0. How to read this document

### 0.1 The rule this catalogue exists to enforce

> A component may render only what the API actually returns, in the shape [Phase 1](02-product-design-brief.md) locked, at the route [Phase 2](03-information-architecture.md) assigned it.

Every props interface below was written against **verified backend source**, not the Swagger prose
and not the Epic description. Where they disagree,
[§1](#1-contract-corrections--what-issue-64-gets-wrong) records the disagreement rather than
silently picking one.

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
| **`⭐ Tier 0`** | One of the ten components [Phase 1 §K.8](02-product-design-brief.md#k8-the-first-components-to-build) requires first — the list is [§2](#2-build-order--the-ten-primitives-that-unblock-everything). Nothing else is built until all ten exist. |
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

Seven corrections, each verified against `backend/src`. Several are the reason a component below has
the shape it does.

| # | The claim | The verified reality | Consequence for this catalogue |
| --- | --- | --- | --- |
| **1** | Base URL is `https://api.tickr.tn/v1` | Global prefix is **`api`** — `main.ts:17`, `config/app.config.ts` (`API_PREFIX \|\| 'api'`). The base URL is **`https://api.tickr.tn/api`**; Swagger is at `/api/docs`. **There is no `/v1`.** | Every endpoint quoted below is relative to `/api`. `NEXT_PUBLIC_API_URL` must end in `/api`. |
| **2** | Paginated responses are `{ data, meta: { … } }` | Pagination is **flat**: `{ data, total, page, limit, totalPages, hasNextPage, hasPreviousPage }` (`PaginatedEventListDto`, `PaginatedTicketListDto`). Two envelopes are shorter — `PaginatedOrdersDto` stops at `totalPages`, `PaginatedNotificationsDto` at `limit`. | No `meta` anywhere. `Pagination` (§4) reads `hasNextPage`/`hasPreviousPage` where they exist and derives them from `page < Math.ceil(total / limit)` on the orders and notifications lists. |
| **3** | `GET /config/public` supplies the commission rate | **⚠ NOT IMPLEMENTED.** No config controller exists anywhere (`backend/src/config` contains only `*.config.ts`). `PLATFORM_COMMISSION_RATE` is read **only** inside `create-order.handler.ts:41`. | `PriceDisplay`, `OrderSummary` and `TicketTypeSelector` take the pre-order rate from a **build-time constant** — `NEXT_PUBLIC_PLATFORM_COMMISSION_RATE`, whose single home is `lib/constants.ts` ([§0.2](#02-file-layout)) — and label every pre-order figure an estimate. |
| **4** | Errors carry a machine-readable code | The envelope is `{ statusCode, code, message, details, timestamp, path, method }`; validation adds `{ errors }`. **No domain code reaches the client** — `INSUFFICIENT_AVAILABILITY`, `RATE_LIMITED`, `ORDER_EXPIRED`, `MAX_ATTEMPTS_EXCEEDED` collapse into an HTTP status and an English `message` at the controller boundary (`orders.controller.ts:86-93`). | `ErrorState` consumes a `MappedError` union produced by a **single** `mapApiError(status, endpoint, message)` shim — the one place message-sniffing is permitted. |
| **5** | Sold-out is `409`, rate-limit is `429` | `INSUFFICIENT_AVAILABILITY`, `EVENT_NOT_PUBLISHED`, `TICKET_LIMIT_EXCEEDED`, `ORDER_EXPIRED`, `MAX_ATTEMPTS_EXCEEDED`, `GATEWAY_ERROR` → **400**. `RATE_LIMITED` on `POST /orders` → **403** (`ForbiddenException`, `orders.controller.ts:91`), *not* 429 — the route's own Swagger annotation advertising 429 (`orders.controller.ts:62`) is wrong. The 429 that does exist is the global throttler (3 req/s, 20 req/10 s, `users.module.ts:131`). | `mapApiError` **must** key on endpoint context: a 403 from `POST /orders` is « limite de 5 commandes par heure ». The seven other meanings of 403 are catalogued in [Phase 2 §5.3](03-information-architecture.md#53-the-eight-meanings-of-403), which this document defers to. |
| **6** | An organizer has a public profile | `GET /events/organizer/:organizerId` is **`@Roles('ORGANIZER','ADMIN')`** (`events.controller.ts:407`), and the handler additionally rejects any `organizerId` but the caller's own unless the caller is `ADMIN` (`events.controller.ts:426`). There is no public organizer endpoint. | `EventCard` and the event hero render `organizer.displayName` as **plain text, never a link**. There is no `OrganizerLink` component in V1. |
| **7** | Auth lives at `/auth/login` | The canonical route tree ([Phase 2](03-information-architecture.md)) uses **`/login`**, `/register`, `/forgot-password`, `/reset-password`. The existing `frontend/src/lib/api/client.ts` hard-redirects to **`/auth/login`** on any 401 (`client.ts:33`). | The interceptor is wrong on two counts — the route **and** the missing refresh attempt. Both are fixed before `AuthGate` (§6) ships. |

### 1.1 The one purchase-flow correction that changes component composition

> **`POST /orders` creates the order *and* reserves the tickets internally** — step 5 of
> `create-order.handler.ts` calls `ticketReservation.reserveTickets` (`:140`).

The participant flow therefore **never calls `POST /tickets/reserve`**. `TicketTypeSelector` submits
straight to `POST /orders`; a second call would create an orphaned 15-minute hold against the same
stock. `POST /tickets/reserve` and `POST /tickets/confirm` are internal paths — `confirm` is invoked
by the Payments module once the webhook lands (`confirm-payment.handler.ts:62`) — and **no component
in this catalogue calls either.**
[Phase 4 §3.1](05-screen-inventory.md#31-endpoints-deliberately-left-unwired) records both endpoints
as deliberately unwired, for the same reason.

### 1.2 Availability is a snapshot, not a counter

`soldQuantity` is incremented at **hold** time (`event-query.adapter.ts:88`, atomic
`sold_quantity + :qty`, called from `reserve-tickets.handler.ts:99`) and **restored** on expiry or
cancellation (`expire-tickets.handler.ts:93`, `cancel-tickets.handler.ts:105`, both landing on
`event-query.adapter.ts:117`). Remaining counts can legitimately **go up**.

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
| 6 | `QuantityStepper` | Two enforced limits converge; the binding one must be named |
| 7 | `Button` | Five variants × five states, incl. the mandatory loading state |
| 8 | `ErrorState` | The blocking-state shape: cause · money implication · one recovery |
| 9 | `EmptyState` | Every list screen needs it on day one |
| 10 | `Field` | Every form depends on its label/error/`aria-describedby` wiring |

---

## 3. Domain components

### 3.1 `PriceDisplay` ⭐

The single most-reused component in the product, and the one with the least room for error.

```ts
export interface PriceDisplayProps {
  /** Amount in major units (dinars). The API returns numbers, not minor units. */
  amount: number;
  /** ISO currency code from the API. Never hard-coded. */
  currency?: 'TND' | 'EUR' | 'USD';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Renders « À partir de … » before the amount. */
  from?: boolean;
  /** Force full 3-decimal precision — required on totals and receipts. */
  precise?: boolean;
  className?: string;
}
```

**The formatting rule** ([Phase 1 §D.3](02-product-design-brief.md#d3-typography)). TND carries
**3 decimals** and the symbol `DT` (`shared/domain/value-objects/currency.vo.ts:35-41`), but rendering
`50,000 DT` for a fifty-dinar ticket invites a catastrophic misreading. Millimes appear **only when
non-zero**; totals and receipts always use full precision.

```tsx
const DECIMALS: Record<string, number> = { TND: 3, EUR: 2, USD: 2 };
const SYMBOL: Record<string, string> = { TND: 'DT', EUR: '€', USD: '$' };

const NBSP = '\u00A0';

export function formatMoney(amount: number, currency = 'TND', precise = false): string {
  const decimals = DECIMALS[currency] ?? 2;
  // Round to the currency's precision *before* asking whether millimes exist, so float noise
  // — 47.000000000000004 — never renders as « 47,000 DT ».
  const rounded = Number(amount.toFixed(decimals));
  const fractionDigits = precise || !Number.isInteger(rounded) ? decimals : 0;
  const n = new Intl.NumberFormat('fr-TN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(rounded);
  return `${n}${NBSP}${SYMBOL[currency] ?? currency}`;
}

/** Spoken form — « 53 dinars », never « cinquante-trois virgule zéro zéro zéro ». */
export function speakMoney(amount: number, currency = 'TND'): string {
  if (currency !== 'TND') return formatMoney(amount, currency, true);
  const millimes = Math.round(Math.abs(amount) * 1000);
  const whole = Math.floor(millimes / 1000);
  const rest = millimes % 1000;
  const sign = amount < 0 ? 'moins ' : '';
  const dinars = `${whole} ${whole === 1 ? 'dinar' : 'dinars'}`;
  return rest
    ? `${sign}${dinars} ${rest} ${rest === 1 ? 'millime' : 'millimes'}`
    : `${sign}${dinars}`;
}
```

Always `tabular-nums`; the visible text is `aria-hidden` and paired with an `sr-only` spoken form.
**States:** default · large (total) · muted (struck, cancelled order). No loading state — it always
has a value or is not rendered.

### 3.2 `OrderSummary` ⭐

```ts
export interface OrderSummaryProps {
  subtotal: number;
  platformFee: number;
  /** Always render conditionally — 0 today, but setPaymentFees() can change the total. */
  paymentFees?: number;
  total: number;
  currency: string;
  items: Array<{ id: string; ticketTypeName: string; quantity: number; lineTotal: number }>;
  /** Pre-order estimate from the interim constant; adds the « estimation » caveat. */
  isEstimate?: boolean;
  /** Displayed rate. Comes from the interim constant — `GET /config/public` is ⚠ NOT IMPLEMENTED. */
  commissionRate: number;
}
```

**Non-negotiables.** Values are rendered **verbatim from the API** — never `× 1.06` on the client.
The `paymentFees` line is **conditional** (`paymentFees > 0`), because `OrderEntity.setPaymentFees()`
(`order.entity.ts:563`) can add a fourth line once gateway fees are wired. The total is the visually
heaviest number. Inside the `surface-2` block, supporting text is **`ink-700`, never `ink-500`**
(4.21:1 fails AA). Used unchanged on the P-03 ticket sheet, U-01 `/checkout/[orderId]` and the U-02 return screen.

### 3.3 `ReservationCountdown` ⭐

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

### 3.4 `TicketTypeRow` ⭐

```ts
export interface TicketTypeRowProps {
  ticketType: {
    id: string; name: string; description?: string | null;
    priceAmount: number; priceCurrency: string;
    quantity: number; availableQuantity: number;
    isSoldOut: boolean; isOnSale: boolean;
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

**Nothing here is inferred from a price or a date.** `isOnSale` and `isSoldOut` come straight from
`TicketTypeDto`; the only derived value is the scarcity threshold, a ratio of the two quantity fields:

| State | Condition | Render |
|---|---|---|
| Available | `isOnSale && ticketType.availableQuantity / ticketType.quantity > 0.2` | No badge |
| Limited | `isOnSale && !isSoldOut && ticketType.availableQuantity / ticketType.quantity <= 0.2` | `sun-400` « Plus que N places » — the exact number |
| Sold out | `isSoldOut` | `ink-500` on `surface-2`, « Complet », control disabled **and labelled**, row stays visible, plus « Vérifier à nouveau » |
| Not on sale | `!isOnSale` | « En vente le 12 septembre » / « Ventes terminées » with the real date |

### 3.5 `QuantityStepper` ⭐

```ts
export interface QuantityStepperProps {
  value: number;
  min?: number;              // default 1
  max: number;               // min(availableQuantity, 10 - alreadyOwnedForEvent)
  /** Which limit produced `max` — the UI must name it, not just stop. */
  limitReason: 'availability' | 'per-event';
  onChange: (v: number) => void;
  disabled?: boolean;
}
```

Two limits are enforced on the purchase path: remaining availability, and **10 tickets per event per
user** (`fraud-detection.service.ts:40`, checked at `create-order.handler.ts:95` →
`TICKET_LIMIT_EXCEEDED` → 400). The 10-holder array cap (`@ArrayMaxSize(10)`,
`reserve-tickets.dto.ts:72`) guards `POST /tickets/reserve` only, which this flow never calls
([§1.1](#11-the-one-purchase-flow-correction-that-changes-component-composition)); `CreateOrderItemDto`
sets no upper bound of its own. **The binding limit is always named on screen** — a stepper that
silently stops incrementing is a defect. 44 px targets, `radius-full`, `tabular-nums`, arrow-key
operable.

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
are two distinct downstream flows and the picker must expose which one was chosen. The value it
returns is the `paymentMethod` body field of `POST /orders/:id/pay`.

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

### 3.8 `EventCard` ⭐

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
  /** `TicketDto.qrCode`, encoded in the browser so the pass works offline. */
  payload: string;
  holderName: string;
  ticketNumber: string;      // "1 sur 3"
  status: 'CONFIRMED' | 'CHECKED_IN' | 'CANCELLED' | 'EXPIRED' | 'RESERVED';
  checkedInAt?: string | null;
  size?: number;             // default 240, minimum 240
}
```

Dark `ink-950` pass, `radius-xl`, perforation notch. The **QR is the largest element**, drawn on pure
white with a quiet zone regardless of the dark surround, **≥ 240 px**.

The payload is `TicketDto.qrCode` — a plain string of the form `v1-{uuid}-{checksum}`
(`ticket.dto.ts:33`, `qr-code.vo.ts`), the same string `POST /tickets/check-in` accepts. The component
encodes it in the browser: **no network call, no server-rendered image**, so the pass works at a venue
door with no signal. The string is immutable for the ticket's life with one exception — a transfer
regenerates it and nulls `pdfUrl` (`ticket.entity.ts:461`) — so cache it per `ticket.id` and
invalidate after `POST /tickets/:id/transfer`.

`CHECKED_IN` visually "spends" the ticket — dimmed QR, success stamp, timestamp. `EXPIRED` /
`CANCELLED` hide the QR and explain why. Carries an accessible description including the ticket
reference. See [Phase 4 §7](05-screen-inventory.md#7-other-contract-gaps-that-shape-screens).

### 3.10 Remaining domain components

| Component | Purpose | Key states |
|---|---|---|
| `EventGrid` | Responsive grid of `EventCard` — `GET /events` (PUBLISHED only) | loading (skeletons) · empty · error · paginated |
| `EventFilters` | Filter sheet/bar bound to URL params — `GET /events/search` | idle · applied (chips labelled with their **value**) · clearing |
| `CategoryRail` | Horizontal rail — `GET /events/category/:category`; label from `displayNameFr` (`event-category.vo.ts:28`) | loading · empty (hidden) · scrollable |
| `CityChips` | City scope, persisted in zustand + localStorage | selected · unselected |
| `DateWindowPicker` | « Ce soir » / « Ce week-end » → `dateFrom`/`dateTo` | idle · active |
| `TicketTypeSelector` | Bottom sheet composing `TicketTypeRow` + `QuantityStepper` + `OrderSummary`; submits `POST /orders` | loading · selecting · submitting · sold-out conflict · auth-required |
| `TicketCard` | Row in `/tickets` — `GET /tickets` (the list row; the dark full pass is `TicketPass`) | confirmed · checked-in · expired · cancelled |
| `OrderRow` | Row in `/orders` — `GET /orders` | pending · processing · paid · failed · cancelled (where an expired hold lands — `order.entity.ts:519`) · refunded |
| `OrderStatusBadge` | The one place an `OrderStatus` / `TicketStatus` is translated | one label per status |
| `RefundBreakdown` | `POST /orders/:id/refund` — the refund is `subtotal + paymentFees`; **the commission is not returned** (`request-refund.handler.ts:56`) | idle · confirming · submitted · refused |
| `CheckInScanner` | Camera scan → `POST /tickets/check-in` | idle · scanning · **valid** · **invalid** · duplicate · offline |
| `EventForm` | `POST /events` · `PUT /events/:id` · `POST /events/:id/publish`, with live buyer-price arithmetic | draft · saving · validation errors · published |
| `TicketTypeForm` | Tier CRUD — `POST /events/:id/ticket-types`, `PUT`/`DELETE .../:typeId` | create · edit (price and sales window lock once `soldQuantity > 0`, i.e. at the first **hold** — `ticket-type.entity.ts:209`) · delete guard (`event.entity.ts:548`) |
| `ImageUploader` | `POST /events/:id/image`, single image | idle · uploading · error · preview |
| `AnalyticsChart` / `SalesTimelineChart` | `GET /analytics/events/:id` · `GET /analytics/events/:id/sales-timeline` | loading · empty · error |
| `RevenueStat` / `StatTile` | KPI tiles — **gross sales only**, labelled | loading · value · unavailable |
| `NotificationList` | `GET /notifications/me`; composes `NotificationRow` per item | loading · empty · paginated |
| `NotificationPreferencesForm` | `GET`/`PUT /notifications/preferences/me` — **EMAIL and SMS only**, no PUSH (`notification-channel.vo.ts:26`) | loading · dirty · saving · saved |

---

## 4. Base primitives (Headless UI)

| Component | Wraps | Notes |
|---|---|---|
| `Button` ⭐ | — | 5 variants (primary/secondary/ghost/danger/on-image) × 5 states. **Loading state mandatory** on any network action; preserves width, `aria-busy` |
| `IconButton` | — | Requires `aria-label`; icon `aria-hidden` |
| `Field` ⭐ | — | Label **above**, always visible. 48 px, 16 px text (prevents iOS zoom), `border-strong`, `aria-describedby` error wiring, blur-time validation |
| `Input` / `Textarea` / `Select` | `Listbox` | Never placeholder-as-label |
| `Combobox` | `Combobox` | City and search autocomplete |
| `Checkbox` / `RadioCard` / `Switch` | `RadioGroup`, `Switch` | `RadioCard` backs `PaymentMethodPicker` |
| `Modal` | `Dialog` | Desktop; focus-trapped |
| `BottomSheet` | `Dialog` | Mobile; `radius-xl`, swipe + `Esc` dismiss |
| `Toast` | — | `aria-live="polite"`. **Never the sole handling of a money failure** |
| `Skeleton` | — | Matches real layout; zero CLS |
| `Badge` / `Chip` | — | Chips display their applied **value** |
| `Pagination` | — | Flat envelope, no `meta`. Uses `hasNextPage` / `hasPreviousPage` / `totalPages` where present. `GET /orders` omits the two booleans and `GET /notifications/me` omits all three, so both are derived from `total` / `page` / `limit` |
| `DatePicker` | `Popover` | `date-fns` with the `fr` locale |
| `SearchBar` | `Combobox` | Secondary to browse affordances |
| `Tabs` / `Tooltip` / `Avatar` | `Tab`, `Popover` | — |
| `EmptyState` ⭐ | — | Glyph + explanation + resolving action |
| `ErrorState` ⭐ | — | cause · money implication · **one** primary recovery |
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

Every component maps to at least one screen from [Phase 5](06-feature-inventory.md), which defines the
screen IDs; no component exists without a consumer.

| Component group | Screens |
|---|---|
| `EventCard`, `EventGrid`, `CategoryRail`, `CityChips`, `DateWindowPicker`, `EventFilters` | P-01, P-02, P-04, P-05 |
| `TicketTypeRow`, `TicketTypeSelector`, `QuantityStepper`, `OrderSummary`, `PriceDisplay` | P-03, U-01, U-02 |
| `ReservationCountdown`, `PaymentMethodPicker`, `PaymentReturnPoller` | U-01, U-02 |
| `OrderRow`, `OrderStatusBadge`, `RefundBreakdown` | U-03, U-04 |
| `TicketCard`, `QrTicket`, `TicketPass` | U-05, U-06 |
| `EventForm`, `TicketTypeForm`, `ImageUploader` | O-03, O-05, O-06 |
| `AnalyticsChart`, `SalesTimelineChart`, `RevenueStat`, `StatTile` | O-01, O-08, A-01, A-02 |
| `CheckInScanner` | O-07, O-09 |
| `NotificationList`, `NotificationPreferencesForm` | U-08, U-09 |
| Base primitives and the layout shell | All 33 routes + `/legal/*` |

**Naming drift to settle before implementation.** Phase 5's per-screen component lists name four of
these differently: `TicketSelectionSheet` (`TicketTypeSelector`), `TicketRow` (`TicketCard`),
`CityChipRow` (`CityChips`), `DateWindowChips` (`DateWindowPicker`). The names in this document are
canonical; Phase 5 is the older text.

---

## 6. Layout shell

Five components and two gates, catalogued here because [§0.2](#02-file-layout) gives them their own
directory and because [§1](#1-contract-corrections--what-issue-64-gets-wrong) correction 7 lands on
one of them.

| Component | `'use client'` | Responsibility |
|---|---|---|
| `PageShell` | no | `canvas` background, max width, skip-link target, the single `<main>` landmark |
| `TopNav` | yes | Brand, city scope, search entry, auth state |
| `BottomNav` | yes | Participant tab bar below `md`; U-03, U-05, U-09 only |
| `Sidebar` | yes | Organizer and admin zones |
| `Footer` | no | `/legal/*` links, locale |
| `AuthGate` | yes | Redirects an unauthenticated user to **`/login?next=`** — never `/auth/login`, and only after a single-flight refresh attempt has failed |
| `RoleGate` | yes | Reads `role` from the auth store; a second line of defence behind the middleware, never the only one |

`RoleGate` cannot grant what the API refuses: `/admin/moderation` is read-only because
`DELETE /events/:id` returns **403** to an `ADMIN` as readily as to a stranger — no guard in the
chain carries an admin bypass.

---

## Acceptance Criteria

- [x] Each component lists a strict TypeScript props contract — no `any`
- [x] Each component lists its states
- [x] Each maps to ≥ 1 screen from Phase 5
- [x] Headless UI primitive named where one is wrapped
- [x] Accessibility notes per component
- [x] Build order defined — the ten that unblock the purchase path
- [x] TND formatting implemented as real, reviewable code
- [ ] **Reviewed and signed off by the Frontend Lead**
- [x] `QrTicket` cache policy settled — the QR string changes only on transfer
      (`ticket.entity.ts:461`), so it is cached per `ticket.id` and invalidated after
      `POST /tickets/:id/transfer`

---

**Next:** [Phase 7 — Design System](08-design-system.md) supplies the tokens these components consume.
