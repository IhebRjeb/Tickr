# [FRONTEND] Define Frontend Plan & Design Direction

| Field          | Value                                                                      |
| -------------- | -------------------------------------------------------------------------- |
| **Type**       | Epic / Discovery                                                           |
| **Priority**   | High                                                                       |
| **Status**     | 🚧 Phases 1–7 & 11 delivered · 8–10 spec-complete, Figma artefacts pending |
| **Sprint**     | Frontend Sprint 0 (Foundation)                                             |
| **Depends on** | Backend REST API (`/api`) — complete                                       |
| **Blocks**     | All frontend implementation tickets                                        |
| **Owner**      | Frontend Lead / Product Design                                             |

---

## 1. Context

The **Tickr** backend is **structurally complete** for the V1 MVP — all six bounded contexts are
implemented, tested and documented — but grounding these deliverables against `backend/src` found
**three wiring gaps that stop the purchase path running end to end**, so "feature-complete" should
not be read as "shippable" (see the correction block below and
[Phase 1 §L](02-product-design-brief.md#l-open-contract-questions-for-the-backend)).

It is built as a **Modular Hexagonal (Ports & Adapters) Monolith** on **NestJS 11 + TypeScript 5.7**, exposing a REST API under the global prefix **`/api`** (configurable via `API_PREFIX`).

All six bounded contexts are implemented, tested, and documented (Swagger + Postman):

| Bounded Context        | Status      | Public Surface (REST)               |
| ---------------------- | ----------- | ----------------------------------- |
| Authentication & Users | ✅ Complete | `/auth/*`, `/users/*`               |
| Events                 | ✅ Complete | `/events/*`                         |
| Tickets                | ✅ Complete | `/tickets/*`                        |
| Payments & Orders      | ✅ Complete | `/orders/*`, `/payments/webhooks/*` |
| Analytics              | ✅ Complete | `/analytics/*`                      |
| Notifications          | ✅ Complete | `/notifications/*`                  |

Functional specs, personas, workflows, business rules, user stories, and acceptance criteria for the MVP are finalized (see `docs/01-fonctionnel` and `docs/02-technique`).

**This Epic is a design & architecture discovery phase — not implementation.** Its purpose is to remove all UX/UI ambiguity and produce a single source of truth before the first React component is written, so that the frontend maps 1:1 to the existing backend contracts.

> **Correction vs. prior drafts:** Payment gateways are **Stripe, Konnect, and Paymee** (multi-provider, `PaymentProviderFactory`) — _not_ Clictopay/Edinar. Commission is **configurable (default 6%)**, added **on top** of the ticket price. All monetary values are in **TND**.

> ### 🔴 Wiring gaps that block the purchase path (verified 2026-08-20)
>
> These are not documentation errors — they are unwired code paths. Each was read in the source.
>
> | #            | Gap                                                                 | Evidence                                                                                                                                              | Consequence                                                                                             |
> | ------------ | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
> | 1            | **Ticket reservation is a stub**                                    | `TICKET_RESERVATION_PORT` → `TicketReservationAdapter`, whose `reserveTickets()` logs `[STUB]` and returns mock IDs (`payments.module.ts`)            | `POST /orders` creates no ticket rows and moves no `soldQuantity`. **No purchase completes end to end** |
> | 2 — Resolved | **The shared Events/Tickets/Notifications guard now verifies JWTs** | It extends Passport `AuthGuard('jwt')`, preserves `@Public()`, and rejects missing/invalid tokens                                                     | Protected Events lifecycle is E2E-validated; Tickets and Notifications use the same guard               |
> | 3            | **Registration never mints a verification token**                   | the token issuance is commented out in `auth.controller.ts`; `POST /auth/login` returns `403` for an unverified e-mail, and no resend endpoint exists | A new account can never log in                                                                          |
>
> **The frontend design is unaffected and remains correct** — build to the documented contracts.
> But the Epic's Definition of Done cannot be honestly closed until the remaining stubs are wired, and no
> money-path screen can be verified against real data before then.

> ### ⚠️ Contract corrections verified against source (2026-08-20)
>
> Grounding the Phase 1–11 deliverables against `backend/src` surfaced five claims in the original
> Epic body that do **not** match the implemented backend. The deliverables follow the code; this
> Epic text is corrected here so the two agree.
>
> | Epic originally said                                          | Verified reality                                                                                                                                 | Source                                                       |
> | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
> | Base path `/v1`                                               | **`/api`** — `setGlobalPrefix(apiPrefix)`, `API_PREFIX \|\| 'api'`                                                                               | `main.ts:17`, `config/app.config.ts:6`                       |
> | Commission fetched via `GET /config/public`                   | **Implemented.** Without `eventId` it returns the global default; with `?eventId=<uuid>` it resolves the event override or falls back to global  | `public-config.controller.ts`; `event-query.adapter.ts`      |
> | Pagination `{ data, meta: { … } }`                            | **Flat**: `{ data, total, page, limit, totalPages, hasNextPage, hasPreviousPage }`                                                               | `event-list.dto.ts`, `order.dto.ts`                          |
> | Error envelope `{ statusCode, message, errors[], timestamp }` | `{ statusCode, code, message, details, timestamp, path, method }`; only _validation_ errors carry `errors[]`                                     | `http-exception.filter.ts`, `validation-exception.filter.ts` |
> | Sold out → `409`, rate limited → `429`                        | Sold out returns **`400`** (`INSUFFICIENT_AVAILABILITY`); order-creation rate limiting returns **`403`** (`RATE_LIMITED` → `ForbiddenException`) | `tickets.controller.ts`, `orders.controller.ts:90`           |
>
> One remaining item is a **backend work item**, not a documentation fix: adding a machine-readable
> `code` to the error envelope so the UI can tell "sold out" from
> "bad input" (the validation filter already emits `code: 'VALIDATION_ERROR'`; `http-exception.filter.ts`
> emits none). Both are tracked in [Phase 1 §L](02-product-design-brief.md#l-open-contract-questions-for-the-backend).

---

## 2. Confirmed Technical Baseline (do not re-decide)

These are already fixed by the repository and backend and are **inputs**, not open questions.

### 2.1 Frontend stack (from `frontend/package.json`)

| Concern                      | Decision                                                |
| ---------------------------- | ------------------------------------------------------- |
| Framework                    | **Next.js 16** (App Router), **React 19**               |
| Language                     | **TypeScript 5** (strict)                               |
| Styling                      | **TailwindCSS 4**                                       |
| Server state / data fetching | **@tanstack/react-query 5**                             |
| HTTP client                  | **axios** (single configured instance)                  |
| Client/UI state              | **zustand**                                             |
| Forms + validation           | **react-hook-form** + **zod** (+ `@hookform/resolvers`) |
| Headless UI primitives       | **@headlessui/react**, **@heroicons/react**             |
| Dates                        | **date-fns**                                            |
| Class utilities              | **clsx**, **tailwind-merge**                            |
| Unit/component tests         | **Vitest** + **@testing-library/react**                 |
| E2E tests                    | **Playwright**                                          |
| Dev server port              | **3001**                                                |

> Design deliverables must be expressed in terms of this stack (e.g. design tokens as Tailwind theme values, components using Headless UI primitives). No new UI framework is to be introduced in this Epic.

### 2.2 API & auth contract (from `docs/02-technique/02-api-contract.md`, corrected against `backend/src`)

- Base URL: `https://api.tickr.tn/api` (JSON, HTTPS, UTF-8).
- Auth: `Authorization: Bearer <JWT>` — **HS256**; access token **7 d** and refresh token **30 d** by default (`JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN`, `jwt.service.ts:74–75` — the "24h" in the api-contract doc is stale). Refresh via `POST /auth/refresh-token`.
- `POST /auth/login` returns **`403`** when the email is unverified or the account is deactivated (`auth.controller.ts:189`) — the login form must render this as "verify your email / account disabled", never as a generic forbidden.
- Roles (from `UserRole` enum): **`PARTICIPANT`**, **`ORGANIZER`**, **`ADMIN`**.
- Pagination: `?page=&limit=` → `{ data, total, page, limit, totalPages, hasNextPage, hasPreviousPage }` (flat, **not** nested under `meta`).
- Error envelope: `{ statusCode, code, message, details, timestamp, path, method }`. Validation failures add `errors[]`.
- Status codes actually emitted: `200/201/400/401/403/404/429/500` — no `204` (all DELETEs return `200` with a body) and no `409` today. The UI **must** define a state for `401`, `403`, `404`, business conflicts (sold out — **surfaced as `400`**, `INSUFFICIENT_AVAILABILITY`), and `429` (global throttle: 3 req/s, 20 req/10 s; login additionally 5 attempts/15 min).

---

## 3. Goal

Produce **every design and frontend-architecture artifact** required to begin React implementation with zero design uncertainty, fully aligned to the backend contracts above.

**Out of scope:** writing React components, pages, or tests (those are separate, downstream tickets).

---

## 4. Deliverables

Each phase below lists **concrete, Tickr-specific** outputs. Generic placeholders are intentionally avoided — every screen, route, and component maps to a real backend capability.

### Phase 1 — Product Design Brief

**Output:** `docs/08-frontend/02-product-design-brief.md`

- Product positioning for the Tunisian market (mobile-first, local payment methods, TND pricing).
- Brand personality, tone, and visual direction.
- UX principles (max 5, e.g. "purchase in ≤ 3 taps from event page").
- Motion & accessibility objectives (target **WCAG 2.1 AA**).
- Competitor teardown with **specific takeaways** (not just names): Meetup, Fever, Eventbrite, Dice, Shotgun — one actionable insight per competitor.

**Acceptance:** Brief reviewed and signed off by Product Owner.

---

### Phase 2 — Information Architecture

**Output:** `docs/08-frontend/03-information-architecture.md` + sitemap diagram.

Route tree grouped by access level and mapped to Next.js App Router segments and required role:

| Zone                 | Example routes                                                                                                                                                                                              | Role required                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Public               | `/`, `/events`, `/events/[id]`, `/categories/[category]`, `/search`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`                                                          | none                                                                 |
| Authenticated shared | `/checkout/[orderId]`, `/tickets`, `/tickets/[id]`, `/orders`, `/orders/[id]`, `/notifications`, `/profile`, `/settings`, `/check-in`                                                                       | any authenticated role; `/check-in` is resource-authorized per event |
| Organizer            | `/organizer`, `/organizer/events`, `/organizer/events/new`, `/organizer/events/[id]/edit`, `/organizer/events/[id]/ticket-types`, `/organizer/events/[id]/participants`, `/organizer/events/[id]/analytics` | `ORGANIZER` (`ADMIN` read-only)                                      |
| Admin                | `/admin`, `/admin/moderation`, `/admin/users`, `/admin/reports`                                                                                                                                             | `ADMIN`                                                              |

The delivered tree fixes **33 canonical routes** plus the `/legal/*` static group: Public 11 · authenticated shared 10 · Organizer 8 · Admin 4 (see [Phase 2 §1.6](03-information-architecture.md#16-route-count-reconciliation)).

**Acceptance:** Every route maps to at least one backend endpoint (or is explicitly static); navigation hierarchy validated per role.

---

### Phase 3 — User Journey Mapping

**Output:** `docs/08-frontend/04-user-journeys.md`

Document each journey as steps → screen → API call → result state. Journeys must reflect the **real reservation → order → payment** flow:

- **Participant purchase (happy path):**
  1. Discover / search → `GET /events`, `GET /events/search`
  2. View event → `GET /events/:id`
  3. **Create the order → `POST /orders` — this reserves the tickets internally** (`create-order.handler.ts`, step 5), returning the 15-minute `expiresAt`.
     ⚠️ **Corrected:** earlier drafts inserted a separate `POST /tickets/reserve` here. The participant flow must **not** call it — a second hold would be orphaned against the same stock.
  4. Pay → `POST /orders/:id/pay` (Konnect / Paymee → `paymentUrl`; Stripe → `clientSecret`)
  5. Confirmation is **webhook-driven** → poll `GET /orders/:id` until a terminal status. `POST /tickets/confirm` is called by the Payments module, **not** by the UI. Prolonged `PENDING`/`PROCESSING` is shown as _payment verification in progress_ — never as a failure, never with a retry.
  6. View ticket + QR → `GET /tickets/:id`, download `GET /tickets/:id/pdf`
- **Organizer:** create event → `POST /events`; add ticket types → `POST /events/:id/ticket-types`; upload cover → `POST /events/:id/image`; publish → `POST /events/:id/publish`; assign staff → `POST|GET|DELETE /events/:id/check-in-staff[/:assignmentId]`; analytics → `GET /analytics/dashboard`, `GET /analytics/events/:id`, `GET /analytics/events/:id/sales-timeline`.
- **Door check-in:** owner, current admin, or assigned staff discovers events through `GET /events/check-in-access/me`, then scans with `POST /tickets/check-in` and reads `GET /tickets/event/:eventId/stats`.
- **Edge cases (each must have a defined screen/state):** reservation hold expired, order/payment failed (`POST /orders/:id/pay` failure), session/token expired (`401` → refresh flow), sold out (**currently `400`**, not `409`), ticket limit exceeded (`TICKET_LIMIT_EXCEEDED`, 10 tickets/event/user → `400`), refund (`POST /orders/:id/refund`), event cancelled, empty organizer dashboard, empty search results, no notifications, rate limited (`429`; order creation instead returns **`403`** `RATE_LIMITED` at 5 orders/h/user).

**Acceptance:** Every journey names the exact endpoints and the UI state for both success and each failure branch.

---

### Phase 4 — Screen Inventory

**Output:** `docs/08-frontend/05-screen-inventory.md` (table).

One row per screen with: route, role, primary endpoints, and whether it is SSR/CSR. Minimum set derived from IA (Phase 2). No "example" screens — the list must be exhaustive for the MVP.

**Acceptance:** Screen count reconciled against the route tree; no orphan routes, no screens without a route.

---

### Phase 5 — Feature Inventory

**Output:** `docs/08-frontend/06-feature-inventory.md`

For every screen from Phase 4, specify:

- Features & interactions
- Components consumed (links to Phase 6)
- Required API calls (method + path)
- All UI states: **loading (skeleton), empty, error, success, forbidden (`403`), business conflict (arrives as `400`, not `409`), rate limited (`429`)**
- Permission/role gating

**Acceptance:** Every listed API path exists in the backend Swagger/Postman collection (`docs/collections`).

---

### Phase 6 — Component Inventory

**Output:** `docs/08-frontend/07-component-inventory.md`

Catalog reusable components with props contract and states. Tickr-specific components (not generic examples): `EventCard`, `EventFilters`, `TicketTypeSelector`, `ReservationTimer` (countdown for the hold), `PaymentMethodPicker` (Stripe/Konnect/Paymee), `OrderSummary` (commission line — default 6 %, added on top of the subtotal), `TicketCard`, `QrTicket`, `CheckInScanner`, `AnalyticsChart`, `SalesTimelineChart`, `RevenueStat`, plus base primitives (Button, Input, Select, Modal, Drawer, Toast, Skeleton, Badge, Pagination, DatePicker, SearchBar) built on Headless UI.

**Acceptance:** Each component lists its states and maps to at least one screen from Phase 4.

---

### Phase 7 — Design System

**Output:** `docs/08-frontend/08-design-system.md` + Tailwind theme tokens.

- Foundations expressed as **Tailwind 4 theme tokens**: color palette, typography scale, spacing, radius, shadows/elevation, grid, iconography (Heroicons), motion durations/easings.
- Design tokens delivered in a form directly consumable by `tailwind`/CSS variables (so implementation is copy-paste, not re-interpretation).
- Accessibility: contrast ratios (AA), focus-visible states, keyboard nav, responsive breakpoints (`sm/md/lg/xl`).

**Acceptance:** Tokens are exportable to the Tailwind config; contrast verified for text and interactive elements.

---

### Phase 8 — Low-Fidelity Wireframes

**Output:** Figma (or equivalent) B/W wireframes, linked in `docs/08-frontend/09-wireframes.md`.

- Mobile-first, black & white only, no visual styling.
- Cover every screen in Phase 4; validate layout, navigation, and flow.

**Acceptance:** Each Phase 4 screen has a wireframe; reviewed for UX/navigation correctness.

---

### Phase 9 — High-Fidelity Designs

**Output:** Figma hi-fi mockups + link doc in `docs/08-frontend/10-hifi-and-responsive.md`.

- Apply the Phase 7 design system to all Phase 8 wireframes.
- AI-assisted workflow permitted (ChatGPT → Figma Make → Figma Agent → Claude + Figma MCP), but **every screen passes a manual design review** before acceptance.

**Acceptance:** Hi-fi covers all screens; manual review sign-off recorded.

---

### Phase 10 — Responsive & Prototype

**Output:** Responsive specs (mobile / tablet / desktop) + one interactive prototype of the core participant purchase flow, tracked in `docs/08-frontend/10-hifi-and-responsive.md`.

**Acceptance:** Prototype demonstrates the end-to-end purchase journey including at least one failure branch (sold out or payment failed).

---

### Phase 11 — Frontend Architecture

**Output:** `docs/08-frontend/11-frontend-architecture.md`

Define the implementation blueprint, **mirroring backend bounded contexts** as feature modules:

```
frontend/src/
  app/                    # Next.js App Router (route groups per zone)
  features/
    auth/                 # ↔ users/auth backend context
    events/               # ↔ events
    tickets/              # ↔ tickets
    orders/               # ↔ payments/orders
    analytics/            # ↔ analytics
    notifications/        # ↔ notifications
  components/             # shared UI (Phase 6 primitives)
  lib/
    api/                  # axios instance + per-feature API clients
    query/                # react-query keys, hooks, cache config
    auth/                 # token storage, refresh interceptor, role guards
  stores/                 # zustand stores (client state)
  styles/                 # design tokens / Tailwind theme
```

Must specify:

- **API layer:** single axios instance, base URL `/api`, request/response interceptors, **automatic token refresh on `401`**, error normalization to the backend error envelope.
- **Data layer:** react-query key conventions, cache/stale times (`GET /config/public` global config cached ~1h; event-specific config refreshed when ticket selection opens), flat pagination handling.
- **State management:** what lives in zustand (auth/session, reservation timer, UI) vs. react-query (server data).
- **Routing & auth:** role-based route protection (`PARTICIPANT`/`ORGANIZER`/`ADMIN`), redirect rules.
- **Design tokens** wired into Tailwind config.

**Acceptance:** Folder structure and API layer reviewed against backend module boundaries; sample data-flow (event listing) documented end-to-end.

---

## 5. Definition of Done

- [ ] Product Design Brief completed and signed off
- [ ] Information Architecture completed; every route mapped to a role + endpoint
- [ ] User Journeys documented with exact endpoints and success/failure states
- [ ] Screen Inventory reconciled against the route tree (no orphans)
- [ ] Feature Inventory: every API path verified against backend Swagger/Postman
- [ ] Component Inventory with props + states, each mapped to ≥1 screen
- [ ] Design System established as Tailwind-consumable tokens (AA verified)
- [ ] Low-fidelity wireframes for all screens — _spec complete (`09-wireframes.md`, 14 archetypes); Figma frames pending_
- [ ] High-fidelity mockups for all screens (manual review passed) — _process + review gate specified (`10-hifi-and-responsive.md`); Figma pending_
- [ ] Responsive specs + interactive prototype of the purchase flow — _responsive specs delivered (`10-hifi-and-responsive.md` §3–§4); prototype pending_
- [ ] Frontend Architecture documented and mirrors backend modules
- [ ] All deliverable docs committed under `docs/08-frontend/`
- [ ] Ready for React implementation (downstream tickets can be created)

---

## 6. Backend Endpoint Reference (source of truth for this Epic)

> Verified against controllers in `backend/src/modules/**`. All paths are relative to `/api`.

**Config** — `GET /config/public`, optionally `?eventId=<uuid>`, returns global and effective commission, currency and reservation TTL.

**Auth** (`/auth`) — `POST /register`, `POST /login`, `POST /verify-email`, `POST /request-reset`, `POST /reset-password`, `POST /refresh-token`

**Users** (`/users`) — `GET /me`, `PUT /me`, `PATCH /me/password`, `DELETE /me`, `GET /:id`, `GET /` (paginated user list — **ADMIN only**)

**Events** (`/events`) — `GET /` (**PUBLISHED events only**), `GET /search`, `GET /category/:category`, `GET /upcoming`, `GET /:id`, `GET /organizer/:organizerId` (**ORGANIZER/ADMIN only** — there is no public organizer profile), `POST /`, `PUT /:id`, `DELETE /:id`, `POST /:id/publish`, `POST /:id/ticket-types`, `PUT /:id/ticket-types/:typeId`, `DELETE /:id/ticket-types/:typeId`, `POST /:id/image`, `PATCH /:id/commission` (**ADMIN only**; decimal override or `null` to restore global)

**Tickets** (`/tickets`) — `GET /` (own tickets, paginated, `?status=`), `GET /:id`, `GET /:id/pdf`, `POST /:id/transfer`, `POST /cancel`, `POST /check-in`, `GET /event/:eventId/stats` · `POST /reserve` and `POST /confirm` exist but are **never called by the UI**: reservation happens inside `POST /orders`, confirmation inside the payment webhook flow

**Orders / Payments** (`/orders`) — `POST /`, `GET /` (own orders, paginated), `GET /:id`, `POST /:id/pay`, `POST /:id/refund` · Webhooks (server-to-server, not UI): `/payments/webhooks/{stripe,konnect,paymee}`

**Analytics** (`/analytics`) — `GET /events/:id`, `GET /dashboard`, `GET /platform`, `GET /events/:id/sales-timeline`, `GET /revenue-report`, `POST /export`

**Notifications** (`/notifications`) — `POST /`, `GET /me`, `GET /:id`, `GET /preferences/me`, `PUT /preferences/me`, `GET /unsubscribe/:token/:category`

---

## 7. References

- `docs/01-fonctionnel/01-vue-ensemble.md` — actors, workflows, MVP scope
- `docs/01-fonctionnel/02-specifications-detaillees.md` — user stories
- `docs/01-fonctionnel/03-regles-metier.md` — business rules (Tunisia, TND, 6% commission)
- `docs/02-technique/02-api-contract.md` — REST contract
- `docs/03-architecture/*` — hexagonal principles & module architecture
- `docs/collections/` — Postman collections (endpoint verification)
- `AGENTS.md` — code style, import, and naming conventions
- Design benchmarks: Meetup, Fever, Eventbrite, Dice, Shotgun

---

## 8. Notes

This Epic intentionally excludes frontend development. Its outcome is a complete, backend-aligned
UX/UI foundation for the Tunisia-first V1 and a base for Tickr's wider product direction: a global,
market-by-market event platform with future recommendations, opt-in event matching, go-together
flows and organizer-configurable Event Spaces that may be public or limited to verified attendees.
Those capabilities are post-V1 horizons, not current API claims. Any V1 deliverable that cannot be
traced to an implemented backend capability or a defined static page must be flagged for scope
review before design work proceeds.
