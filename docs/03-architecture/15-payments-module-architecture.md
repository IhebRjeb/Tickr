# Payments Module Architecture

## Overview

The Payments module follows **Hexagonal Architecture** (Ports and Adapters) principles, handling the full order-to-payment lifecycle including multi-gateway payment processing (Stripe, Konnect, Paymee), refund management, fraud detection, and configurable platform commission calculation.

**Status:** ✅ **100% COMPLETE** (as of June 7, 2026)

## Module Structure

```
src/modules/payments/
├── domain/                              # Domain Layer (Core Business Logic) ✅
│   ├── entities/                       # Aggregate Root & Entities
│   │   ├── order.entity.ts             # Order Aggregate Root
│   │   ├── order-item.entity.ts        # Order line items
│   │   ├── payment.entity.ts           # Payment tracking entity
│   │   └── refund.entity.ts            # Refund entity
│   ├── events/                         # Domain Events (7 events)
│   │   ├── order-created.event.ts
│   │   ├── order-processing.event.ts
│   │   ├── order-paid.event.ts
│   │   ├── order-failed.event.ts
│   │   ├── order-cancelled.event.ts
│   │   ├── order-expired.event.ts
│   │   └── order-refunded.event.ts
│   ├── exceptions/                     # Domain Exceptions (4 exceptions)
│   │   ├── invalid-order.exception.ts
│   │   ├── invalid-order-status.exception.ts
│   │   ├── max-items-exceeded.exception.ts
│   │   └── order-expired.exception.ts
│   ├── value-objects/                  # Value Objects (4 VOs)
│   │   ├── order-status.vo.ts          # Order lifecycle states
│   │   ├── payment-status.vo.ts        # Payment processing states
│   │   ├── payment-method.vo.ts        # Supported payment methods
│   │   └── refund-status.vo.ts         # Refund lifecycle states
│   ├── services/                       # Domain Services
│   │   └── commission-calculator.service.ts  # Platform fee calculation
│   └── index.ts                        # Barrel exports
├── application/                         # Application Layer (Use Cases) ✅
│   ├── commands/                       # 6 Command Handlers
│   │   ├── create-order/               # Create new order from cart
│   │   ├── process-payment/            # Initiate payment with gateway
│   │   ├── confirm-payment/            # Confirm successful payment
│   │   ├── fail-payment/              # Handle payment failure
│   │   ├── request-refund/            # Process refund request
│   │   └── expire-orders/             # Expire stale pending orders
│   ├── queries/                        # 3 Query Handlers
│   │   ├── get-order-by-id/
│   │   ├── get-orders-by-user/
│   │   └── get-orders-by-event/
│   ├── event-handlers/                 # 2 Application Event Handlers
│   │   ├── order-paid-app.handler.ts   # Business logic on payment success
│   │   └── order-failed-app.handler.ts # Business logic on payment failure
│   ├── ports/                          # 8 Port Interfaces
│   │   ├── order.repository.port.ts
│   │   ├── payment.repository.port.ts
│   │   ├── refund.repository.port.ts
│   │   ├── payment-provider.port.ts    # Gateway abstraction
│   │   ├── fraud-detection.port.ts     # Fraud check abstraction
│   │   ├── webhook-event-store.port.ts # Webhook deduplication
│   │   ├── event-query.port.ts         # Cross-module: Events
│   │   └── ticket-reservation.port.ts  # Cross-module: Tickets
│   ├── dtos/                           # Data Transfer Objects
│   │   └── order.dto.ts
│   ├── types/                          # Type definitions
│   │   ├── payment-provider.types.ts   # Gateway response types
│   │   ├── event-query.types.ts        # Event data types
│   │   └── ticket-reservation.types.ts # Ticket reservation types
│   ├── services/                       # Application services
│   ├── models/                         # Read models
│   └── index.ts                        # Barrel exports
└── infrastructure/                      # Infrastructure Layer (Adapters) ✅
    ├── adapters/                       # External Integrations
    │   ├── stripe.adapter.ts           # Stripe payment gateway
    │   ├── konnect.adapter.ts          # Konnect gateway (Tunisia)
    │   ├── paymee.adapter.ts           # Paymee gateway (Tunisia)
    │   ├── payment-provider-factory.adapter.ts  # Gateway factory
    │   ├── event-query.adapter.ts      # Anti-corruption: Events module
    │   └── ticket-reservation.adapter.ts # Anti-corruption: Tickets module
    ├── controllers/                    # REST Endpoints
    │   ├── orders.controller.ts        # Order CRUD & payment initiation
    │   ├── webhooks.controller.ts      # Payment provider webhooks
    │   └── dtos/
    │       └── request.dto.ts          # Request validation DTOs
    ├── persistence/                    # Database Layer
    │   ├── entities/                   # TypeORM ORM Entities
    │   │   ├── order.orm-entity.ts
    │   │   ├── order-item.orm-entity.ts
    │   │   ├── payment.orm-entity.ts
    │   │   └── refund.orm-entity.ts
    │   └── mappers/                    # Domain ↔ ORM Mappers
    │       ├── order.mapper.ts
    │       ├── payment.mapper.ts
    │       └── refund.mapper.ts
    ├── repositories/                   # Port Implementations
    │   ├── order.repository.ts
    │   ├── payment.repository.ts
    │   └── refund.repository.ts
    ├── services/                       # Infrastructure Services
    │   ├── fraud-detection.service.ts  # Redis-based fraud detection
    │   ├── order-expiration.service.ts # Cron: expire pending orders
    │   └── webhook-event-store.service.ts # Webhook dedup (in-memory w/ TTL)
    ├── event-handlers/                 # Infrastructure Event Handlers
    │   ├── order-created-infra.listener.ts
    │   ├── order-paid-infra.listener.ts
    │   ├── order-failed-infra.listener.ts
    │   └── order-refunded-infra.listener.ts
    └── payments.module.ts              # NestJS Module registration
```

