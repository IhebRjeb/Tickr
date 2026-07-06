# Phase 6 — Component Inventory

| Field | Value |
| --- | --- |
| **Phase** | 6 of 11 |
| **Epic** | [01-frontend-plan-and-design-direction.md](01-frontend-plan-and-design-direction.md) |
| **Status** | ⬜ To Do |
| **Owner** | Frontend Lead / Design System |

> **Objective:** Catalog every reusable component with its props contract and states. Built on Headless UI primitives + Tailwind. Each component maps to ≥1 screen from Phase 4.

---

## 1. Base primitives (generic)

| Component | Props (draft) | States | Notes |
| --- | --- | --- | --- |
| `Button` | `variant`, `size`, `loading`, `disabled` | default/hover/focus/active/disabled/loading | Headless focus-visible |
| `Input` | `label`, `error`, `type` | default/focus/error/disabled | react-hook-form compatible |
| `Select` / `Dropdown` | `options`, `value`, `onChange` | open/closed/disabled | `@headlessui/react` |
| `Modal` | `open`, `onClose`, `title` | open/closed | Dialog primitive |
| `Drawer` | `open`, `side` | open/closed | mobile filters |
| `Toast` | `type`, `message` | info/success/error | global provider |
| `Skeleton` | `variant` | pulsing | per-screen loaders |
| `Badge` | `variant` | status colors | event/ticket status |
| `Pagination` | `page`, `totalPages` | — | matches API `meta` |
| `DatePicker` | `value`, `min`, `max` | — | date-fns |
| `SearchBar` | `value`, `onSearch` | idle/typing/loading | → `GET /events/search` |

## 2. Domain components (Tickr-specific)

| Component | Backed by | States | Screens |
| --- | --- | --- | --- |
| `EventCard` | `GET /events` item | loading/loaded | Landing, Listing, Search |
| `EventFilters` | category/date/city | — | Listing, Search |
| `TicketTypeSelector` | event ticket types | available/sold-out | Event Details, Checkout |
| `ReservationTimer` | reservation hold | counting/expired | Event Details, Checkout |
| `PaymentMethodPicker` | Konnect/Paymee/Stripe | selected/disabled | Checkout |
| `OrderSummary` | order + 6% commission | loading/loaded | Checkout, Order Details |
| `TicketCard` | `GET /tickets/:id` | valid/used/refunded | My Tickets |
| `QrTicket` | ticket QR payload | rendered | Ticket + QR |
| `CheckInScanner` | camera → `POST /tickets/check-in` | scanning/valid/invalid | Scanner |
| `AnalyticsChart` | `GET /analytics/events/:id` | loading/loaded/empty | Analytics |
| `SalesTimelineChart` | `GET /analytics/events/:id/sales-timeline` | loading/loaded/empty | Analytics |
| `RevenueStat` | `GET /analytics/*` | loading/loaded | Dashboards |
| `NotificationItem` | `GET /notifications/me` | read/unread | Notifications |

## 3. Layout & navigation

| Component | Scope | Notes |
| --- | --- | --- |
| `TopNav` | public/participant | responsive |
| `BottomNav` | participant mobile | mobile-first |
| `Sidebar` | organizer/admin | collapsible |
| `PageShell` | all | header/footer/container |

---

## Acceptance Criteria
- [ ] Each component lists props contract and all visual states
- [ ] Each component maps to ≥1 screen from Phase 4
- [ ] Primitives built on Headless UI; no extra UI framework introduced
- [ ] Domain components reference the exact endpoint(s) they consume
