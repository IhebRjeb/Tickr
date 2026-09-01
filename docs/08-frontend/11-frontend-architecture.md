# Phase 11 — Frontend Architecture

| Field          | Value                                                                                                             |
| -------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Phase**      | 11 of 11                                                                                                          |
| **Epic**       | [01-frontend-plan-and-design-direction.md](01-frontend-plan-and-design-direction.md)                              |
| **Status**     | ✅ Complete                                                                                                       |
| **Owner**      | Frontend Lead                                                                                                     |
| **Depends on** | [Phase 2](03-information-architecture.md) · [Phase 6](07-component-inventory.md) · [Phase 7](08-design-system.md) |

> **Objective:** The implementation blueprint. Folder structure mirroring the backend's bounded
> contexts, the API layer, the data layer, state ownership, routing and auth — specific enough that
> the first pull request is mechanical.

---

## Contents

|        | Section                                                                                  |
| ------ | ---------------------------------------------------------------------------------------- |
| **1**  | [Folder structure](#1-folder-structure)                                                  |
| **2**  | [The API layer](#2-the-api-layer)                                                        |
| **3**  | [The data layer](#3-the-data-layer)                                                      |
| **4**  | [State ownership](#4-state-ownership)                                                    |
| **5**  | [Routing and auth](#5-routing-and-auth)                                                  |
| **6**  | [Forms and validation](#6-forms-and-validation)                                          |
| **7**  | [Worked example — event listing end to end](#7-worked-example--event-listing-end-to-end) |
| **8**  | [Testing strategy](#8-testing-strategy)                                                  |
| **9**  | [Environment variables](#9-environment-variables)                                        |
| **10** | [Conventions and enforcement](#10-conventions-and-enforcement)                           |
| —      | [Acceptance Criteria](#acceptance-criteria)                                              |

---

## 0. Contract corrections this architecture is built on

| Issue #64 stated                            | Verified reality                                                                                                                                                                                                                                                   | Architectural consequence                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Base path `/v1`                             | **`/api`** (`main.ts:17`)                                                                                                                                                                                                                                          | `NEXT_PUBLIC_API_URL` default must be `…/api`                                             |
| Commission via `GET /config/public`         | **Implemented**, including `?eventId=<uuid>` effective-rate resolution                                                                                                                                                                                             | React Query owns global and event-specific config; no frontend commission env duplication |
| Pagination `{ data, meta: {…} }`            | **Flat**: `{ data, total, page, limit, totalPages }` everywhere, plus `hasNextPage` / `hasPreviousPage` on events, tickets and users but **not** on `GET /orders` (`get-orders-by-user.handler.ts:60-66`)                                                          | One `Paginated<T>` type with the two flags optional, no `meta` unwrapping                 |
| Error envelope with `errors[]`              | The only registered filter emits `{ statusCode, code, message, details, timestamp, path, method }` (`all-exceptions.filter.ts:53-61`). `code` is the HTTP reason phrase, not a domain code; validation arrives as `message: string[]` and `errors[]` never appears | `normalizeError()` reads field errors off `message[]`                                     |
| Sold out `409`, rate limit `429`            | Sold out is **`400`**; order-creation rate limiting is **`403`**. Nothing emits `409` or `204`; a `DomainException` escaping a value object is **`422`** (`all-exceptions.filter.ts:45-46`)                                                                        | `normalizeError()` keys off status **plus endpoint context**                              |
| `POST /orders` then `POST /tickets/reserve` | `POST /orders` reserves internally at step 5 (`create-order.handler.ts:140-146`)                                                                                                                                                                                   | One write in the participant flow. `features/tickets` exposes no reserve call             |

---

## 1. Folder structure

Feature modules mirror the backend's six bounded contexts one-to-one, so a change on either side has
an obvious counterpart.

```
frontend/src/
├── app/                              # Next.js App Router — see Phase 4 §9
│   ├── (public)/  (auth)/  (participant)/  (organizer)/  (admin)/
│   ├── checkout/[orderId]/           # deliberately OUTSIDE (participant): no nav, no exits
│   ├── layout.tsx  error.tsx  not-found.tsx  global-error.tsx
│
├── features/                         # ↔ backend bounded contexts
│   ├── auth/          { api.ts, queries.ts, schemas.ts, components/, hooks/ }
│   ├── events/        # ↔ events
│   ├── tickets/       # ↔ tickets
│   ├── orders/        # ↔ payments/orders
│   ├── analytics/     # ↔ analytics
│   └── notifications/ # ↔ notifications
│
├── components/
│   ├── ui/                           # base primitives (Phase 6 §4)
│   └── layout/                       # headers, sidebars, tab bars, shells
│
├── lib/
│   ├── api/  { client.ts, errors.ts, types.ts }
│   ├── query/{ keys.ts, config.ts, pagination.ts }
│   ├── auth/ { storage.ts, guards.ts }
│   ├── config/commission.ts          # query helpers for global/effective commission config
│   ├── format/money.ts  format/date.ts
│   └── utils.ts                      # cn()
│
├── stores/                           # zustand — client state only
└── styles/                           # globals.css + @theme tokens (Phase 7)
```

**Layer rule.** `app/` composes; `features/` owns domain logic and data access; `components/ui` is
domain-free and must never import from `features/`. A UI primitive that knows what an order is has
been built in the wrong place.

---

## 2. The API layer

### 2.1 The defect this replaces

`frontend/src/lib/api/client.ts` today drops `accessToken` and hard-redirects to `/auth/login` on
**any** `401`, with no refresh attempt — even though `POST /auth/refresh-token` exists, is `@Public()`
and skips throttling (`auth.controller.ts:352-354`). A token expiring mid-checkout would destroy the
user's order context. Two smaller faults ride along: `/auth/login` is not a route in the canonical
tree (`/login` is), and `baseURL` omits the `/api` prefix. All three are fixed below.

### 2.2 Axios instance with single-flight refresh

```ts
// lib/api/client.ts
import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
} from "@/lib/auth/storage";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api",
  timeout: Number(process.env.NEXT_PUBLIC_API_TIMEOUT ?? 30_000),
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On these, a 401 IS the answer — bad credentials, a dead refresh token. Refreshing would loop
// and would wipe a session over a mistyped password.
const NO_REFRESH =
  /\/auth\/(login|register|refresh-token|request-reset|reset-password)$/;

// ---- single-flight refresh -------------------------------------------------
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("NO_REFRESH_TOKEN");

  // Bare axios, not apiClient — otherwise a 401 here would recurse through this interceptor.
  // The endpoint returns { accessToken, expiresIn } and nothing else: the refresh token is NOT
  // rotated (auth.controller.ts:69-72), so storage keeps the one it already holds.
  const { data } = await axios.post<{ accessToken: string; expiresIn: number }>(
    `${apiClient.defaults.baseURL}/auth/refresh-token`,
    { refreshToken },
  );
  setAccessToken(data.accessToken);
  return data.accessToken;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retried?: boolean })
      | undefined;

    if (
      error.response?.status !== 401 ||
      !original ||
      original._retried ||
      NO_REFRESH.test(original.url ?? "")
    ) {
      return Promise.reject(error);
    }
    original._retried = true; // replay once, never twice

    try {
      // Concurrent 401s all await the same refresh, then replay.
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      await refreshPromise;
      return apiClient(original); // the request interceptor re-reads the fresh token
    } catch {
      clearSession();
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/login")
      ) {
        // Preserve where they were so checkout state survives re-auth.
        const next = encodeURIComponent(
          window.location.pathname + window.location.search,
        );
        window.location.href = `/login?next=${next}`;
      }
      return Promise.reject(error);
    }
  },
);
```

**Why single-flight matters.** A checkout screen fires several authenticated requests at once. Without
the shared promise each `401` starts its own `POST /auth/refresh-token`, and several storage writes
race with no way to tell which one won. One refresh, N replays, one write.

**Why the path exists at all**, given that `JWT_EXPIRES_IN` defaults to **`7d`** and
`JWT_REFRESH_EXPIRES_IN` to `30d` (`jwt.service.ts:74-75`): the default is an env var an operator can
tighten to minutes without a frontend release, and a `401` also follows a secret rotation. Never
pre-emptively refresh on a timer derived from `7d`. ⚠ `docs/02-technique/02-api-contract.md` says
24 h and is stale; `jwt.service.ts` is the authority.

### 2.3 Error normalisation

```ts
// lib/api/errors.ts
import axios from "axios";

export type ApiErrorKind =
  | "VALIDATION"
  | "UNAUTHENTICATED"
  | "EMAIL_UNVERIFIED"
  | "FORBIDDEN_ROLE"
  | "FORBIDDEN_OWNER"
  | "NOT_AVAILABLE"
  | "RATE_LIMITED"
  | "TICKET_LIMIT"
  | "NOT_FOUND"
  | "SOLD_OUT"
  | "ORDER_EXPIRED"
  | "PAYMENT_FAILED"
  | "THROTTLED"
  | "SERVER"
  | "NETWORK"
  | "UNKNOWN";

export interface ApiError {
  kind: ApiErrorKind;
  status: number;
  message: string;
  fieldErrors?: Record<string, string>;
  raw?: unknown;
}

/**
 * What `AllExceptionsFilter` actually emits (`all-exceptions.filter.ts:53-61`). `code` is the HTTP
 * reason phrase — 'Bad Request', 'Forbidden' — not the discriminator we need (Phase 1 §L gap 2).
 * `error` / `errors[]` come from `ValidationExceptionFilter`, which is registered nowhere: absent.
 */
interface BackendEnvelope {
  statusCode: number;
  code?: string;
  message?: string | string[];
  details?: unknown;
  timestamp?: string;
  path?: string;
  method?: string;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
}

/** A `class-validator` message begins with the property: "email must be an email". */
function fieldErrorsFrom(
  data: BackendEnvelope,
): Record<string, string> | undefined {
  if (data.errors?.length) {
    return Object.fromEntries(data.errors.map((e) => [e.field, e.message]));
  }
  if (!Array.isArray(data.message)) return undefined;
  const out: Record<string, string> = {};
  for (const line of data.message) {
    const field = line.split(" ")[0];
    if (field && !(field in out)) out[field] = line;
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * ⚠ TEMPORARY SHIM.
 * The backend discards its domain error types at the controller boundary, so "sold out" and
 * "bad input" both arrive as 400, and RATE_LIMITED arrives as 403 — indistinguishable from a
 * permissions failure. Until a machine-readable `code` is added to the envelope
 * (Phase 1 §L gap 2), we disambiguate by status + endpoint context, in THIS ONE PLACE.
 * Phases 2 and 4 call this function `mapApiError()`; it is the same function.
 */
export function normalizeError(
  error: unknown,
  context?: { endpoint?: string },
): ApiError {
  if (!axios.isAxiosError(error)) {
    return {
      kind: "UNKNOWN",
      status: 0,
      message: "Une erreur inattendue est survenue.",
      raw: error,
    };
  }
  if (!error.response) {
    return {
      kind: "NETWORK",
      status: 0,
      message: "Connexion perdue.",
      raw: error,
    };
  }

  const { status, data } = error.response as {
    status: number;
    data: BackendEnvelope;
  };
  const text = Array.isArray(data?.message)
    ? data.message.join(" ")
    : (data?.message ?? "");
  const endpoint = context?.endpoint;

  switch (status) {
    case 400:
      // Order matters. EVENT_NOT_PUBLISHED reads "Event is not available for ticket purchase"
      // (create-order.handler.ts:68-70), so match the stock wording, never a bare /available/.
      if (/tickets? available|became unavailable|sold out/i.test(text)) {
        return { kind: "SOLD_OUT", status, message: text };
      }
      if (/maximum tickets per event/i.test(text)) {
        return { kind: "TICKET_LIMIT", status, message: text }; // 10 per user per event
      }
      if (/expired/i.test(text))
        return { kind: "ORDER_EXPIRED", status, message: text };
      if (/gateway|payment/i.test(text))
        return { kind: "PAYMENT_FAILED", status, message: text };
      return {
        kind: "VALIDATION",
        status,
        message: text || "Données invalides.",
        fieldErrors: fieldErrorsFrom(data),
      };
    case 401:
      return { kind: "UNAUTHENTICATED", status, message: text };
    case 403:
      // One status, eight verified causes. Phase 2 §5.3 holds the table; these four are the
      // ones a status code alone cannot separate.
      if (endpoint === "POST /orders") {
        return { kind: "RATE_LIMITED", status, message: text }; // business limit, not permission
      }
      if (endpoint === "POST /auth/login") {
        // `emailVerified === false`, and only that — a deactivated account is a 401
        // (`local.strategy.ts:73`). No resend endpoint exists, so this copy offers no action.
        return { kind: "EMAIL_UNVERIFIED", status, message: text };
      }
      if (endpoint === "GET /events/:id") {
        // Non-PUBLISHED event, non-owner. Renders as "not available", never as "forbidden":
        // naming a draft leaks its existence.
        return { kind: "NOT_AVAILABLE", status, message: text };
      }
      if (/permission to modify this event|own events/i.test(text)) {
        return { kind: "FORBIDDEN_OWNER", status, message: text };
      }
      return { kind: "FORBIDDEN_ROLE", status, message: text }; // RolesGuard: 'Access denied'
    case 404:
      return { kind: "NOT_FOUND", status, message: text };
    case 422:
      // A DomainException escaping a value object (`all-exceptions.filter.ts:45-46`) — an invalid
      // date range on POST /events, for one. Form-level, never field-level: there is no property.
      return { kind: "VALIDATION", status, message: text };
    case 429:
      return { kind: "THROTTLED", status, message: text };
    default:
      return status >= 500
        ? {
            kind: "SERVER",
            status,
            message: "Le service est momentanément indisponible.",
          }
        : { kind: "UNKNOWN", status, message: text };
  }
}
```

**Never render `message` directly to a user.** `kind` selects French copy from a single catalogue.

`409` is now used for duplicate check-in staff assignment; other business conflicts still commonly
arrive as `400`. `429` is active through the global `ThrottlerGuard` in `AppModule`: the general
buckets are 3 req/s, 20 req/10 s and 100/min, with stricter assignment and higher-throughput scanner
overrides. Handle both statuses from day one.

### 2.4 Shared types

```ts
// lib/api/types.ts — the FLAT pagination envelope. There is no `meta`.
//
// Five fields are universal. hasNextPage / hasPreviousPage come from events, tickets and users but
// NOT from GET /orders, which builds a five-field PaginatedOrdersDto
// (`get-orders-by-user.handler.ts:60-66`). Optional here; `pageFlags()` derives them.
export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

export function pageFlags(
  p: Pick<
    Paginated<unknown>,
    "page" | "totalPages" | "hasNextPage" | "hasPreviousPage"
  >,
) {
  return {
    hasNextPage: p.hasNextPage ?? p.page < p.totalPages,
    hasPreviousPage: p.hasPreviousPage ?? p.page > 1,
  };
}

export type UserRole = "PARTICIPANT" | "ORGANIZER" | "ADMIN";
export type OrderStatus =
  | "PENDING"
  | "PROCESSING"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";
export type TicketStatus =
  | "RESERVED"
  | "CONFIRMED"
  | "CANCELLED"
  | "CHECKED_IN"
  | "EXPIRED";
export type PaymentMethod = "STRIPE" | "KONNECT" | "PAYMEE";
export type EventStatus = "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED";
```

### 2.5 Feature API modules

```ts
// features/events/api.ts
import { apiClient } from "@/lib/api/client";
import type { Paginated } from "@/lib/api/types";

// The seven filters on EventFilterDto, plus pagination and sort. No `q`: GET /events has no such
// field and `forbidNonWhitelisted` is on (`main.ts:31`), so sending one is a 400. Free text goes
// to `search()` and nowhere else.
export interface EventFilters {
  category?: EventCategory;
  city?: string;
  country?: string;
  dateFrom?: string;
  dateTo?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?:
    | "startDate"
    | "endDate"
    | "title"
    | "totalCapacity"
    | "soldTickets"
    | "publishedAt"
    | "createdAt"
    | "updatedAt";
  sortOrder?: "ASC" | "DESC";
  page?: number;
  limit?: number; // limit is capped at 100 by the DTO
}

export const eventsApi = {
  list: (f: EventFilters) =>
    apiClient
      .get<Paginated<EventListItem>>("/events", { params: f })
      .then((r) => r.data),
  // Takes q, page and limit — and nothing else. Filters passed here are silently ignored, which
  // is why /search has no facets and refines by deep-linking out to /events (Phase 4 §7.2).
  search: (q: string, page = 1, limit = 20) =>
    apiClient
      .get<
        Paginated<EventListItem>
      >("/events/search", { params: { q, page, limit } })
      .then((r) => r.data),
  upcoming: (limit = 10) =>
    apiClient
      .get<Paginated<EventListItem>>("/events/upcoming", { params: { limit } })
      .then((r) => r.data),
  byId: (id: string) =>
    apiClient.get<EventDetail>(`/events/${id}`).then((r) => r.data),
  // ORGANIZER | ADMIN only, and the controller additionally requires user.userId === organizerId
  // unless ADMIN (`events.controller.ts:426`). There is no public organizer profile to build on.
  byOrganizer: (organizerId: string, page = 1) =>
    apiClient
      .get<
        Paginated<EventListItem>
      >(`/events/organizer/${organizerId}`, { params: { page } })
      .then((r) => r.data),
  checkInAccess: (page = 1) =>
    apiClient
      .get<
        Paginated<CheckInEvent>
      >("/events/check-in-access/me", { params: { page } })
      .then((r) => r.data),
  assignCheckInStaff: (eventId: string, email: string) =>
    apiClient
      .post<EventStaffAssignment>(`/events/${eventId}/check-in-staff`, {
        email,
      })
      .then((r) => r.data),
  revokeCheckInStaff: (eventId: string, assignmentId: string) =>
    apiClient.delete(`/events/${eventId}/check-in-staff/${assignmentId}`),
};
```

```ts
// features/orders/api.ts — the money path
export const ordersApi = {
  /** Creates the order AND reserves the tickets. Never call POST /tickets/reserve alongside this. */
  create: (body: CreateOrderBody) =>
    apiClient.post<CreatedOrder>("/orders", body).then((r) => r.data),
  byId: (id: string) =>
    apiClient.get<Order>(`/orders/${id}`).then((r) => r.data),
  list: (page = 1) =>
    apiClient
      .get<Paginated<Order>>("/orders", { params: { page } })
      .then((r) => r.data),
  pay: (id: string, paymentMethod: PaymentMethod, idempotencyKey?: string) =>
    apiClient
      .post<PaymentIntent>(`/orders/${id}/pay`, {
        paymentMethod,
        idempotencyKey,
      })
      .then((r) => r.data),
  refund: (id: string, reason: string) =>
    apiClient
      .post<Refund>(`/orders/${id}/refund`, { reason })
      .then((r) => r.data),
};

// POST /orders returns a receipt, not an Order (`create-order.command.ts:23-30`). The key is
// `orderId`, not `id`, and `status` / `items` / `paymentFees` arrive only on GET /orders/:id.
export interface CreatedOrder {
  orderId: string;
  subtotal: number;
  platformFee: number; // authoritative; retires the indicative estimate of §3.3
  total: number; // subtotal + platformFee
  currency: string;
  expiresAt: string; // 15 min out — this drives every countdown
}

// POST /orders/:id/pay (`process-payment.command.ts:13-18`). No `status` field: the order's
// status comes from polling GET /orders/:id (§3.4).
export interface PaymentIntent {
  orderId: string;
  gatewayRef: string;
  paymentUrl?: string; // Konnect / Paymee — redirect
  clientSecret?: string; // Stripe — in-page
}
```

`idempotencyKey` is optional and, when sent, must be a **UUID** (`request.dto.ts:96-98`): generate one
per payment attempt and reuse it across retries of that attempt.

---

## 3. The data layer

### 3.1 Query key factory

```ts
// lib/query/keys.ts
export const queryKeys = {
  events: {
    all: ["events"] as const,
    list: (f: EventFilters) => [...queryKeys.events.all, "list", f] as const,
    search: (q: string, page: number) =>
      [...queryKeys.events.all, "search", q, page] as const,
    upcoming: () => [...queryKeys.events.all, "upcoming"] as const,
    detail: (id: string) => [...queryKeys.events.all, "detail", id] as const,
    byOrganizer: (id: string, page: number) =>
      [...queryKeys.events.all, "organizer", id, page] as const,
  },
  orders: {
    all: ["orders"] as const,
    list: (page: number) => [...queryKeys.orders.all, "list", page] as const,
    detail: (id: string) => [...queryKeys.orders.all, "detail", id] as const,
  },
  tickets: {
    all: ["tickets"] as const,
    list: (page: number) => [...queryKeys.tickets.all, "list", page] as const,
    detail: (id: string) => [...queryKeys.tickets.all, "detail", id] as const,
  },
  analytics: {
    /* dashboard, event, timeline, platform, revenueReport */
  },
  notifications: {
    /* list, detail, preferences */
  },
  me: ["me"] as const,
} as const;
```

Filters are part of the key, so a URL change is a cache change — no manual invalidation on navigation.
`events.search` keys on `q` and `page` alone, because those are the only inputs the endpoint reads.

### 3.2 Cache policy

| Resource                 | `staleTime` | `gcTime` | Rationale                                                                                                 |
| ------------------------ | ----------- | -------- | --------------------------------------------------------------------------------------------------------- |
| `events.list` / `search` | 30 s        | 5 min    | Availability moves; a stale card is tolerable, a stale checkout is not                                    |
| `events.detail`          | 30 s        | 5 min    | Same, and `refetchOnWindowFocus` catches returns from a redirect                                          |
| `orders.detail`          | **0**       | 1 min    | Money. Always authoritative                                                                               |
| `tickets.*`              | 60 s        | **24 h** | Long `gcTime` deliberately — the pass must survive an offline load at the door                            |
| `me`                     | 5 min       | 30 min   | Rarely changes                                                                                            |
| `analytics.*`            | 2 min       | 10 min   | Aggregates; `lastUpdated` (`event-analytics.dto.ts:20`) rendered verbatim rather than as « il y a N min » |
| `config.global`          | 1 h         | 24 h     | Global environment-backed commission and TTL change rarely                                                |
| `config.event(eventId)`  | 0           | 5 min    | Refetch when ticket selection opens; Admin overrides affect new orders only                               |

This table governs React Query only; the per-route document strategy is
[Phase 4 §1.4](05-screen-inventory.md#14-caching-and-revalidation), and the two agree — every
authenticated surface is `no-store`, `/events/[id]` is SSR and never ISR, and no shared cache quotes a
live availability figure.

**The 24-hour ticket cache is safe because `qrCode` is stable**: a plain string written once at
reservation (`reserve-tickets.handler.ts:120`) and reassigned in exactly one place, `transfer()`
(`ticket.entity.ts:461-465`), which also nulls `pdfUrl`. Invalidate `tickets.*` after a successful
`POST /tickets/:id/transfer` and nowhere else.

**Availability is never short-polled.** `soldQuantity` moves at hold time and reverses on expiry, so a
count can rise and sold-out is not terminal; `refetchOnWindowFocus` is enough, and the number is
re-rendered silently
([Phase 1 §E.2](02-product-design-brief.md#e2--availability-is-stated-in-words-and-numbers-never-implied-by-a-disabled-button)).

### 3.3 Effective commission query

```ts
// features/orders/queries/use-public-config.ts
export interface PublicConfig {
  globalCommissionRate: number;
  commissionRateOverride: number | null;
  effectiveCommissionRate: number;
  currency: "TND";
  reservationTtlMinutes: number;
}

export function usePublicConfig(eventId?: string) {
  return useQuery({
    queryKey: ["config", "public", eventId ?? "global"],
    queryFn: () =>
      apiClient
        .get<PublicConfig>("/config/public", { params: { eventId } })
        .then(({ data }) => data),
    staleTime: eventId ? 0 : 60 * 60 * 1000,
    gcTime: eventId ? 5 * 60 * 1000 : 24 * 60 * 60 * 1000,
    refetchOnMount: eventId ? "always" : true,
  });
}
```

The ticket sheet uses `effectiveCommissionRate` for its preview. The order creation response always
wins: if an Admin changes the override between config read and `POST /orders`, show the returned
`platformFee` and `total` before payment. Existing orders never change retroactively.

### 3.4 Order polling after payment

```ts
// features/orders/hooks/use-order-polling.ts
const TERMINAL: OrderStatus[] = ["PAID", "FAILED", "CANCELLED", "REFUNDED"];

export function useOrderPolling(orderId: string, ceilingMs = 60_000) {
  const startedAt = useRef(Date.now());

  return useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => ordersApi.byId(orderId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status && TERMINAL.includes(status)) return false;
      const elapsed = Date.now() - startedAt.current;
      if (elapsed > ceilingMs) return false; // stop; render "verification in progress"
      return Math.min(1_000 * 2 ** Math.floor(elapsed / 10_000), 8_000);
    },
    staleTime: 0,
  });
}
```

`PENDING` and `PROCESSING` are **not** in `TERMINAL` (`order-status.vo.ts:15-22`), so neither ends the
poll. Past the ceiling the UI shows _verification in progress_ with the order reference — **never a
failure, never a retry button.** Confirmation is webhook-driven, and a retry here is how double
payments happen.

---

## 4. State ownership

| Concern                                                 | Owner                              | Why                                                                                                                                                                  |
| ------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Events, orders, tickets, analytics, notifications, `me` | **react-query**                    | Server state. Never mirrored into zustand                                                                                                                            |
| Auth session (tokens, decoded role)                     | **zustand** + storage              | Read synchronously by the axios interceptor and route guards                                                                                                         |
| Checkout draft (ticket type, quantity, holders)         | **zustand**, persisted             | Must survive the login redirect ([Phase 1 §E.1](02-product-design-brief.md#e1--two-taps-from-poster-to-checkout-and-never-ask-who-you-are-before-showing-the-price)) |
| Reservation countdown                                   | **derived from `order.expiresAt`** | Never a `setTimeout` started at mount — a backgrounded browser throttles timers. Render the relative form and the absolute clock time together                       |
| UI preferences (city, last payment provider)            | **zustand**, persisted             | Small, client-only                                                                                                                                                   |
| Filters and search                                      | **URL search params**              | Shareable, back-button correct — the WhatsApp-forwarding case                                                                                                        |
| Toasts, sheets, modals                                  | **local React state**              | No global store needed                                                                                                                                               |

**The rule:** if the server can tell you, it is react-query. If it must survive a redirect, it is
persisted zustand. If it dies with the component, it is local state.

---

## 5. Routing and auth

Four zones. **Public is the absence of a rule**; the other three are listed most-specific first,
because the first match wins.

```ts
// lib/auth/guards.ts
export const ROUTE_ROLES: Array<{ pattern: RegExp; roles: UserRole[] }> = [
  // (organizer) — three surfaces exclude ADMIN. POST /events is @Roles('ORGANIZER') alone
  // (events.controller.ts:452), and IsEventOwnerGuard has no admin bypass (:512, :583).
  { pattern: /^\/organizer\/events\/new$/, roles: ["ORGANIZER"] },
  {
    pattern: /^\/organizer\/events\/[^/]+\/(edit|ticket-types)/,
    roles: ["ORGANIZER"],
  },
  { pattern: /^\/organizer/, roles: ["ORGANIZER", "ADMIN"] },
  // (admin)
  { pattern: /^\/admin/, roles: ["ADMIN"] },
  // Shared authenticated routes. /check-in adds backend event-scoped authorization after this.
  {
    pattern:
      /^\/(checkout|orders|tickets|notifications|profile|settings|check-in)/,
    roles: ["PARTICIPANT", "ORGANIZER", "ADMIN"],
  },
];

// (auth) — reverse guard: an authenticated visitor goes to `next` or their role home.
// /verify-email and /reset-password are excluded: they carry an e-mailed token and must work
// for a signed-in user too.
export const REVERSE_GUARDED = /^\/(login|register|forgot-password)$/;
```

- **Unauthenticated** on a protected route → `/login?next=<path>`, per the `next` contract in
  [Phase 2 §5.4](03-information-architecture.md#54-the-next-parameter-contract).
- **Authenticated but wrong role** → a designed page whose one primary action points at their own
  home ([Phase 2 §5.5](03-information-architecture.md#55-role-mismatch-home-routes)) — **never** a
  bare 403, and never a silent redirect that swallows the intent.
- **`401` mid-session** → handled by the interceptor (§2.2), not by a route guard.
- **`403` from `RATE_LIMITED`** → _not_ a routing concern; it renders inline on the ticket sheet.
- **`403` from `GET /events/:id`** → also not routing; it renders as « Cet événement n'est pas
  disponible », never as a permission failure. All eight meanings are tabulated in
  [Phase 2 §5.3](03-information-architecture.md#53-the-eight-meanings-of-403) and implemented in
  `normalizeError()`, nowhere else.
- Guards run in each zone's `layout.tsx`. Middleware is **not** used for auth, because the token lives
  in client storage and is not readable at the edge — which is also why nothing behind a JWT is
  server-rendered ([Phase 4 §1.2](05-screen-inventory.md#12-why-nothing-behind-a-jwt-is-server-rendered)).

---

## 6. Forms and validation

Zod mirrors the backend's `class-validator` constraints where they exist and supplies the bound the
backend forgot where they do not — so the client never sends what the server rejects, and never sends
an order the server would silently mis-fulfil.

```ts
// features/orders/schemas.ts — mirrors POST /orders, NOT POST /tickets/reserve
import { z } from "zod";

// The order holder DTO is { name, email } and nothing else (`request.dto.ts:22-31`), and the pipe
// runs `forbidNonWhitelisted` (`main.ts:31`), so a `phone` key here is a 400. `phone` belongs to
// HolderInfoDto on POST /tickets/reserve (`reserve-tickets.dto.ts:43-44`), which we never call.
export const holderSchema = z.object({
  name: z
    .string()
    .min(1, "Le nom est requis")
    .max(200, "Maximum 200 caractères"),
  email: z.email("Adresse email invalide"),
});

export const createOrderSchema = z.object({
  eventId: z.uuid(),
  // The handler prices `quantity` but reserves `holders.length` (`create-order.handler.ts:144`):
  // let the two diverge and you charge for a ticket nobody is issued.
  items: z
    .array(
      z
        .object({
          ticketTypeId: z.uuid(),
          quantity: z
            .number()
            .int()
            .min(1)
            .max(10, "Maximum 10 billets par événement"),
          holders: z.array(holderSchema).min(1).max(10),
        })
        .refine((i) => i.holders.length === i.quantity, {
          message: "Un titulaire est requis pour chaque billet",
          path: ["holders"],
        }),
    )
    .min(1),
  holder: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.email(),
  }),
});
```

Three of the bounds above are **client-only** and must not be mistaken for server guarantees:

| Rule                               | Enforced by the API?                                                                                                                                                                                |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name` ≤ 200                       | **No** on `POST /orders` — `@IsString() @IsNotEmpty()` only (`request.dto.ts:24-26`). The 200 bound exists only on `POST /tickets/reserve` (`reserve-tickets.dto.ts:27`)                            |
| `quantity` ≤ 10                    | **No** at the DTO — `@Min(1)`, no `@Max` (`request.dto.ts:39-41`). The cap is a fraud rule, 10 per user per event (`fraud-detection.service.ts:42`), surfacing as `TICKET_LIMIT_EXCEEDED` → **400** |
| `holders.length === quantity`      | **No** — see the `refine` above                                                                                                                                                                     |
| `email`, `eventId`, `ticketTypeId` | Yes — `@IsEmail()`, `@IsUUID()`                                                                                                                                                                     |
| Unknown keys rejected              | Yes — `forbidNonWhitelisted` (`main.ts:31`)                                                                                                                                                         |

Validation runs on **blur**, never per keystroke. Field errors from a `400` are merged in via
`setError` using `fieldErrors` from `normalizeError()`, which reads the property name off each
`class-validator` message because no registered filter emits `errors[]` (§2.3). Schemas use the Zod 4
top-level formats — `z.email()`, `z.uuid()` — as the `z.string().email()` chain is deprecated in the
version this project pins.

---

## 7. Worked example — event listing end to end

```tsx
// app/(public)/events/page.tsx
export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Next.js 16: searchParams is a Promise, and a repeated key arrives as string[].
  const params = await searchParams;
  const filters = parseEventFilters(params); // URL → typed filters, last value wins

  const queryClient = new QueryClient(); // per request — never module scope
  await queryClient.prefetchQuery({
    queryKey: queryKeys.events.list(filters),
    queryFn: () => eventsApi.list(filters),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <EventsBrowser initialFilters={filters} />
    </HydrationBoundary>
  );
}
```

```tsx
// features/events/components/events-browser.tsx  ('use client')
export function EventsBrowser({
  initialFilters,
}: {
  initialFilters: EventFilters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [filters, setFilters] = useState(initialFilters);

  const { data, isPending, isError, error } = useQuery({
    queryKey: queryKeys.events.list(filters),
    queryFn: () => eventsApi.list(filters),
    staleTime: 30_000,
  });

  // Filters live in the URL: shareable, back-button correct.
  function apply(next: EventFilters) {
    setFilters(next);
    router.push(`${pathname}?${serializeEventFilters(next)}`, {
      scroll: false,
    });
  }

  if (isPending) return <EventGridSkeleton count={12} />;
  if (isError) {
    return (
      <ErrorState
        error={normalizeError(error, { endpoint: "GET /events" })}
        onRetry={() => router.refresh()}
      />
    );
  }
  if (!data.data.length) {
    return (
      <EmptyState
        variant="no-results"
        filters={filters}
        onClear={() => apply({})}
      />
    );
  }

  return (
    <>
      <EventFilterBar value={filters} onChange={apply} />
      <EventGrid events={data.data} />
      <Pagination
        page={data.page}
        totalPages={data.totalPages}
        {...pageFlags(data)}
        onChange={(page) => apply({ ...filters, page })}
      />
    </>
  );
}
```

`pageFlags(data)` rather than `data.hasNextPage`, because the flags are optional on the shared type
(§2.4): reading them directly compiles here and breaks on the orders list. `EventFilterBar`, not
`EventFilters`, because that name is already the filter **type**.

Each `EventCard` renders price and availability from `ticketSummary` and `isSoldOut` on the **list**
response (`event-list.dto.ts:114`, `:146`) — **no per-card request**, which is what makes a dense grid
viable on 3G.

---

## 8. Testing strategy

| Layer          | Tool                     | Scope                                                                                 |
| -------------- | ------------------------ | ------------------------------------------------------------------------------------- |
| Pure functions | Vitest                   | `formatMoney`, `speakMoney`, `normalizeError`, filter serialisation, countdown maths  |
| Components     | Vitest + Testing Library | Every state in the Phase 6 matrix; assert by role and accessible name, never by class |
| Hooks          | Vitest                   | Query hooks against a mocked client; the polling hook against fake timers             |
| E2E            | Playwright               | The purchase path, **including failure branches**                                     |

**Mandatory E2E scenarios.** Happy-path purchase (Konnect redirect stubbed) · payment failure with
recovery via a second provider · reservation expiry mid-checkout · sold out at order creation
(**400**, not 409) · `RATE_LIMITED` on the sixth order in an hour rendering inline as a business limit
rather than a permission error · `401` refresh-and-replay without losing checkout state · a `401` on
`POST /auth/login` **not** triggering a refresh · ticket QR rendering offline.

---

## 9. Environment variables

| Variable                        | Example                    | Notes                              |
| ------------------------------- | -------------------------- | ---------------------------------- |
| `NEXT_PUBLIC_API_URL`           | `https://api.tickr.tn/api` | **Must end in `/api`** — not `/v1` |
| `NEXT_PUBLIC_API_TIMEOUT`       | `30000`                    | ms                                 |
| `NEXT_PUBLIC_APP_ENV`           | `development`              | —                                  |
| `NEXT_PUBLIC_ENABLE_DEVTOOLS`   | `true`                     | React Query devtools               |
| `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` | `pk_…`                     | Stripe in-page confirmation only   |

`frontend/.env.example` must be updated: `NEXT_PUBLIC_API_URL` is `http://localhost:3000`, missing the
`/api` prefix, so every request 404s against a running backend; it still carries a commented
`NEXT_PUBLIC_CLICTOPAY_PUBLIC_KEY`, a provider this platform does not use — the three gateways are
Konnect, Paymee and Stripe.

---

## 10. Conventions and enforcement

Per `AGENTS.md`: single quotes · trailing commas · 2-space indent · `@/*` path alias · `import type`
for types · no `any` · no `console.log`. Components are `PascalCase`; hooks are `use-*.ts`;
tests are `*.test.tsx`.

**Lint-enforced architectural rules:**

1. `components/ui/**` may not import from `features/**`.
2. Only `lib/api/client.ts` may construct an axios instance.
3. No literal hex colours outside `styles/` — tokens only.
4. No `outline: none` without a replacement focus indicator.
5. No hard-coded commission rate in the frontend; all previews use `GET /config/public`.
6. Only `lib/api/errors.ts` may branch on an HTTP status code — the eight meanings of `403` are
   resolved in one function or they are resolved wrongly.

---

## Acceptance Criteria

- [x] Folder structure mirrors the backend's six bounded contexts
- [x] API layer specified: single axios instance, `/api` base, single-flight refresh with replay, error normalisation
- [x] The existing `client.ts` 401 defect identified with a concrete replacement
- [x] Data layer: query-key factory, per-resource cache policy, flat pagination, order polling with ceiling
- [x] State ownership settled between zustand and react-query
- [x] Role-based route protection defined across all four zones, with 401 vs 403 handled differently
- [x] Zod schemas mirror the backend's validators, and name every bound the backend does not enforce
- [x] End-to-end worked example for event listing
- [x] Testing strategy split across Vitest and Playwright, with mandatory failure-path E2E
- [ ] **Reviewed against backend module boundaries by the Backend Lead**
- [x] Commission config uses `GET /config/public`; no duplicated frontend environment rate

---

**Prev:** [Phases 9–10 — Hi-Fi, Responsive & Prototype](10-hifi-and-responsive.md) ·
**Index:** [README](README.md)
