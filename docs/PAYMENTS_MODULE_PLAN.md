# Payments Module — Implementation Plan

> **Tickr Platform** · Created: June 2026
> Module: `src/modules/payments/`
> Architecture: Hexagonal (Domain → Application → Infrastructure)

---

## Overview

The Payments module handles orders, multi-gateway payment processing (Stripe, Konnect, Paymee), refunds, and platform commission calculation. This is the highest-complexity module in the system.

**Estimated sub-issues: 18**
**Estimated files: ~130-150**
**Dependencies**: Users, Events, Tickets modules (all implemented)

---

## Architecture Alignment Verification ✅

Verified against existing modules (Users, Events, Tickets) on June 6, 2026:

| Pattern | Status | Notes |
|---------|--------|-------|
| Hexagonal layers (domain/application/infrastructure) | ✅ Aligned | Same 3-layer structure |
| Entity pattern (`BaseEntity<T>` + factory `Result<T,E>` + `reconstitute()`) | ✅ Aligned | |
| Value Objects (extend `ValueObject<Props>`, immutable, `validate()`) | ✅ Aligned | |
| Result pattern (`Result<T, E>` with typed error unions) | ✅ Aligned | |
| Ports (Symbol tokens + interface) | ✅ Aligned | |
| **Controller pattern (direct handler injection, NOT CommandBus)** | ✅ Fixed | No `@nestjs/cqrs` bus in controllers |
| **Handlers are plain `@Injectable()` (NOT `@CommandHandler`)** | ✅ Fixed | Registered as providers, injected directly |
| Cross-module anti-corruption (port → adapter → other module) | ✅ Aligned | |
| Module registration (handler arrays + provider objects) | ✅ Aligned | |
| **Mappers are `@Injectable()` (injected into repositories)** | ✅ Fixed | Not static utilities |
| **ORM entities use `.orm-entity.ts` suffix** | ✅ Fixed | e.g., `order.orm-entity.ts` |
| Cron jobs (`@Cron` + `ConfigService` enable flag) | ✅ Aligned | |
| **Event handlers split (app = business, infra = side effects)** | ✅ Fixed | Two categories per existing pattern |
| **FraudDetection in infrastructure (uses Redis)** | ✅ Fixed | Accessed via port from app layer |
| Domain events (extend `DomainEvent`, published via `DomainEventPublisher`) | ✅ Aligned | |
| Exceptions (extend `DomainException(message, code)` + static factories) | ✅ Aligned | |
| **Shared Money VO exists — needs TND precision extension** | ✅ Identified | Currently 2 decimals, needs 3 for TND |
| Swagger decorators (`@ApiTags`, `@ApiOperation`, `@ApiResponse`) | ✅ Aligned | |
| Guards (`JwtAuthGuard`, `RolesGuard`, `@CurrentUser()`) | ✅ Aligned | |

### Scalability Verification (Tunisia-first → Global)

| Concern | Resolution | Regression Risk |
|---------|-----------|----------------|
| **Currency support** | `CurrencyVO` in Events module is metadata-driven (`CURRENCY_METADATA` map). Adding GBP/MAD/EGP = add 1 entry. No code changes. | None |
| **Commission rate** | **Made configurable** via env var `PLATFORM_COMMISSION_RATE` (default 4%). Not hardcoded. Allows per-region/per-event rates later. | None |
| **Gateway selection** | Factory uses registry pattern. Adding new gateways (e.g., Fawry for Egypt, CMI for Morocco) = 1 adapter + 1 factory registration. Zero changes to domain/application. | None |
| **Payment method enum** | `PaymentMethod` is extensible — new values don't break existing logic. Gateway routing via factory, not switch statements in domain. | None |
| **Gateway fees** | `calculatePaymentGatewayFees()` takes `provider` param. Fee structure per gateway, not hardcoded globally. | None |
| **Multi-region webhooks** | Each gateway has its own webhook endpoint. New gateways = new endpoint. No conflicts. | None |
| **TND-specific precision** | Precision is currency-driven (from `CurrencyVO.getDecimals()`), not TND-hardcoded. Works for any 3-decimal currency (BHD, KWD, OMR). | None |
| **Locale/formatting** | `CurrencyVO.format()` uses `Intl.NumberFormat` with locale metadata. Extensible. | None |
| **Tax/VAT** | Not in MVP scope. Architecture allows adding `TaxCalculator` service later without touching order domain logic (fees field exists). | None — deferred |