## Key Design Decisions

### 1. Multi-Gateway Architecture (Factory Pattern)

Payment gateways are abstracted behind `PaymentProviderPort`. A factory selects the appropriate adapter based on the payment method:

```
PaymentMethod → PaymentProviderFactory → Adapter
  CARD          → StripeAdapter
  KONNECT       → KonnectAdapter
  PAYMEE        → PaymeeAdapter
```

Adding a new gateway requires only:
1. New adapter implementing `PaymentProviderPort`
2. One registration in the factory

Zero changes to domain or application layers.

### 2. Configurable Commission Rate

The commission rate is loaded from `PLATFORM_COMMISSION_RATE` environment variable (default: 6%). The `CommissionCalculatorService` in the domain layer handles fee calculation with currency-aware precision (3 decimals for TND).

### 3. Order State Machine (with Immutable History)

Orders follow a strict state machine:

```
PENDING → PROCESSING → PAID → (REFUNDED)
                    ↘ FAILED
PENDING → EXPIRED (via cron)
PENDING → CANCELLED (user action)
```

Invalid transitions are rejected by the `OrderStatusVO`.

Every state transition is recorded in an append-only `statusHistory` array (stored as JSONB), providing a complete audit trail with timestamps and reasons. The current status field remains for efficient querying, but the history is never overwritten.

### 4. Payment Safety Patterns

The module implements several patterns to prevent financial errors:

**Idempotency Keys**: The `ProcessPaymentRequestDto` accepts an optional client-generated UUID (`idempotencyKey`). Before creating a new payment intent, the handler checks for existing pending payments for the same order and returns the cached result on retry.

**Intent-First Recording**: Payment records are persisted to the database BEFORE calling the payment gateway. This ensures no orphaned charges exist without a DB record. If the gateway call fails, the payment record is marked as failed. Flow:
```
1. Validate order → 2. Save payment record (PENDING) → 3. Call gateway
→ 4. Update payment with gateway ref → 5. Save order state
```

**Webhook Deduplication**: A `WebhookEventStorePort` (in-memory with 24h TTL) prevents duplicate processing of retried webhooks. Each gateway webhook is deduplicated by event ID before any business logic executes. Stripe uses `event.id`, Konnect uses `payment_ref`, Paymee uses `token`.

**Timing-Safe Webhook Verification**: All webhook signature comparisons use `crypto.timingSafeEqual()` to prevent timing-attack based secret extraction.

### 5. Cross-Module Integration (Anti-Corruption Layer)

The Payments module never imports directly from Events or Tickets. Instead:
- `EventQueryPort` / `EventQueryAdapter` → queries event data
- `TicketReservationPort` / `TicketReservationAdapter` → reserves/confirms tickets

### 6. Fraud Detection

`FraudDetectionPort` is defined in the application layer. The infrastructure provides a Redis-based implementation that checks for suspicious patterns (velocity, duplicates, etc.).

### 7. Event Handler Split

- **Application handlers** (`order-paid-app.handler.ts`): Business logic (e.g., confirm ticket reservation)
- **Infrastructure handlers** (`order-paid-infra.listener.ts`): Side effects (e.g., send notification, update analytics)

## Testing

| Category | Files | Tests |
|----------|-------|-------|
| Domain (entities, VOs, services) | 5 | ~40 |
| Application (commands, queries, events) | 10 | ~120 |
| Infrastructure (adapters, controllers, mappers, services) | 13 | ~95 |
| Integration | 1 | ~15 |
| **Total** | **29** | **257+** |

## Dependencies

- **Inbound**: Events module (event data), Tickets module (reservations)
- **Outbound**: Stripe API, Konnect API, Paymee API, Redis (fraud detection)
- **Shared**: `@shared/domain` (Result, BaseEntity, Money VO, CurrencyVO)

## API Endpoints

### Orders Controller
- `POST /orders` — Create order
- `GET /orders/:id` — Get order by ID
- `GET /orders/user/:userId` — Get user's orders
- `GET /orders/event/:eventId` — Get event's orders
- `POST /orders/:id/pay` — Initiate payment (accepts optional `idempotencyKey` UUID)
- `POST /orders/:id/refund` — Request refund

### Webhooks Controller
- `POST /payments/webhooks/stripe` — Stripe webhook (signature verified, deduplicated)
- `GET /payments/webhooks/konnect` — Konnect webhook (timing-safe token, deduplicated)
- `POST /payments/webhooks/paymee` — Paymee webhook (checksum verified, deduplicated)
