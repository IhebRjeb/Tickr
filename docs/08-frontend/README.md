# 📚 Frontend Design & Architecture — Deliverables Index

This folder is the **single source of truth** for the Tickr frontend design and architecture
foundation, produced by the Epic **[FRONTEND] Define Frontend Plan & Design Direction**
([issue #64](https://github.com/HexHunters/Tickr/issues/64)).

Each document maps to a phase of the Epic. All eleven specifications are written — the two 🚧 rows
track external Figma artefacts, not missing specification. Implementation follows these documents;
where an older doc elsewhere in `docs/` disagrees with them, these win.

| # | Phase | Document | Status |
| --- | --- | --- | --- |
| — | Epic | [01-frontend-plan-and-design-direction.md](01-frontend-plan-and-design-direction.md) | ✅ Complete |
| 1 | Product Design Brief | [02-product-design-brief.md](02-product-design-brief.md) | ✅ Complete |
| 2 | Information Architecture | [03-information-architecture.md](03-information-architecture.md) | ✅ Complete |
| 3 | User Journey Mapping | [04-user-journeys.md](04-user-journeys.md) | ✅ Complete |
| 4 | Screen Inventory | [05-screen-inventory.md](05-screen-inventory.md) | ✅ Complete |
| 5 | Feature Inventory | [06-feature-inventory.md](06-feature-inventory.md) | ✅ Complete |
| 6 | Component Inventory | [07-component-inventory.md](07-component-inventory.md) | ✅ Complete |
| 7 | Design System | [08-design-system.md](08-design-system.md) | ✅ Complete |
| 8 | Low-Fidelity Wireframes | [09-wireframes.md](09-wireframes.md) | 🚧 Spec complete · Figma pending |
| 9–10 | Hi-Fi, Responsive & Prototype | [10-hifi-and-responsive.md](10-hifi-and-responsive.md) | 🚧 Spec complete · Figma pending |
| 11 | Frontend Architecture | [11-frontend-architecture.md](11-frontend-architecture.md) | ✅ Complete |

**Phases 8–10.** The wireframe frames, responsive rules, review gates and prototype flow are fully
specified here; only the Figma files are outstanding. Execute them against these specs and link them
back into the tracking tables — [Phase 8 §4](09-wireframes.md#4-tracking) and
[Phases 9–10 §6](10-hifi-and-responsive.md#6-coverage-tracker).

---

## Conventions

- **Roles:** `PARTICIPANT`, `ORGANIZER`, `ADMIN` (`user-role.vo.ts`).
- **API base:** `https://api.tickr.tn/api` — global prefix `api` (`API_PREFIX`), **not** `/v1`.
- **Auth:** `Authorization: Bearer <JWT>` (HS256) — access token **7 d**, refresh **30 d** by
  default (`JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN`, `jwt.service.ts:74-75`).
- **Payment gateways:** Konnect (primary TN), Paymee (TN fallback), Stripe (international).
- **Currency:** TND — symbol `DT`, **3 decimals** (millimes). Millimes displayed only when non-zero.
- **Commission:** configurable, default **6 %**, **added on top** of the ticket price.
- **Stack:** Next.js 16 (App Router) · React 19 · TailwindCSS 4 · TanStack Query 5 · axios ·
  react-hook-form + zod · zustand · Headless UI · Heroicons · date-fns. Tests: Vitest + Playwright.
  Dev port **3001**.

Every deliverable must trace back to a real backend endpoint or an explicitly static page.

---

## ⚠️ Verified contract corrections

These deliverables were grounded against `backend/src`. Five claims in the original Epic body do not
match the implemented backend — the documents follow the **code**, and the Epic text has been
corrected to agree ([sources in Epic §1](01-frontend-plan-and-design-direction.md#1-context)):

| Originally stated | Verified reality |
| --- | --- |
| Base path `/v1` | **`/api`** (`main.ts:17`) |
| Commission via `GET /config/public` | **Endpoint does not exist** — no config controller is implemented |
| Pagination `{ data, meta: {…} }` | **Flat** — `{ data, total, page, limit, totalPages, hasNextPage, hasPreviousPage }` |
| Error envelope `{ statusCode, message, errors[], timestamp }` | `{ statusCode, code, message, details, timestamp, path, method }` — only *validation* failures add `errors[]` |
| Sold out `409` · rate limited `429` | Sold out is **`400`**; order-creation rate limiting is **`403`** |

## 🔧 Backend work items this Epic surfaced

Three registers hold the full lists: [Phase 1 §L](02-product-design-brief.md#l-open-contract-questions-for-the-backend)
(nine contract gaps), [Phase 2 §8](03-information-architecture.md#8-open-items-handed-to-other-phases)
(ten items) and [Phase 3 §12](04-user-journeys.md#12-backend-tasks-this-phase-depends-on)
(twenty-five tasks). The eight below block the most product surface, worst first.

1. **Bind a real ticket-reservation implementation.** `TICKET_RESERVATION_PORT` resolves to a
   logging no-op (`TicketReservationAdapter`, `payments.module.ts:117-120`), so the
   `reserveTickets()` call at step 5 of `create-order.handler.ts:137-140` issues no ticket and
   moves no `soldQuantity`. No purchase runs end-to-end.
2. **Send the transactional e-mails, and add `POST /auth/resend-verification`.**
   `POST /auth/register` never mints a verification token — the code is commented out
   (`auth.controller.ts:154-156`) — while `POST /auth/login` returns `403` for
   `emailVerified === false` (`:188`). A new account therefore cannot log in, and nothing can
   resend the link.
3. **Implement `GET /config/public`** (§L 1) — without it the commission rate cannot be shown
   before an order exists, and the frontend must duplicate it in a build-time
   `NEXT_PUBLIC_PLATFORM_COMMISSION_RATE` that will drift the day ops changes the rate.
4. **Add a machine-readable `code` to the error envelope** (§L 2) — the UI cannot tell "sold out"
   from "bad input" (both `400`) without parsing a message string.
5. **Align status-code semantics** (§L 3) — return `409` for business conflicts and `429` for rate
   limiting. Today they arrive as `400` and `403`; no code path emits `409` at all (the shared
   `ConflictException` exists but is never thrown).
6. **Settle the organizer payout model** (§L 8) — `docs/02-technique/04-modele-economique.md`
   shows the organizer netting 47 TND on a 50 TND ticket, but no payout logic exists in the code.
   Organizer surfaces show **gross sales only** until this is resolved.
7. **Resolve `config/payments.config.ts`** (§L 9) — it is absent from
   `ConfigModule.forRoot({ load: [...] })` (`app.module.ts:32`), so its `payments.commission.rate`
   fallback of **4 %** is dead config contradicting the **6 %** the order handler actually reads
   from `PLATFORM_COMMISSION_RATE` (`create-order.handler.ts:41`). Register it or delete it — do
   not leave both.
8. **Let an `ADMIN` act on someone else's event.** `DELETE /events/:id` — a cancellation requiring
   a `{ reason }` body, not a hard delete — is `@Roles('ORGANIZER')` plus `IsEventOwnerGuard`
   (`events.controller.ts:583-584`), and neither guard grants an admin bypass
   (`is-event-owner.guard.ts:78`), so it always `403`s for an admin. `/admin/moderation` ships
   read-only until this exists.

**§L 5 — QR stability — is answered by the code, not by new work.** `TicketDto.qrCode` is a plain
string, `v1-{uuid}-{checksum}` (`ticket.dto.ts:33`, `qr-code.vo.ts`), rendered client-side and
offline; it is regenerated **only** by a transfer (`ticket.entity.ts:461`), so the cache rule is to
invalidate the stored pass when `POST /tickets/:id/transfer` succeeds.

**§L 4, 6 and 7** need a confirmation of intent rather than code — `paymentFees` is exposed but
`setPaymentFees()` is never called, `PUSH` is in `NotificationChannel` but rejected by
`isSupportedChannel`, and an event carries one image. The UI is already specified around all three.