---

## Sub-Issues

### Phase 1 — Domain Layer (Pure Business Logic)

---

#### Issue #1: Extend Shared Money VO + Payment Value Objects

**Priority:** Critical (foundation for all payment logic)
**Files to modify/create:**
- `@shared/domain/value-objects/money.vo.ts` — **EXTEND** existing VO (currently rounds to 2 decimals, needs 3 for TND)
- `@shared/domain/value-objects/currency.vo.ts` — **MOVE** from `modules/events/domain/value-objects/currency.vo.ts` to shared (used by Events, Tickets, and now Payments)
- Unit tests

**⚠️ EXISTING CODE:**
- `Money` VO exists in `@shared` with `add()`, `subtract()`, `multiply()` — but hardcodes `Math.round(amount * 100) / 100` (2 decimals only).
- `CurrencyVO` + `Currency` enum + `CURRENCY_METADATA` (with `decimals` per currency) exists in `modules/events/domain/value-objects/currency.vo.ts` — **must move to `@shared`** since Payments needs it too. This avoids cross-module domain imports.

**Pre-requisite: Move CurrencyVO to @shared**
- Move `currency.vo.ts` from Events module → `@shared/domain/value-objects/`
- Update Events module imports to reference new location
- Run existing tests to confirm no regression

**Acceptance Criteria:**
- [ ] Update `Money.create()` to use `CurrencyVO.roundAmountFor()` instead of hardcoded `Math.round(amount * 100) / 100`
- [ ] Add `toSmallestUnit()` method — currency-aware (TND→×1000, USD/EUR→×100). Extensible for any currency.
- [ ] Add `toCents()` convenience alias for Stripe (calls `toSmallestUnit()` for 2-decimal currencies)
- [ ] Add `toMillimes()` convenience alias for Konnect (calls `toSmallestUnit()` for 3-decimal currencies)
- [ ] Add `percentage(rate: number)` method — for commission calculation
- [ ] **Reuse** `CurrencyVO` from Events module (move to `@shared/domain/value-objects/` if not already shared, or import from Events)
- [ ] `SUPPORTED_CURRENCIES` list in Money VO derived from `CurrencyVO.getAllCurrencies()` — not hardcoded array
- [ ] Verify existing tests still pass after precision change
- [ ] Unit tests with multi-currency edge cases (TND millimes, USD cents, EUR cents)

---

#### Issue #2: Order Entity (Aggregate Root) & State Machine

**Priority:** Critical
**Files to create:**
- `domain/entities/order.entity.ts` — Aggregate root with state machine
- `domain/entities/order-item.entity.ts` — Sub-entity for line items
- `domain/value-objects/order-status.vo.ts` — PENDING → PROCESSING → PAID / FAILED / CANCELLED / REFUNDED
- `domain/value-objects/payment-method.vo.ts` — STRIPE | KONNECT | PAYMEE (extensible enum — new values added here only, factory handles routing)
- Unit tests

**Acceptance Criteria:**
- [ ] Factory method `Order.create(props)` returns `Result<Order>`
- [ ] State transitions enforced (e.g., only PENDING → PROCESSING, not PAID → PENDING)
- [ ] `addItem()`, `removeItem()` with validation
- [ ] `calculateTotals()` computes subtotal, platformFee (4%), total
- [ ] `markAsProcessing(gatewayOrderId)` — valid only from PENDING
- [ ] `markAsPaid(transactionId)` — valid only from PROCESSING
- [ ] `markAsFailed(reason)` — valid from PROCESSING
- [ ] `cancel(reason)` — valid from PENDING or PROCESSING
- [ ] `expire()` — valid from PENDING, checks `expiresAt`
- [ ] `requestRefund(amount, reason)` — valid from PAID, returns Result<Refund>
- [ ] `canBePaid()`, `canBeRefunded()`, `isExpired()` guards
- [ ] Maximum 10 items per order enforced
- [ ] `expiresAt` set to creation + 15 minutes
- [ ] `metadata` contains holderFirstName, holderLastName, holderEmail

