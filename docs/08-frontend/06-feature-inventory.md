# Phase 5 — Feature Inventory

| Field | Value |
| --- | --- |
| **Phase** | 5 of 11 |
| **Epic** | [01-frontend-plan-and-design-direction.md](01-frontend-plan-and-design-direction.md) |
| **Status** | ⬜ To Do |
| **Owner** | Frontend Lead |

> **Objective:** For every screen from Phase 4, specify features, components, required APIs, and all UI states. Every listed API path must exist in the backend Swagger/Postman collection (`docs/collections`).

---

## Template (repeat per screen)

### `<Screen name>` — `<route>` (`<role>`)

- **Features / interactions:**
- **Components consumed:** _(link to Phase 6)_
- **Required APIs:** `<METHOD> <path>` …
- **Permissions:** `<role>` gating rules
- **States:**
  | State | Condition | UI |
  | --- | --- | --- |
  | Loading | request in flight | Skeleton |
  | Empty | no data | Empty state |
  | Success | data loaded | Content |
  | Error | `500` / network | Error + retry |
  | Forbidden | `403` | Access-denied |
  | Conflict | `409` (e.g. sold out) | Contextual message |
  | Unauthorized | `401` | Refresh → login |
  | Rate limited | `429` | Retry message |

---

## Worked example — Event Details (`/events/[id]`, public)

- **Features:** view event info, select ticket type + quantity, start reservation, share.
- **Components:** `EventHeader`, `TicketTypeSelector`, `ReservationTimer` (post-reserve), `Button`, `Badge`.
- **Required APIs:** `GET /events/:id`, `POST /tickets/reserve`.
- **Permissions:** public to view; auth required to reserve (redirect to `/login` if `401`).
- **States:**
  | State | Condition | UI |
  | --- | --- | --- |
  | Loading | fetching event | Skeleton details |
  | Success | event loaded | Full details + ticket types |
  | Empty | no ticket types | "Sales not open" |
  | Not found | `404` | Not-found screen |
  | Conflict | `409` on reserve | "Sold out" |
  | Unauthorized | `401` on reserve | Redirect to `/login` |

---

## Screens to complete
_One section per screen from [05-screen-inventory.md](05-screen-inventory.md)._ 

- [ ] Landing
- [ ] Event Listing
- [ ] Event Details
- [ ] Search
- [ ] Auth screens (Login, Register, Verify Email, Forgot/Reset Password)
- [ ] Checkout & Payment
- [ ] Orders / Order Details
- [ ] My Tickets / Ticket + QR
- [ ] Notifications
- [ ] Profile / Settings
- [ ] Organizer (Dashboard, Events, Create/Edit, Ticket Types, Participants, Analytics, Scanner)
- [ ] Admin (Dashboard, Reports, Moderation)

---

## Acceptance Criteria
- [ ] Every screen has features, components, APIs, permissions, and all states
- [ ] Every API path verified against `docs/collections` (Postman)
- [ ] Loading/empty/error/success + `401/403/409/429` states defined where applicable
