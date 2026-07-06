# Phase 11 — Frontend Architecture

| Field | Value |
| --- | --- |
| **Phase** | 11 of 11 |
| **Epic** | [01-frontend-plan-and-design-direction.md](01-frontend-plan-and-design-direction.md) |
| **Status** | ⬜ To Do |
| **Owner** | Frontend Lead |

> **Objective:** Define the implementation blueprint that mirrors the backend bounded contexts, so downstream React tickets can start with zero structural ambiguity.

---

## 1. Folder Structure

```
frontend/src/
  app/                    # Next.js App Router (route groups per zone)
    (public)/             # /, /events, /events/[id], /search, auth
    (participant)/        # /checkout, /tickets, /orders, /profile, /settings
    (organizer)/          # /organizer/*
    (admin)/              # /admin/*
  features/
    auth/                 # ↔ users/auth backend context
    events/               # ↔ events
    tickets/              # ↔ tickets
    orders/               # ↔ payments/orders
    analytics/            # ↔ analytics
    notifications/        # ↔ notifications
  components/             # shared UI (Phase 6 primitives + layout)
  lib/
    api/                  # axios instance + per-feature API clients
    query/                # react-query keys, hooks, cache config
    auth/                 # token storage, refresh interceptor, role guards
  stores/                 # zustand stores (client state)
  styles/                 # design tokens / Tailwind theme
```

Each `features/<module>/` contains: `api.ts` (endpoints), `hooks.ts` (react-query), `types.ts`, `components/`, and `schemas.ts` (zod).

## 2. API Layer
- Single **axios** instance, base URL `/v1`.
- Request interceptor: attach `Authorization: Bearer <access>`.
- Response interceptor: on `401` → attempt `POST /auth/refresh-token` once, retry original request; on failure → clear session, redirect `/login`.
- Normalize errors to the backend envelope `{ statusCode, message, errors[], timestamp }`.

## 3. Data Layer (TanStack Query)
- Query-key conventions: `[feature, entity, params]` (e.g. `['events', 'list', filters]`).
- Cache/stale times:
  - `GET /config/public`: ~1h, with **6% commission fallback** on failure.
  - Lists (`GET /events`): short stale, paginated via API `meta`.
- Mutations invalidate related keys (e.g. reserve → invalidate event, order).

## 4. State Management (zustand vs. react-query)
| Concern | Store |
| --- | --- |
| Auth/session (tokens, current user) | zustand + secure storage |
| Reservation hold timer | zustand |
| UI (modals, drawers, toasts) | zustand |
| All server data (events, orders, tickets, analytics) | react-query |

## 5. Routing & Auth Guards
- Role-based protection per route group: `PARTICIPANT` / `ORGANIZER` / `ADMIN`.
- Redirect rules: unauthenticated → `/login?redirect=`; wrong role → `403` screen.

## 6. Design Tokens Integration
- Phase 7 tokens wired into Tailwind theme (`frontend/src/styles/*`, `@theme`).

## 7. Worked Data-Flow Example (Event Listing)
```
/events (Server Component)
  → lib/api/events.list(page)  (axios GET /v1/events)
  → features/events/hooks useEvents()  (react-query)
  → components/EventCard[]  + Pagination (from meta)
```

---

## Acceptance Criteria
- [ ] Folder structure documented and mirrors backend modules
- [ ] API layer defined (axios instance, `401` auto-refresh, error normalization)
- [ ] Data layer defined (query keys, cache/stale, config fallback)
- [ ] State ownership (zustand vs. react-query) defined
- [ ] Role-based routing/guards defined
- [ ] Design tokens wired into Tailwind
- [ ] One end-to-end data-flow example documented