---

#### Issue #3: Payment & Refund Entities

**Priority:** High
**Files to create:**
- `domain/entities/payment.entity.ts` — Payment audit trail
- `domain/entities/refund.entity.ts` — Refund tracking
- `domain/value-objects/payment-status.vo.ts` — PENDING | SUCCESS | FAILED | REFUNDED
- `domain/value-objects/refund-status.vo.ts` — PENDING | COMPLETED | FAILED
- Unit tests

**Acceptance Criteria:**
- [ ] Payment entity tracks each attempt (max 3)
- [ ] `Payment.create(props)` returns `Result<Payment>`
- [ ] `markAsSuccess(gatewayResponse)` and `markAsFailed(error)`
- [ ] `incrementAttempt()` with max-3 guard
- [ ] Refund entity with `markAsCompleted()` and `markAsFailed(reason)`
- [ ] Stores gateway-specific references (paymentRef, token, etc.)

---

#### Issue #4: Domain Events & Exceptions

**Priority:** High
**Files to create:**
- `domain/events/order-created.event.ts`
- `domain/events/order-processing.event.ts`
- `domain/events/order-paid.event.ts`
- `domain/events/order-failed.event.ts`
- `domain/events/order-cancelled.event.ts`
- `domain/events/order-refunded.event.ts`
- `domain/events/order-expired.event.ts`
- `domain/events/payment-webhook-received.event.ts`
- `domain/exceptions/` — 8-12 domain exceptions
- `domain/index.ts` — barrel exports

**Acceptance Criteria:**
- [ ] All events extend `DomainEvent` base class
- [ ] Events carry minimal required data (aggregateId, timestamp, key fields)
- [ ] Exceptions: `OrderNotFound`, `OrderAlreadyPaid`, `OrderExpired`, `InvalidOrderStatus`, `MaxPaymentAttemptsExceeded`, `InvalidRefundAmount`, `RefundDeadlinePassed`, `OrderCannotBeModified`, `InsufficientTickets`, `MaxTicketsPerOrderExceeded`

---

### Phase 2 — Application Layer (Use Cases)

---

#### Issue #5: Port Interfaces (Repository & Service Contracts)

**Priority:** Critical (blocks all handlers)
**Files to create:**
- `application/ports/order.repository.port.ts`
- `application/ports/payment.repository.port.ts`
- `application/ports/refund.repository.port.ts`
- `application/ports/payment-provider.port.ts` — Gateway abstraction
- `application/ports/ticket-reservation.port.ts` — Cross-module port (Tickets)
- `application/ports/event-query.port.ts` — Cross-module port (Events)

**Acceptance Criteria:**
- [ ] `IOrderRepository` — save, findById, findByUserId, findByEventId, findExpired, countByUserIdSince
- [ ] `IPaymentRepository` — save, findByOrderId
- [ ] `IRefundRepository` — save, findByOrderId
- [ ] `IPaymentProvider` — createPaymentIntent, confirmPayment, refund, verifyWebhook
- [ ] `ITicketReservationPort` — reserveTickets, confirmTickets, cancelReservation
- [ ] `IEventQueryPort` — findEventById (to validate event exists & get ticket prices)
- [ ] Injection tokens defined as Symbols (e.g., `ORDER_REPOSITORY`)

---

#### Issue #6: CreateOrder Command & Handler

**Priority:** Critical
**Files to create:**
- `application/commands/create-order/create-order.command.ts`
- `application/commands/create-order/create-order.handler.ts`
- `application/dtos/create-order.dto.ts`
- Unit tests

**Acceptance Criteria:**
- [ ] Validates userId, eventId, ticket items (1-10 items)
- [ ] Fetches event details to verify ticket availability & pricing
- [ ] Reserves tickets via `ITicketReservationPort`
- [ ] Creates Order entity with calculated totals (4% platform fee)
- [ ] Sets `expiresAt` = now + 15 minutes
- [ ] Publishes `OrderCreated` domain event
- [ ] Returns `Result<{ orderId, expiresAt, subtotal, platformFee, total }>`
- [ ] Rate limiting: max 5 orders/user/hour (via FraudDetection check)

