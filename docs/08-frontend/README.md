# 📚 Frontend Design & Architecture — Deliverables Index

This folder is the **single source of truth** for the Tickr frontend design and architecture
foundation, produced by the Epic **[FRONTEND] Define Frontend Plan & Design Direction**
([issue #64](https://github.com/HexHunters/Tickr/issues/64)).

Each document maps to a phase of the Epic. Do not start React implementation until every
deliverable below is marked ✅.

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

**Phases 8–10 note.** The specifications, wireframe layouts, responsive rules, review gates and
prototype flow are fully documented here. The Figma artefacts themselves are external deliverables
— execute them against these specs and link them back into the two documents above.

---

## Conventions

- **Roles:** `PARTICIPANT`, `ORGANIZER`, `ADMIN`.
- **API base:** `https://api.tickr.tn/api` — global prefix `api` (`API_PREFIX`), **not** `/v1`.
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
corrected to agree:

| Originally stated | Verified reality |
| --- | --- |
| Base path `/v1` | **`/api`** (`main.ts:17`) |
| Commission via `GET /config/public` | **Endpoint does not exist** — no config controller is implemented |
| Pagination `{ data, meta: {…} }` | **Flat** — `{ data, total, page, limit, totalPages, hasNextPage, hasPreviousPage }` |
| Error envelope `{ statusCode, message, errors[], timestamp }` | `{ statusCode, message, error, timestamp, path }` |
| Sold out `409` · rate limited `429` | Sold out is **`400`**; order-creation rate limiting is **`403`** |

## 🔧 Backend work items this Epic surfaced

Tracked in detail in [Phase 1 §L](02-product-design-brief.md#l-open-contract-questions-for-the-backend):

1. **Implement `GET /config/public`** — without it the frontend cannot show the commission rate
   before an order exists, and must duplicate it in a build-time constant that will drift.
2. **Add a machine-readable `code` to the error envelope** — the UI currently cannot distinguish
   "sold out" from "bad input" (both `400`) without parsing a message string.
3. **Align status-code semantics** — `409` for business conflicts, `429` for rate limiting.
4. **Settle the organizer payout model** — `04-modele-economique.md` shows the organizer netting
   47 TND on a 50 TND ticket, but no payout logic exists in the code. This blocks all organizer
   revenue UI; until resolved, organizer surfaces show **gross sales only**.
5. **Resolve `config/payments.config.ts`** — it is not registered in `ConfigModule.load`
   (`app.module.ts:32`), so its `payments.commission.rate` fallback of **4 %** is dead config
   contradicting the **6 %** the order handler actually applies (`create-order.handler.ts:41`).
   Register it or delete it — do not leave both.
6. **Give admins a working takedown** — neither `RolesGuard` nor `IsEventOwnerGuard` grants an
   admin bypass, so `DELETE /events/:id` always `403`s for an admin. `/admin/moderation` ships
   read-only until this exists.
7. **Add `POST /auth/resend-verification`** — `POST /auth/login` returns `403` for an unverified
   email, and there is currently no way for the user to get a new link.
8. **Confirm QR-string stability** — `TicketDto.qrCode` is already a client-renderable string
   (`v1-{uuid}-{checksum}`), so offline tickets work as designed. The only open question is whether
   it may be rotated, which decides the cache policy.
