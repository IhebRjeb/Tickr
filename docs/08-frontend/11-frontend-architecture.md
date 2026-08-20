# Phase 11 — Frontend Architecture

| Field | Value |
| --- | --- |
| **Phase** | 11 of 11 |
| **Epic** | [01-frontend-plan-and-design-direction.md](01-frontend-plan-and-design-direction.md) |
| **Status** | ✅ Complete |
| **Owner** | Frontend Lead |
| **Depends on** | [Phase 2](03-information-architecture.md) · [Phase 6](07-component-inventory.md) · [Phase 7](08-design-system.md) |

> **Objective:** The implementation blueprint. Folder structure mirroring the backend's bounded
> contexts, the API layer, the data layer, state ownership, routing and auth — specific enough that
> the first pull request is mechanical.

---

## Contents

| | Section |
|---|---|
| **1** | [Folder structure](#1-folder-structure) |
| **2** | [The API layer](#2-the-api-layer) |
| **3** | [The data layer](#3-the-data-layer) |
| **4** | [State ownership](#4-state-ownership) |
| **5** | [Routing and auth](#5-routing-and-auth) |
| **6** | [Forms and validation](#6-forms-and-validation) |
| **7** | [Worked example — event listing end to end](#7-worked-example--event-listing-end-to-end) |
| **8** | [Testing strategy](#8-testing-strategy) |
| **9** | [Environment variables](#9-environment-variables) |
| **10** | [Conventions and enforcement](#10-conventions-and-enforcement) |
| — | [Acceptance Criteria](#acceptance-criteria) |

---

## 0. Contract corrections this architecture is built on

| Issue #64 stated | Verified reality | Architectural consequence |
|---|---|---|
| Base path `/v1` | **`/api`** (`main.ts:17`) | `NEXT_PUBLIC_API_URL` default must be `…/api` |
| Commission via `GET /config/public` | **⚠ NOT IMPLEMENTED** | An interim constant module, isolated so it retires in one edit |
| Pagination `{ data, meta: {…} }` | **Flat** `{ data, total, page, limit, totalPages, hasNextPage, hasPreviousPage }` | One `Paginated<T>` type, no `meta` unwrapping |
| Error envelope with `errors[]` | `{ statusCode, message, error, timestamp, path }`; `errors[]` only on validation | `normalizeError()` handles both shapes |
| Sold out `409`, rate limit `429` | Sold out is **`400`**; order-creation rate limiting is **`403`** | `mapApiError()` keys off status **plus endpoint context** |

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
│   ├── config/commission.ts          # ⚠ interim — delete when GET /config/public ships
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

`frontend/src/lib/api/client.ts` today clears the token and hard-redirects to `/auth/login` on **any**
`401`, with no refresh attempt — even though `POST /auth/refresh-token` exists. A token expiring
mid-checkout would destroy the user's order context. It also points at `/auth/login`, which is not a
route in the canonical tree (`/login` is). Both are fixed below.

### 2.2 Axios instance with single-flight refresh

```ts
// lib/api/client.ts
import axios, { AxiosError, type AxiosRequestConfig } from 'axios';

import { clearSession, getAccessToken, getRefreshToken, setTokens } from '@/lib/auth/storage';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api',
  timeout: Number(process.env.NEXT_PUBLIC_API_TIMEOUT ?? 30_000),
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ---- single-flight refresh -------------------------------------------------
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('NO_REFRESH_TOKEN');

  // Bare axios, not apiClient — otherwise a 401 here would recurse.
  const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
    `${apiClient.defaults.baseURL}/auth/refresh-token`,
    { refreshToken },
  );
  setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;

    if (error.response?.status !== 401 || !original || original._retried) {
      return Promise.reject(error);
    }
    original._retried = true;

    try {
      // Concurrent 401s all await the same refresh, then replay.
      refreshPromise ??= refreshAccessToken().finally(() => { refreshPromise = null; });
      const token = await refreshPromise;
      original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
      return apiClient(original);
    } catch {
      clearSession();
      if (typeof window !== 'undefined') {
        // Preserve where they were so checkout state survives re-auth.
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?next=${next}`;
      }
      return Promise.reject(error);
    }
  },
);
```

**Why single-flight matters.** A checkout screen fires several authenticated requests at once. Without
the shared promise, each `401` triggers its own refresh, and every refresh but the first fails against
a rotated token — logging the user out mid-payment.

### 2.3 Error normalisation

```ts
// lib/api/errors.ts
export type ApiErrorKind =
  | 'VALIDATION' | 'UNAUTHENTICATED' | 'FORBIDDEN_ROLE' | 'FORBIDDEN_OWNER'
  | 'RATE_LIMITED' | 'NOT_FOUND' | 'SOLD_OUT' | 'ORDER_EXPIRED'
  | 'PAYMENT_FAILED' | 'THROTTLED' | 'SERVER' | 'NETWORK' | 'UNKNOWN';

export interface ApiError {
  kind: ApiErrorKind;
  status: number;
  message: string;
  fieldErrors?: Record<string, string>;
  raw?: unknown;
}

interface BackendEnvelope {
  statusCode: number;
  message?: string | string[];
  error?: string;
  errors?: Array<{ field: string; message: string }>;
  timestamp?: string;
  path?: string;
}

/**
 * ⚠ TEMPORARY SHIM.
 * The backend discards its domain error types at the controller boundary, so "sold out" and
 * "bad input" both arrive as 400, and RATE_LIMITED arrives as 403 — indistinguishable from a
 * permissions failure. Until a machine-readable `code` is added to the envelope
 * (Phase 1 §L gap 2), we disambiguate by status + endpoint context, in THIS ONE PLACE.
 */
export function normalizeError(error: unknown, context?: { endpoint?: string }): ApiError {
  if (!axios.isAxiosError(error)) {
    return { kind: 'UNKNOWN', status: 0, message: 'Une erreur inattendue est survenue.', raw: error };
  }
  if (!error.response) {
    return { kind: 'NETWORK', status: 0, message: 'Connexion perdue.', raw: error };
  }

  const { status, data } = error.response as { status: number; data: BackendEnvelope };
  const text = Array.isArray(data?.message) ? data.message.join(' ') : (data?.message ?? '');
  const isOrderCreate = context?.endpoint === 'POST /orders';

  switch (status) {
    case 400:
      if (/available|sold|disponible|complet/i.test(text)) {
        return { kind: 'SOLD_OUT', status, message: text };
      }
      if (/expired|expir/i.test(text)) return { kind: 'ORDER_EXPIRED', status, message: text };
      if (/gateway|payment/i.test(text)) return { kind: 'PAYMENT_FAILED', status, message: text };
      return {
        kind: 'VALIDATION',
        status,
        message: text || 'Données invalides.',
        fieldErrors: Object.fromEntries((data.errors ?? []).map((e) => [e.field, e.message])),
      };
    case 401: return { kind: 'UNAUTHENTICATED', status, message: text };
    case 403:
      // Same status, three unrelated causes — see Phase 4 §5.4.
      if (isOrderCreate) return { kind: 'RATE_LIMITED', status, message: text };
      if (/organizer of this event|owner/i.test(text)) {
        return { kind: 'FORBIDDEN_OWNER', status, message: text };
      }
      return { kind: 'FORBIDDEN_ROLE', status, message: text };
    case 404: return { kind: 'NOT_FOUND', status, message: text };
    case 409: return { kind: 'SOLD_OUT', status, message: text };  // once the backend aligns
    case 429: return { kind: 'THROTTLED', status, message: text };
    default:
      return status >= 500
        ? { kind: 'SERVER', status, message: 'Le service est momentanément indisponible.' }
        : { kind: 'UNKNOWN', status, message: text };
  }
}
```

**Never render `message` directly to a user.** `kind` selects French copy from a single catalogue.

### 2.4 Shared types

```ts
// lib/api/types.ts — the FLAT pagination envelope. There is no `meta`.
export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export type UserRole = 'PARTICIPANT' | 'ORGANIZER' | 'ADMIN';
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
export type TicketStatus = 'RESERVED' | 'CONFIRMED' | 'CANCELLED' | 'CHECKED_IN' | 'EXPIRED';
export type PaymentMethod = 'STRIPE' | 'KONNECT' | 'PAYMEE';
export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
```

### 2.5 Feature API modules

```ts
// features/events/api.ts
import { apiClient } from '@/lib/api/client';
import type { Paginated } from '@/lib/api/types';

export interface EventFilters {
  q?: string; category?: EventCategory; city?: string; country?: string;
  dateFrom?: string; dateTo?: string; minPrice?: number; maxPrice?: number;
  sortBy?: 'startDate' | 'soldTickets' | 'publishedAt' | 'title';
  sortOrder?: 'ASC' | 'DESC';
  page?: number; limit?: number;
}

export const eventsApi = {
  list: (f: EventFilters) =>
    apiClient.get<Paginated<EventListItem>>('/events', { params: f }).then((r) => r.data),
  search: (f: EventFilters) =>
    apiClient.get<Paginated<EventListItem>>('/events/search', { params: f }).then((r) => r.data),
  upcoming: (limit = 10) =>
    apiClient.get<Paginated<EventListItem>>('/events/upcoming', { params: { limit } }).then((r) => r.data),
  byId: (id: string) => apiClient.get<EventDetail>(`/events/${id}`).then((r) => r.data),
  // ORGANIZER | ADMIN only — never call this from a public surface.
  byOrganizer: (organizerId: string, page = 1) =>
    apiClient.get<Paginated<EventListItem>>(`/events/organizer/${organizerId}`, { params: { page } })
      .then((r) => r.data),
};
```

```ts
// features/orders/api.ts — the money path
export const ordersApi = {
  /** Creates the order AND reserves the tickets. Never call POST /tickets/reserve alongside this. */
  create: (body: CreateOrderBody) => apiClient.post<Order>('/orders', body).then((r) => r.data),
  byId: (id: string) => apiClient.get<Order>(`/orders/${id}`).then((r) => r.data),
  list: (page = 1) =>
    apiClient.get<Paginated<Order>>('/orders', { params: { page } }).then((r) => r.data),
  pay: (id: string, paymentMethod: PaymentMethod, idempotencyKey: string) =>
    apiClient.post<PaymentIntent>(`/orders/${id}/pay`, { paymentMethod, idempotencyKey })
      .then((r) => r.data),
  refund: (id: string, reason: string) =>
    apiClient.post<Refund>(`/orders/${id}/refund`, { reason }).then((r) => r.data),
};

export interface PaymentIntent {
  id: string;
  paymentUrl?: string;    // Konnect / Paymee — redirect
  clientSecret?: string;  // Stripe — in-page
  status: string;
}
```

---

## 3. The data layer

### 3.1 Query key factory

```ts
// lib/query/keys.ts
export const queryKeys = {
  events: {
    all: ['events'] as const,
    list: (f: EventFilters) => [...queryKeys.events.all, 'list', f] as const,
    search: (f: EventFilters) => [...queryKeys.events.all, 'search', f] as const,
    upcoming: () => [...queryKeys.events.all, 'upcoming'] as const,
    detail: (id: string) => [...queryKeys.events.all, 'detail', id] as const,
    byOrganizer: (id: string, page: number) =>
      [...queryKeys.events.all, 'organizer', id, page] as const,
  },
  orders: {
    all: ['orders'] as const,
    list: (page: number) => [...queryKeys.orders.all, 'list', page] as const,
    detail: (id: string) => [...queryKeys.orders.all, 'detail', id] as const,
  },
  tickets: {
    all: ['tickets'] as const,
    list: (page: number) => [...queryKeys.tickets.all, 'list', page] as const,
    detail: (id: string) => [...queryKeys.tickets.all, 'detail', id] as const,
  },
  analytics: { /* dashboard, event, timeline, platform, revenueReport */ },
  notifications: { /* list, detail, preferences */ },
  me: ['me'] as const,
} as const;
```

Filters are part of the key, so a URL change is a cache change — no manual invalidation on navigation.

### 3.2 Cache policy

| Resource | `staleTime` | `gcTime` | Rationale |
|---|---|---|---|
| `events.list` / `search` | 30 s | 5 min | Availability moves; a stale card is tolerable, a stale checkout is not |
| `events.detail` | 30 s | 5 min | Same, and `refetchOnWindowFocus` catches returns from a redirect |
| `orders.detail` | **0** | 1 min | Money. Always authoritative |
| `tickets.*` | 60 s | 24 h | Long `gcTime` deliberately — the ticket must survive an offline load at the door |
| `me` | 5 min | 30 min | Rarely changes |
| `analytics.*` | 2 min | 10 min | Aggregates; `lastUpdated` rendered verbatim |
| *config* | 1 h | ∞ | ⚠ Once `GET /config/public` exists. Until then, a build-time constant |

**Availability is never short-polled.** `soldQuantity` moves at hold time and reverses on expiry, so a
count can rise; `refetchOnWindowFocus` is enough, and the number is re-rendered silently
([Phase 1 §E.2](02-product-design-brief.md#e2--availability-is-stated-in-words-and-numbers-never-implied-by-a-disabled-button)).

### 3.3 The interim commission constant

```ts
// lib/config/commission.ts
//
// ⚠ INTERIM — DELETE THIS MODULE when GET /config/public ships.
// PLATFORM_COMMISSION_RATE lives only in the backend env and is not exposed by any endpoint,
// so a pre-order price cannot be quoted authoritatively. Every figure derived from this constant
// MUST be labelled an estimate; the authoritative value is `platformFee` on the created order.
export const INDICATIVE_COMMISSION_RATE = Number(
  process.env.NEXT_PUBLIC_PLATFORM_COMMISSION_RATE ?? 0.06,
);

export function indicativeFee(subtotal: number): number {
  return subtotal * INDICATIVE_COMMISSION_RATE;
}
```

### 3.4 Order polling after payment

```ts
// features/orders/hooks/use-order-polling.ts
const TERMINAL: OrderStatus[] = ['PAID', 'FAILED', 'CANCELLED', 'REFUNDED'];

export function useOrderPolling(orderId: string, ceilingMs = 60_000) {
  const startedAt = useRef(Date.now());

  return useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => ordersApi.byId(orderId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status && TERMINAL.includes(status)) return false;
      const elapsed = Date.now() - startedAt.current;
      if (elapsed > ceilingMs) return false;          // stop; render "verification in progress"
      return Math.min(1_000 * 2 ** Math.floor(elapsed / 10_000), 8_000);
    },
    staleTime: 0,
  });
}
```

Past the ceiling the UI shows *verification in progress* with the order reference — **never a failure,
never a retry button.** Confirmation is webhook-driven and a retry here is how double payments happen.

---

## 4. State ownership

| Concern | Owner | Why |
|---|---|---|
| Events, orders, tickets, analytics, notifications, `me` | **react-query** | Server state. Never mirrored into zustand |
| Auth session (tokens, decoded role) | **zustand** + storage | Read synchronously by the axios interceptor and route guards |
| Checkout draft (ticket type, quantity, holders) | **zustand**, persisted | Must survive the login redirect ([Phase 1 §E.1](02-product-design-brief.md#e1--two-taps-from-poster-to-checkout-and-never-ask-who-you-are-before-showing-the-price)) |
| Reservation countdown | **derived from `order.expiresAt`** | Never a `setTimeout` started at mount — a backgrounded browser throttles timers |
| UI preferences (city, last payment provider) | **zustand**, persisted | Small, client-only |
| Filters and search | **URL search params** | Shareable, back-button correct — the WhatsApp-forwarding case |
| Toasts, sheets, modals | **local React state** | No global store needed |

**The rule:** if the server can tell you, it is react-query. If it must survive a redirect, it is
persisted zustand. If it dies with the component, it is local state.

---

## 5. Routing and auth

```ts
// lib/auth/guards.ts
export const ROUTE_ROLES: Array<{ pattern: RegExp; roles: UserRole[] }> = [
  { pattern: /^\/(checkout|orders|tickets|notifications|profile|settings)/, roles: ['PARTICIPANT', 'ORGANIZER', 'ADMIN'] },
  { pattern: /^\/organizer/, roles: ['ORGANIZER', 'ADMIN'] },
  { pattern: /^\/admin/,     roles: ['ADMIN'] },
];
```

- **Unauthenticated** on a protected route → `/login?next=<path>`, returning to the exact screen.
- **Authenticated but wrong role** → the role's own home with an explanation, **never** a bare 403 page.
- **`401` mid-session** → handled by the interceptor (§2.2), not by a route guard.
- **`403` from `RATE_LIMITED`** → *not* a routing concern; it renders inline on the checkout screen.
- Guards run in each zone's `layout.tsx`. Middleware is **not** used for auth, because the token lives
  in client storage and is not readable at the edge — which is also why nothing behind a JWT is
  server-rendered ([Phase 4 §1.2](05-screen-inventory.md#1-rendering-strategy)).

---

## 6. Forms and validation

Zod schemas mirror the backend's `class-validator` constraints exactly, so the client never permits
what the server will reject.

```ts
// features/orders/schemas.ts
import { z } from 'zod';

export const holderSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(200, 'Maximum 200 caractères'),
  email: z.string().email('Adresse email invalide'),
  phone: z.string().max(20, 'Maximum 20 caractères').optional(),
});

export const createOrderSchema = z.object({
  eventId: z.string().uuid(),
  items: z.array(z.object({
    ticketTypeId: z.string().uuid(),
    quantity: z.number().int().min(1).max(10, 'Maximum 10 billets'),
    holders: z.array(holderSchema).min(1).max(10),
  })).min(1),
  holder: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
  }),
});
```

Validation runs on **blur**, never per keystroke. Field errors from a `400` are merged into the form
via `setError` using `fieldErrors` from `normalizeError()`.

---

## 7. Worked example — event listing end to end

```tsx
// app/(public)/events/page.tsx
export default async function EventsPage({
  searchParams,
}: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;                       // Next.js 16: searchParams is async
  const filters = parseEventFilters(params);               // URL → typed filters

  const queryClient = new QueryClient();
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
export function EventsBrowser({ initialFilters }: { initialFilters: EventFilters }) {
  const router = useRouter();
  const pathname = usePathname();
  const [filters, setFilters] = useState(initialFilters);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.events.list(filters),
    queryFn: () => eventsApi.list(filters),
    staleTime: 30_000,
  });

  // Filters live in the URL: shareable, back-button correct.
  function apply(next: EventFilters) {
    setFilters(next);
    router.push(`${pathname}?${serializeEventFilters(next)}`, { scroll: false });
  }

  if (isLoading) return <EventGridSkeleton count={12} />;
  if (isError) return <ErrorState error={normalizeError(error)} onRetry={() => router.refresh()} />;
  if (!data?.data.length) return <EmptyState variant="no-results" filters={filters} onClear={() => apply({})} />;

  return (
    <>
      <EventFilters value={filters} onChange={apply} />
      <EventGrid events={data.data} />
      <Pagination
        page={data.page}
        totalPages={data.totalPages}
        hasNextPage={data.hasNextPage}
        hasPreviousPage={data.hasPreviousPage}
        onChange={(page) => apply({ ...filters, page })}
      />
    </>
  );
}
```

Each `EventCard` renders price and availability from `ticketSummary` and `isSoldOut` on the **list**
response — **no per-card request**, which is what makes a dense grid viable on 3G.

---

## 8. Testing strategy

| Layer | Tool | Scope |
|---|---|---|
| Pure functions | Vitest | `formatMoney`, `speakMoney`, `normalizeError`, filter serialisation, countdown maths |
| Components | Vitest + Testing Library | Every state in the Phase 6 matrix; assert by role and accessible name, never by class |
| Hooks | Vitest | Query hooks against a mocked client; the polling hook against fake timers |
| E2E | Playwright | The purchase path, **including failure branches** |

**Mandatory E2E scenarios.** Happy-path purchase (Konnect redirect stubbed) · payment failure with
recovery via a second provider · reservation expiry mid-checkout · sold out at order creation ·
`401` refresh-and-replay without losing checkout state · ticket QR rendering offline.

---

## 9. Environment variables

| Variable | Example | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.tickr.tn/api` | **Must end in `/api`** — not `/v1` |
| `NEXT_PUBLIC_API_TIMEOUT` | `30000` | ms |
| `NEXT_PUBLIC_PLATFORM_COMMISSION_RATE` | `0.06` | ⚠ Interim; retires with `GET /config/public` |
| `NEXT_PUBLIC_APP_ENV` | `development` | — |
| `NEXT_PUBLIC_ENABLE_DEVTOOLS` | `true` | React Query devtools |
| `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` | `pk_…` | Stripe in-page confirmation only |