---

#### Issue #7: ProcessPayment Command & Handler

**Priority:** Critical
**Files to create:**
- `application/commands/process-payment/process-payment.command.ts`
- `application/commands/process-payment/process-payment.handler.ts`
- `application/dtos/process-payment.dto.ts`
- Unit tests

**Acceptance Criteria:**
- [ ] Validates order exists, belongs to user, status is PENDING
- [ ] Validates order is not expired
- [ ] Selects payment provider via factory (STRIPE | KONNECT | PAYMEE)
- [ ] Calls `provider.createPaymentIntent(order)`
- [ ] Transitions order to PROCESSING
- [ ] Creates Payment entity (attempt tracking)
- [ ] Publishes `OrderProcessing` domain event
- [ ] Returns `Result<{ paymentUrl, clientSecret?, orderId }>`

---

#### Issue #8: ConfirmPayment & FailPayment Commands (Webhook Handlers)

**Priority:** Critical
**Files to create:**
- `application/commands/confirm-payment/confirm-payment.command.ts`
- `application/commands/confirm-payment/confirm-payment.handler.ts`
- `application/commands/fail-payment/fail-payment.command.ts`
- `application/commands/fail-payment/fail-payment.handler.ts`
- Unit tests

**Acceptance Criteria:**
- [ ] **ConfirmPayment**: Marks order as PAID, sets transactionId, paidAt
- [ ] Confirms ticket reservations via port
- [ ] Publishes `OrderPaid` event (triggers notification + commission)
- [ ] **FailPayment**: Marks order as FAILED if attempts exhausted (3)
- [ ] If attempts < 3, keeps order in PENDING for retry
- [ ] Releases ticket reservations on final failure
- [ ] Publishes `OrderFailed` event

---

#### Issue #9: RequestRefund Command & Handler

**Priority:** Medium
**Files to create:**
- `application/commands/request-refund/request-refund.command.ts`
- `application/commands/request-refund/request-refund.handler.ts`
- `application/dtos/refund-request.dto.ts`
- Unit tests

**Acceptance Criteria:**
- [ ] Validates order is PAID and within refund window (24h before event)
- [ ] Validates refund amount ≤ order total minus platform fee (commission non-refundable)
- [ ] Creates Refund entity
- [ ] Calls `provider.refund()` (Stripe/Paymee auto, Konnect throws manual notice)
- [ ] Transitions order to REFUNDED
- [ ] Publishes `OrderRefunded` event
- [ ] Returns `Result<{ refundId }>`

---

#### Issue #10: ExpireOrders Command (Cron Job)

**Priority:** High
**Files to create:**
- `application/commands/expire-orders/expire-orders.command.ts`
- `application/commands/expire-orders/expire-orders.handler.ts`
- Unit tests

**Acceptance Criteria:**
- [ ] Finds all orders where `status = PENDING AND expiresAt < now`
- [ ] Transitions each to CANCELLED via `order.expire()`
- [ ] Releases ticket reservations for each expired order
- [ ] Publishes `OrderExpired` event for each
- [ ] Returns count of expired orders
- [ ] Triggered by cron every 1 minute

---

#### Issue #11: Query Handlers & Response DTOs

**Priority:** Medium
**Files to create:**
- `application/queries/get-order-by-id/get-order-by-id.query.ts`
- `application/queries/get-order-by-id/get-order-by-id.handler.ts`
- `application/queries/get-user-orders/get-user-orders.query.ts`
- `application/queries/get-user-orders/get-user-orders.handler.ts`
- `application/queries/get-organizer-revenue/get-organizer-revenue.query.ts`
- `application/queries/get-organizer-revenue/get-organizer-revenue.handler.ts`
- `application/queries/get-platform-revenue/get-platform-revenue.query.ts`
- `application/queries/get-platform-revenue/get-platform-revenue.handler.ts`
- `application/dtos/order.dto.ts`
- `application/dtos/order-details.dto.ts`
- `application/dtos/revenue-report.dto.ts`
- Unit tests

