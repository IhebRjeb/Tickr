# Phase 4 — Screen Inventory

| Field | Value |
| --- | --- |
| **Phase** | 4 of 11 |
| **Epic** | [01-frontend-plan-and-design-direction.md](01-frontend-plan-and-design-direction.md) |
| **Status** | ⬜ To Do |
| **Owner** | Frontend Lead |

> **Objective:** Exhaustive list of every MVP screen. One row per screen — reconciled against the route tree (Phase 2). No orphan routes, no screens without a route.

---

## Screen List

| Screen | Route | Role | Rendering (SSR/CSR) | Primary endpoint(s) |
| --- | --- | --- | --- | --- |
| Landing | `/` | public | SSR | `GET /events/upcoming` |
| Event Listing | `/events` | public | SSR | `GET /events` |
| Event Details | `/events/[id]` | public | SSR | `GET /events/:id` |
| Search | `/search` | public | CSR | `GET /events/search` |
| Login | `/login` | public | CSR | `POST /auth/login` |
| Register | `/register` | public | CSR | `POST /auth/register` |
| Verify Email | `/verify-email` | public | CSR | `POST /auth/verify-email` |
| Forgot Password | `/forgot-password` | public | CSR | `POST /auth/request-reset` |
| Reset Password | `/reset-password` | public | CSR | `POST /auth/reset-password` |
| Checkout & Payment | `/checkout/[orderId]` | `PARTICIPANT` | CSR | `POST /tickets/reserve`, `POST /orders`, `POST /orders/:id/pay` |
| Orders | `/orders` | `PARTICIPANT` | CSR | `GET /orders` |
| Order Details | `/orders/[id]` | `PARTICIPANT` | CSR | `GET /orders/:id`, `POST /orders/:id/refund` |
| My Tickets | `/tickets` | `PARTICIPANT` | CSR | `GET /tickets/:id` |
| Ticket + QR | `/tickets/[id]` | `PARTICIPANT` | CSR | `GET /tickets/:id`, `GET /tickets/:id/pdf` |
| Notifications | `/notifications` | `PARTICIPANT` | CSR | `GET /notifications/me` |
| Profile | `/profile` | `PARTICIPANT` | CSR | `GET /users/me`, `PUT /users/me` |
| Settings | `/settings` | `PARTICIPANT` | CSR | `PATCH /users/me/password`, `PUT /notifications/preferences/me` |
| Organizer Dashboard | `/organizer` | `ORGANIZER` | CSR | `GET /analytics/dashboard` |
| Organizer Events | `/organizer/events` | `ORGANIZER` | CSR | `GET /events/organizer/:organizerId` |
| Create Event | `/organizer/events/new` | `ORGANIZER` | CSR | `POST /events`, `POST /events/:id/image` |
| Edit Event | `/organizer/events/[id]/edit` | `ORGANIZER` | CSR | `PUT /events/:id`, `POST /events/:id/publish` |
| Ticket Types Config | `/organizer/events/[id]/ticket-types` | `ORGANIZER` | CSR | `POST/PUT/DELETE /events/:id/ticket-types/*` |
| Participants | `/organizer/events/[id]/participants` | `ORGANIZER` | CSR | `GET /tickets/event/:eventId/stats` |
| Event Analytics | `/organizer/events/[id]/analytics` | `ORGANIZER` | CSR | `GET /analytics/events/:id`, `GET /analytics/events/:id/sales-timeline` |
| Scanner | `/organizer/scanner` | `ORGANIZER` | CSR | `POST /tickets/check-in` |
| Admin Dashboard | `/admin` | `ADMIN` | CSR | `GET /analytics/platform` |
| Admin Reports | `/admin/reports` | `ADMIN` | CSR | `GET /analytics/revenue-report`, `POST /analytics/export` |
| Admin Moderation | `/admin/moderation` | `ADMIN` | CSR | `GET /events`, `DELETE /events/:id` |

**Total screens:** _fill count_ · **Reconciled with route tree:** ☐

---

## Acceptance Criteria
- [ ] Screen count reconciles with the Phase 2 route tree
- [ ] No orphan routes, no screens without a route
- [ ] Rendering strategy (SSR/CSR) chosen per screen
- [ ] Each screen lists its primary endpoints