`frontend/.env.example` must be updated: its current `NEXT_PUBLIC_API_URL` omits the `/api` prefix and
it still lists `NEXT_PUBLIC_CLICTOPAY_PUBLIC_KEY`, a provider this platform does not use.

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
5. No hard-coded commission rate outside `lib/config/commission.ts`.

---

## Acceptance Criteria

- [x] Folder structure mirrors the backend's six bounded contexts
- [x] API layer specified: single axios instance, `/api` base, single-flight refresh with replay, error normalisation
- [x] The existing `client.ts` 401 defect identified with a concrete replacement
- [x] Data layer: query-key factory, per-resource cache policy, flat pagination, order polling with ceiling
- [x] State ownership settled between zustand and react-query
- [x] Role-based route protection defined, with 401 vs 403 handled differently
- [x] Zod schemas mirror the backend's validators
- [x] End-to-end worked example for event listing
- [x] Testing strategy split across Vitest and Playwright, with mandatory failure-path E2E
- [ ] **Reviewed against backend module boundaries by the Backend Lead**
- [ ] `lib/config/commission.ts` deleted once `GET /config/public` ships

---

**Prev:** [Phases 9–10 — Hi-Fi, Responsive & Prototype](10-hifi-and-responsive.md) ·
**Index:** [README](README.md)