**Acceptance Criteria:**
- [ ] GetOrderById — returns full order with items, payment info
- [ ] GetUserOrders — paginated list for authenticated user
- [ ] GetOrganizerRevenue — revenue breakdown by event for organizer
- [ ] GetPlatformRevenue — admin-only aggregate revenue report
- [ ] All return Result pattern

---

#### Issue #12: Application Services (Commission) & Infrastructure Services (Fraud)

**Priority:** High
**Files to create:**
- `application/services/commission-calculator.service.ts` — Pure business logic (no infra deps)
- `infrastructure/services/fraud-detection.service.ts` — Uses Redis (infra dependency)
- `application/ports/fraud-detection.port.ts` — Port interface for fraud checking
- Unit tests

**⚠️ ARCHITECTURE NOTE:** FraudDetection uses Redis → must live in infrastructure layer. Application layer accesses it via a port interface (hexagonal rule: app layer cannot import Redis/ioredis).

**Acceptance Criteria:**
- [ ] **CommissionCalculator** (application layer — pure logic):
  - `calculatePlatformFee(subtotal: Money, rate?: number): Money` → default rate from config (`PLATFORM_COMMISSION_RATE`, default 4%)
  - `calculateOrganizerRevenue(subtotal: Money, platformFee: Money): Money`
  - `calculatePaymentGatewayFees(amount: Money, provider: PaymentMethod): Money`
  - Commission rate injected via `ConfigService` — **not hardcoded 4%** (allows per-region rates in future)
- [ ] **FraudDetectionPort** (application layer — interface):
  - `checkRateLimit(userId: string): Promise<boolean>`
  - `checkTicketLimit(userId: string, eventId: string): Promise<boolean>`
  - `detectHighValueOrder(totalAmount: number): boolean`
- [ ] **FraudDetectionService** (infrastructure layer — Redis impl):
  - `checkRateLimit(userId: string): Promise<boolean>` → max 5 orders/hour via Redis INCR+EXPIRE
  - `checkTicketLimit(userId: string, eventId: string): Promise<boolean>` → max 20 tickets/event
  - `detectHighValueOrder(totalAmount: number): boolean` → flag > 1000 TND for manual review

---

### Phase 3 — Infrastructure Layer (Adapters & Framework)

---

#### Issue #13: Persistence (TypeORM Entities, Repositories, Mappers)

**Priority:** Critical
**Files to create:**
- `infrastructure/persistence/entities/order.orm-entity.ts`
- `infrastructure/persistence/entities/order-item.orm-entity.ts`
- `infrastructure/persistence/entities/payment.orm-entity.ts`
- `infrastructure/persistence/entities/refund.orm-entity.ts`
- `infrastructure/persistence/repositories/order.typeorm-repository.ts`
- `infrastructure/persistence/repositories/payment.typeorm-repository.ts`
- `infrastructure/persistence/repositories/refund.typeorm-repository.ts`
- `infrastructure/persistence/mappers/order.mapper.ts`
- `infrastructure/persistence/mappers/payment.mapper.ts`
- `infrastructure/persistence/mappers/refund.mapper.ts`
- Migration: `src/migrations/004-create-payments-tables.ts`

**⚠️ PATTERN NOTES:**
- ORM entities use `.orm-entity.ts` suffix (e.g., `ticket.orm-entity.ts`)
- Repositories follow pattern: check `findOne` → `mapper.updatePersistence()` or `mapper.toPersistence()` → `save()`
- Mappers are `@Injectable()` classes injected into repositories
- Mappers have: `toPersistence(domain)`, `toDomain(orm)`, `toDomainArray(orms[])`, `updatePersistence(existing, domain)`
- Use `@Entity({ name: 'orders', schema: 'payments' })` for schema isolation

