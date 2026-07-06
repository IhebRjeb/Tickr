# Phase 3 — User Journey Mapping

| Field | Value |
| --- | --- |
| **Phase** | 3 of 11 |
| **Epic** | [01-frontend-plan-and-design-direction.md](01-frontend-plan-and-design-direction.md) |
| **Status** | ⬜ To Do |
| **Owner** | Product Design / Frontend Lead |

> **Objective:** Document every user journey as *step → screen → API call → result state*, reflecting the real **reserve → order → pay → confirm** flow. Each journey defines the UI state for success **and** every failure branch.

---

## 1. Participant — Purchase (happy path)

| Step | Screen | API call | Success state | Failure branch |
| --- | --- | --- | --- | --- |
| 1. Discover / search | `/`, `/search` | `GET /events`, `GET /events/search` | List rendered | Empty search |
| 2. View event | `/events/[id]` | `GET /events/:id` | Details + ticket types | `404` not found |
| 3. Reserve tickets | `/events/[id]` | `POST /tickets/reserve` | Hold created + timer starts | `409` sold out |
| 4. Create order | `/checkout/[orderId]` | `POST /orders` | Order summary (with 6% line) | Hold expired |
| 5. Pay | `/checkout/[orderId]` | `POST /orders/:id/pay` | Redirect to gateway | Payment failed |
| 6. Confirm | `/checkout/[orderId]` | poll `GET /orders/:id` → `POST /tickets/confirm` | Confirmation | Timeout / pending |
| 7. View ticket | `/tickets/[id]` | `GET /tickets/:id`, `GET /tickets/:id/pdf` | QR + PDF download | — |

> Gateways: Konnect (primary TN), Paymee (fallback), Stripe (international). The `PaymentMethodPicker` selects the provider passed to `POST /orders/:id/pay`.

## 2. Participant — Account
- Register / verify email: `POST /auth/register` → `POST /auth/verify-email`
- Login + token refresh: `POST /auth/login`, silent `POST /auth/refresh-token` on `401`
- Reset password: `POST /auth/request-reset` → `POST /auth/reset-password`
- Manage profile: `GET/PUT /users/me`, `PATCH /users/me/password`

## 3. Organizer
| Journey | Steps → endpoints |
| --- | --- |
| Create & publish event | `POST /events` → `POST /events/:id/ticket-types` → `POST /events/:id/image` → `POST /events/:id/publish` |
| View analytics | `GET /analytics/dashboard`, `GET /analytics/events/:id`, `GET /analytics/events/:id/sales-timeline` |
| Manage participants | `GET /tickets/event/:eventId/stats` |
| Check-in at door | `POST /tickets/check-in` |

## 4. Admin
- Platform metrics: `GET /analytics/platform`
- Reports & export: `GET /analytics/revenue-report`, `POST /analytics/export`
- Moderation: `GET /events`, `DELETE /events/:id`

## 5. Edge Cases (each needs a defined screen/state)

| Edge case | Trigger | UI state |
| --- | --- | --- |
| Reservation hold expired | Timer reaches 0 | Return to event, notify |
| Payment failed | `POST /orders/:id/pay` fails | Retry / choose other gateway |
| Session expired | `401` on any call | Silent refresh → else redirect to `/login` |
| Sold out | `409` on reserve | Disable purchase, show waitlist/CTA |
| Refund | `POST /orders/:id/refund` | Refund status + timeline |
| Event cancelled | Event status `CANCELLED` | Banner + refund info |
| Empty organizer dashboard | No events | Onboarding empty state |
| Empty search | No results | Suggestions / clear filters |
| No notifications | Empty list | Empty state |
| Rate limited | `429` | Friendly retry message |

---

## Acceptance Criteria
- [ ] Every journey names exact endpoints (method + path)
- [ ] Success **and** each failure branch has a defined UI state
- [ ] Reservation-hold timer behavior documented
- [ ] Token-refresh (`401`) flow documented
- [ ] All edge cases mapped to a screen/state