**Acceptance Criteria:**
- [ ] TypeORM entities use `precision: 10, scale: 3` for TND amounts
- [ ] ORM entities use `@Column`, `@Index`, `@CreateDateColumn`, `@UpdateDateColumn` decorators
- [ ] Repositories are `@Injectable()` and implement port interfaces
- [ ] Repositories inject `@InjectRepository(OrmEntity)` and mapper
- [ ] Mappers are `@Injectable()` with `toPersistence()`, `toDomain()`, `updatePersistence()`
- [ ] Migration creates: `orders`, `order_items`, `payments`, `refunds` tables in `payments` schema
- [ ] All indexes created (user_id, event_id, status, expires_at, gateway_payment_ref, etc.)
- [ ] JSONB column for `metadata` and `gateway_response`
- [ ] CHECK constraints (subtotal > 0, attempt ≤ 3)

---

#### Issue #14: Payment Gateway Adapters (Stripe, Konnect, Paymee)

**Priority:** Critical
**Files to create:**
- `infrastructure/adapters/stripe-payment.provider.ts`
- `infrastructure/adapters/konnect-payment.provider.ts`
- `infrastructure/adapters/paymee-payment.provider.ts`
- `infrastructure/adapters/payment-provider.factory.ts`
- Unit tests (mocked HTTP calls)

**Acceptance Criteria:**
- [ ] **StripePaymentProvider** implements `IPaymentProvider`
  - Uses `stripe` SDK (already in package.json)
  - Amounts in cents (× 100)
  - Webhook verification via `stripe.webhooks.constructEvent()`
  - Supports refund via `stripe.refunds.create()`
- [ ] **KonnectPaymentProvider** implements `IPaymentProvider`
  - Uses `axios` for REST API calls
  - Amounts in millimes (× 1000)
  - Sandbox: `https://api.sandbox.konnect.network/api/v2`
  - Webhook is GET request with `?payment_ref=xxx`
  - Refund: throws error (manual via dashboard)
- [ ] **PaymeePaymentProvider** implements `IPaymentProvider`
  - Uses `axios` for REST API calls
  - Amounts in TND decimal (no conversion)
  - Sandbox: `https://sandbox.paymee.tn/api/v2`
  - Webhook: POST with `check_sum` HMAC-SHA256 verification
  - Supports automated refund
- [ ] **PaymentProviderFactory** — Registry pattern
  - Map<PaymentMethod, IPaymentProvider>
  - `getProvider(method)` — throws if not registered
  - `getSupportedMethods()` — returns list of registered providers (for frontend to show available options)
  - Adding new gateway (Clictopay, Fawry, CMI, etc.) = 1 adapter class + 1 line in factory constructor
  - **No switch/if-else in domain layer** — all routing via factory map

---

#### Issue #15: HTTP Controllers (Orders + Webhooks)

**Priority:** High
**Files to create:**
- `infrastructure/controllers/orders.controller.ts`
- `infrastructure/controllers/webhooks.controller.ts`
- `infrastructure/dtos/` — request/response validation decorators

**⚠️ PATTERN NOTE:** Controllers **directly inject handler classes** (not CommandBus/QueryBus). This matches existing Tickets/Events controller pattern. Handlers are plain `@Injectable()` classes, NOT decorated with `@CommandHandler`/`@QueryHandler`.

**Acceptance Criteria:**
- [ ] **OrdersController** (`/api/orders`):
  - Injects: `CreateOrderHandler`, `ProcessPaymentHandler`, `RequestRefundHandler`, `GetOrderByIdHandler`, `GetUserOrdersHandler`
  - `POST /` — Create order (auth required)
  - `GET /` — List user's orders (auth, paginated)
  - `GET /:id` — Get order details (auth, owner or admin)
  - `POST /:id/payment` — Process payment (auth, owner)
  - `POST /:id/refund` — Request refund (auth, organizer/admin)
  - Maps `Result.isFailure` → appropriate HTTP exceptions (BadRequest, NotFound, Forbidden)
- [ ] **WebhooksController** (`/api/webhooks`):
  - Injects: `ConfirmPaymentHandler`, `FailPaymentHandler`, `PaymentProviderFactory`
  - `POST /stripe` — Raw body parsing, Stripe-Signature header verification
  - `GET /konnect` — Query param `?payment_ref=xxx`, fetches status
  - `POST /paymee` — Body with token + check_sum HMAC verification
  - **No auth guards** on webhooks (signature verification instead)
- [ ] Swagger decorators on all endpoints (`@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiBearerAuth`)
- [ ] Proper HTTP status codes (201, 200, 400, 401, 403, 404)
- [ ] Rate limiting on order creation endpoint via `@Throttle()`

---

#### Issue #16: Scheduled Tasks & Event Handlers (App + Infra split)

**Priority:** Medium
**Files to create:**
- `infrastructure/services/order-expiration.service.ts` — Cron job (every minute)
- `application/event-handlers/order-paid-app.handler.ts` — Business logic (confirm tickets)
- `application/event-handlers/order-failed-app.handler.ts` — Business logic (release reservations)
- `infrastructure/event-handlers/order-created-infra.handler.ts` — Side effects (logging)
- `infrastructure/event-handlers/order-paid-infra.handler.ts` — Side effects (email/SMS notification)
- `infrastructure/event-handlers/order-failed-infra.handler.ts` — Side effects (notify user)
- `infrastructure/event-handlers/order-refunded-infra.handler.ts` — Side effects (notify user + organizer)

**⚠️ PATTERN NOTE:** Existing modules split event handlers into two categories:
- **Application event handlers** — business reactions (e.g., confirm tickets on payment)
- **Infrastructure event handlers** — side effects (e.g., send email, log to analytics)

**Acceptance Criteria:**
- [ ] **OrderExpirationService**: `@Cron(CronExpression.EVERY_MINUTE)` + configurable enable/disable via `ConfigService`
- [ ] **App handlers** (business logic, no infra deps):
  - `OrderPaidAppHandler` — Confirms ticket reservations via port
  - `OrderFailedAppHandler` — Releases ticket reservations via port
- [ ] **Infra handlers** (side effects, can use external services):
  - `OrderCreatedInfraHandler` — Logs order creation
  - `OrderPaidInfraHandler` — Triggers email/SMS notification
  - `OrderFailedInfraHandler` — Notifies user of failure
  - `OrderRefundedInfraHandler` — Notifies user + organizer of refund
- [ ] Uses NestJS `Logger` (never console.log)
- [ ] Failure in infra handlers does NOT roll back business state

---

#### Issue #17: Module Configuration & Registration

**Priority:** High (integration point)
**Files to create:**
- `infrastructure/payments.module.ts`
- `infrastructure/adapters/ticket-reservation.adapter.ts` — Implements `ITicketReservationPort`
- `infrastructure/adapters/event-query.adapter.ts` — Implements `IEventQueryPort`
- Update `app.module.ts` to import PaymentsModule

**⚠️ PATTERN NOTE:** Follow exact module registration pattern from Tickets module:
- Handler arrays: `const CommandHandlers = [...]`, `const QueryHandlers = [...]`
- Provider objects: `{ provide: ORDER_REPOSITORY, useClass: OrderTypeOrmRepository }`
- Cross-module adapters as providers with Symbol tokens
- Import `TypeOrmModule.forFeature([...])`, `ConfigModule`, `ScheduleModule`, `TicketsModule`, `EventsModule`
- Export handlers that other modules may need

**Acceptance Criteria:**
- [ ] All providers registered (repositories, services, handlers, adapters)
- [ ] Injection tokens bound to implementations via Provider objects
- [ ] Cross-module ports wired to adapters (Tickets, Events)
- [ ] Mappers registered as `@Injectable()` providers (not static utils)
- [ ] Config module integrated (env vars for gateways)
- [ ] Module compiles and bootstraps without errors
- [ ] Architecture fitness tests pass (hexagonal boundaries)
- [ ] Existing tests still pass (no regressions)

---

### Phase 4 — Testing & Validation

---

#### Issue #18: Comprehensive Test Suite

**Priority:** High
**Files to create:**
- `test/unit/modules/payments/domain/` — Entity & VO tests
- `test/unit/modules/payments/application/` — Handler tests
- `test/unit/modules/payments/services/` — Service tests
- `test/integration/modules/payments/` — DB + handler integration
- `test/e2e/payments-workflows/` — Full API flow tests

**Acceptance Criteria:**
- [ ] **Unit tests (>85% coverage):**
  - Order entity state transitions (all valid + invalid paths)
  - Money VO arithmetic (TND millimes, rounding)
  - Commission calculator (4% precision)
  - Payment provider factory routing
  - Webhook verification (all 3 providers)
  - Fraud detection logic
  - Each command/query handler
- [ ] **Integration tests (>75% coverage):**
  - Order lifecycle (create → pay → confirm)
  - Payment flow with mocked gateway responses
  - Refund processing
  - Order expiration cron
  - Webhook handling end-to-end
- [ ] **E2E tests:**
  - Complete checkout (Stripe test mode)
  - Complete checkout (Konnect sandbox)
  - Payment failure + retry
  - Refund workflow
- [ ] Architecture fitness tests pass (hexagonal boundaries)
- [ ] All existing tests still pass

---

## Implementation Order (Recommended)

```
Issue #1  → Money VO & Currency (foundation)
Issue #2  → Order Entity & State Machine
Issue #3  → Payment & Refund Entities
Issue #4  → Domain Events & Exceptions
Issue #5  → Port Interfaces
Issue #6  → CreateOrder Handler
Issue #7  → ProcessPayment Handler
Issue #8  → Confirm/Fail Payment Handlers
Issue #9  → RequestRefund Handler
Issue #10 → ExpireOrders Cron Handler
Issue #11 → Query Handlers & DTOs
Issue #12 → Commission & Fraud Services
Issue #13 → Persistence (TypeORM + Migration)
Issue #14 → Payment Gateway Adapters
Issue #15 → HTTP Controllers
Issue #16 → Scheduled Tasks & Event Handlers
Issue #17 → Module Configuration
Issue #18 → Test Suite
```

**Parallelizable:**
- Issues #1-4 (domain layer) can be done in sequence quickly
- Issues #6-10 (command handlers) depend on #5 but are independent of each other
- Issue #14 (gateway adapters) can start after #5
- Issue #13 (persistence) can start after #2-3

---

## Environment Variables Required

```bash
# Already in .env.local — verify/update:
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...       # Need to add
STRIPE_API_VERSION=2023-10-16         # Need to add

KONNECT_API_KEY=...                   # ✅ Present
KONNECT_WALLET_ID=...                 # ✅ Present
KONNECT_ENV=sandbox                   # Need to add

PAYMEE_API_KEY=...                    # ✅ Present
PAYMEE_API_TOKEN=...                  # ✅ Present
PAYMEE_ENV=sandbox                    # Need to add

# Platform configuration (scalability)
PLATFORM_COMMISSION_RATE=0.04         # 4% — configurable, not hardcoded
ORDER_EXPIRATION_MINUTES=15           # Configurable order timeout
MAX_PAYMENT_ATTEMPTS=3                # Configurable retry limit
MAX_ORDERS_PER_HOUR=5                 # Rate limit per user
MAX_TICKETS_PER_EVENT=20              # Per-user cap per event

FRONTEND_URL=http://localhost:3001    # Verify port
BACKEND_URL=http://localhost:3000     # Need to add
```

---

## Dependencies to Install

```bash
# Already available:
# - stripe (^20.0.0) ✅
# - axios (via @nestjs/axios or standalone) — check if installed
# - @nestjs/schedule (^6.1.0) ✅ for cron

# May need:
npm install axios  # if not already present (for Konnect/Paymee REST calls)
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| TND precision errors | DECIMAL(10,3) + Money VO with millimes awareness |
| Webhook replay attacks | Idempotency via `payment_intent_id` / `gateway_payment_ref` uniqueness |
| Order stuck in PROCESSING | Expiration cron catches all PENDING; add separate recovery for PROCESSING > 30min |
| Konnect sandbox instability | Paymee fallback + mock provider for tests |
| PCI compliance | Never store card numbers; gateway handles all sensitive data |
| Race conditions on ticket reservation | Pessimistic locking on ticket status in Tickets module |
