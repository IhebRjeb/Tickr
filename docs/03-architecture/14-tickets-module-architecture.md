# Tickets Module Architecture

## Overview

The Tickets module follows **Hexagonal Architecture** (Ports and Adapters) principles, serving as the core product bounded context for Tickr. It handles ticket reservation with a 15-minute hold, QR code generation, check-in validation at venue entrances, ticket transfers, and downloadable PDF tickets.

**Status:** ✅ **100% COMPLETE** (as of April 13, 2026)

## Module Structure

```
src/modules/tickets/
├── domain/                           # Domain Layer (Core Business Logic) ✅
│   ├── entities/                    # Aggregate Root & Entities
│   │   ├── ticket.entity.ts         # Ticket Aggregate Root
│   │   └── check-in.entity.ts       # Check-In Audit Entity
│   ├── events/                      # Domain Events (7 events)
│   │   ├── ticket-reserved.event.ts
│   │   ├── ticket-confirmed.event.ts
│   │   ├── ticket-cancelled.event.ts
│   │   ├── ticket-checked-in.event.ts
│   │   ├── ticket-transferred.event.ts
│   │   ├── ticket-expired.event.ts
│   │   └── duplicate-check-in-attempted.event.ts
│   ├── exceptions/                  # Domain Exceptions (11 exceptions)
│   │   ├── invalid-ticket.exception.ts
│   │   ├── ticket-not-confirmable.exception.ts
│   │   ├── ticket-not-cancellable.exception.ts
│   │   ├── ticket-not-checkable.exception.ts
│   │   ├── ticket-not-transferable.exception.ts
│   │   ├── ticket-already-checked-in.exception.ts
│   │   ├── ticket-expired.exception.ts
│   │   ├── invalid-qr-code.exception.ts
│   │   ├── invalid-check-in.exception.ts
│   │   ├── max-transfers-reached.exception.ts
│   │   └── check-in-outside-window.exception.ts
│   ├── value-objects/               # Value Objects (3 VOs)
│   │   ├── qr-code.vo.ts           # QR code with checksum validation
│   │   ├── ticket-status.vo.ts     # Ticket lifecycle states
│   │   └── check-in-result.vo.ts   # Check-in operation result
│   └── index.ts                     # Barrel exports
├── application/                      # Application Layer (Use Cases) ✅
│   ├── commands/                    # 6 Command Handlers
│   │   ├── reserve-tickets/
│   │   ├── confirm-tickets/
│   │   ├── cancel-tickets/
│   │   ├── check-in-ticket/
│   │   ├── transfer-ticket/
│   │   └── expire-tickets/
│   ├── queries/                     # 5 Query Handlers
│   │   ├── get-ticket-by-id/
│   │   ├── get-ticket-by-qr-code/
│   │   ├── get-user-tickets/
│   │   ├── get-event-tickets/
│   │   └── get-event-check-in-stats/
│   ├── event-handlers/              # 4 Domain Event Handlers
│   │   ├── ticket-confirmed.handler.ts
│   │   ├── ticket-cancelled.handler.ts
│   │   ├── ticket-expired.handler.ts
│   │   └── duplicate-check-in.handler.ts
│   ├── dtos/                        # Request/Response DTOs (8 files, 15 classes)
│   │   ├── reserve-tickets.dto.ts
│   │   ├── confirm-tickets.dto.ts
│   │   ├── cancel-tickets.dto.ts
│   │   ├── check-in.dto.ts
│   │   ├── transfer-ticket.dto.ts
│   │   ├── ticket.dto.ts
│   │   ├── ticket-detail.dto.ts
│   │   └── check-in-stats.dto.ts
│   ├── ports/                       # Port Interfaces
│   │   ├── ticket.repository.port.ts
│   │   ├── check-in.repository.port.ts
│   │   ├── event-query.port.ts
│   │   └── user-query.port.ts
│   ├── models/                      # Cross-module DTOs
│   │   ├── event-query.model.ts
│   │   └── user-query.model.ts
│   ├── services/
│   │   └── ticket-notification.port.ts
│   └── index.ts
└── infrastructure/                   # Infrastructure Layer ✅
    ├── controllers/
    │   └── tickets.controller.ts    # REST API (8 endpoints)
    ├── persistence/
    │   ├── entities/
    │   │   ├── ticket.orm-entity.ts
    │   │   ├── check-in.orm-entity.ts
    │   │   └── index.ts
    │   ├── mappers/
    │   │   ├── ticket.mapper.ts
    │   │   └── check-in.mapper.ts
    │   └── repositories/
    │       ├── ticket.repository.ts
    │       └── check-in.repository.ts
    ├── adapters/
    │   ├── event-query.adapter.ts   # Cross-module: Events → Tickets
    │   └── user-query.adapter.ts    # Cross-module: Users → Tickets
    ├── services/
    │   ├── qr-code.service.ts
    │   ├── pdf-generator.service.ts
    │   ├── ticket-s3-storage.service.ts
    │   └── ticket-expiration.service.ts
    ├── guards/
    │   └── is-ticket-owner.guard.ts
    ├── event-handlers/
    │   ├── ticket-confirmed-infra.handler.ts
    │   ├── ticket-cancelled-infra.handler.ts
    │   ├── ticket-expired-infra.handler.ts
    │   └── duplicate-check-in-infra.handler.ts
    └── tickets.module.ts            # NestJS module configuration
```

---

## Implementation Summary

| Layer              | Components                                                             | Status  |
| ------------------ | ---------------------------------------------------------------------- | ------- |
| **Domain**         | 2 Entities, 3 VOs, 7 Events, 11 Exceptions                             | ✅ 100% |
| **Application**    | 6 Commands, 5 Queries, 4 Event Handlers, 15 DTOs, 4 Ports              | ✅ 100% |
| **Infrastructure** | Controller, Repositories, Mappers, 4 Services, Guards, Adapters        | ✅ 100% |
| **Testing**        | 19 unit suites (217 tests), 1 integration (14 tests), 3 E2E (28 tests) | ✅ 100% |

**Total:** 99 source files + 24 test files

---

## Architectural Decisions

### 1. Anti-Corruption Layer for Cross-Module Queries

The Tickets module needs data from Events and Users modules but **must not import their domain entities directly**. Two port interfaces define the contract:

```typescript
// EventQueryPort — resolves event and ticket-type data
export interface EventQueryPort {
  getEventById(eventId: string): Promise<EventInfo | null>;
  getTicketTypeAvailability(
    ticketTypeId: string,
  ): Promise<TicketTypeAvailability | null>;
  getTicketTypesByIds(ticketTypeIds: string[]): Promise<TicketTypeInfo[]>;
  decrementAvailability(ticketTypeId: string, quantity: number): Promise<void>;
  incrementAvailability(ticketTypeId: string, quantity: number): Promise<void>;
}

// UserQueryPort — resolves user info by email (for transfers)
export interface UserQueryPort {
  getUserByEmail(email: string): Promise<UserInfo | null>;
}
```

Infrastructure adapters implement these ports by querying the Events/Users repositories.

### 2. Separate Audit Entity for Check-Ins

Check-ins are recorded as separate `CheckInEntity` records rather than embedded in the ticket. This provides:

- Full audit trail (duplicate attempts recorded with `isValid: false`)
- Device and gate tracking per scan
- Staff attribution for each check-in
- Authorization provenance (`OWNER`, `ADMIN`, or `ASSIGNMENT`) and assignment ID

Successful check-in uses a Tickets application persistence port backed by one TypeORM transaction.
The repository conditionally updates only a `CONFIRMED` ticket and writes the valid audit row in
the same transaction. Concurrent scanners therefore cannot both admit the same ticket. A losing
request records a separate invalid duplicate attempt.

### 3. Event-Scoped Check-In Authorization

`EventCheckInAccessPort` belongs to the Tickets application layer. Its Tickets infrastructure
adapter calls the Events application access resolver; no Events domain or repository type crosses
into Tickets application code.

Every scan and basic-statistics query checks current account state and resolves one of three access
sources:

| Source       | Requirement                                                         |
| ------------ | ------------------------------------------------------------------- |
| `OWNER`      | Current active, verified account owns the event                     |
| `ADMIN`      | Current active, verified account still has `ADMIN` role             |
| `ASSIGNMENT` | Current active, verified account has a non-revoked event assignment |

Scanning additionally requires a `PUBLISHED` event and the existing event time window. The request
includes `eventId`; a valid QR from another event is handled as unknown for the selected event.

### 4. QR Code with Checksum Validation

QR codes use the format `v1-{uuid}-{checksum}` where the checksum is derived from the UUID. This allows:

- Fast format validation before database lookup
- Version prefix for future QR format migration
- Tamper detection without cryptographic overhead

```typescript
// QRCodeVO — generates and validates QR codes
const qr = QRCodeVO.generate(); // v1-550e8400-...-a7f2
const valid = QRCodeVO.isValid(qrCode); // Format + checksum check
```

### 5. Domain Event Split: Application vs Infrastructure Handlers

Each domain event has **two handler levels**:

| Handler                             | Layer          | Responsibility                               |
| ----------------------------------- | -------------- | -------------------------------------------- |
| `ticket-confirmed.handler.ts`       | Application    | Business logic (update state, log metrics)   |
| `ticket-confirmed-infra.handler.ts` | Infrastructure | Side effects (send email, push notification) |

This ensures domain event handling stays testable without infrastructure dependencies.

---

## Ticket Entity (Aggregate Root)

### Lifecycle States

```
 ┌────────────┐
 │  RESERVED  │ ← reserve() — 15 min hold
 └─────┬──────┘
       │ confirm()
       ▼
 ┌────────────┐
 │ CONFIRMED  │ ← QR generated, PDF created
 └──┬─────┬───┘
    │     │ transfer()
    │     ▼
    │  ┌────────────┐
    │  │ CONFIRMED  │ (new owner, new QR)
    │  └──┬─────────┘
    │     │
    ├─────┘
    │ checkIn()
    ▼
 ┌────────────┐
 │ CHECKED_IN │ ← Scanned at venue
 └────────────┘

 ─── Alternative Paths ───

 RESERVED ──expire()──→ EXPIRED   (15 min timeout)
 RESERVED ──cancel()──→ CANCELLED (user abandons)
 CONFIRMED ─cancel()──→ CANCELLED (refund initiated)
```

### Business Rules

| Rule               | Detail                                                               |
| ------------------ | -------------------------------------------------------------------- |
| QR Code format     | `v1-{uuid}-{checksum}` — globally unique, checksum-validated         |
| Reservation TTL    | 15 minutes from creation                                             |
| Check-in window    | Event start − 1 hour → Event end                                     |
| Duplicate check-in | Rejected; audit record with `isValid: false`, security event emitted |
| Transfer limit     | Max 3 transfers per ticket lifetime                                  |
| PDF storage        | S3 with 7-day signed URLs                                            |
| Price immutability | Price locked at reservation time, stored on ticket                   |

### State Transition Rules

| From      | To         | Method                     | Condition               |
| --------- | ---------- | -------------------------- | ----------------------- |
| RESERVED  | CONFIRMED  | `confirm(orderId)`         | Must have valid orderId |
| RESERVED  | CANCELLED  | `cancel()`                 | Always allowed          |
| RESERVED  | EXPIRED    | `expire()`                 | `reservedUntil < now`   |
| CONFIRMED | CANCELLED  | `cancel()`                 | Not yet checked in      |
| CONFIRMED | CHECKED_IN | `checkIn(staffId, ...)`    | Within time window      |
| CONFIRMED | CONFIRMED  | `transfer(newUserId, ...)` | `transferCount < 3`     |

---

## Domain Events

| Event                            | Published When | Key Data                                                 |
| -------------------------------- | -------------- | -------------------------------------------------------- |
| `TicketReservedEvent`            | `reserve()`    | ticketId, eventId, userId, priceAmount, reservedUntil    |
| `TicketConfirmedEvent`           | `confirm()`    | ticketId, eventId, userId, orderId, qrCode               |
| `TicketCancelledEvent`           | `cancel()`     | ticketId, eventId, status, wasConfirmed, priceAmount     |
| `TicketCheckedInEvent`           | `checkIn()`    | ticketId, eventId, staffId, locationGate                 |
| `TicketTransferredEvent`         | `transfer()`   | ticketId, fromUserId, toUserId, newQrCode, transferCount |
| `TicketExpiredEvent`             | `expire()`     | ticketId, eventId, userId, reservedUntil                 |
| `DuplicateCheckInAttemptedEvent` | Duplicate scan | ticketId, eventId, staffId, originalCheckInAt            |

---

## Value Objects

### TicketStatus

```typescript
enum TicketStatus {
  RESERVED = "RESERVED", // Awaiting payment (15 min hold)
  CONFIRMED = "CONFIRMED", // Payment received, ticket active
  CANCELLED = "CANCELLED", // Cancelled by user or system
  CHECKED_IN = "CHECKED_IN", // Scanned at venue entrance
  EXPIRED = "EXPIRED", // Reservation TTL exceeded
}
```

### QRCodeVO

Self-validating value object with versioned format:

```typescript
// Generate new QR code
const qr = QRCodeVO.generate(); // "v1-550e8400-e29b-41d4-a716-446655440000-a7f2"

// Validate existing code
QRCodeVO.isValid(code); // Checks format + checksum

// Reconstitute from stored value
const qr = QRCodeVO.fromString(storedValue);
```

### CheckInResultVO

Immutable result of a check-in operation:

```typescript
interface CheckInResultProps {
  isValid: boolean;
  ticketId: string;
  holderName: string;
  ticketTypeName: string;
  checkedInAt: Date;
  failureReason?: string;
}
```

---

## Cross-Module Integration

### Events Module (via EventQueryPort)

| Method                        | Purpose                                        |
| ----------------------------- | ---------------------------------------------- |
| `getEventById()`              | Validate event exists and is PUBLISHED         |
| `getTicketTypeAvailability()` | Check available capacity before reservation    |
| `getTicketTypesByIds()`       | Resolve per-tier names for check-in statistics |
| `decrementAvailability()`     | Reserve tickets (atomic decrement)             |
| `incrementAvailability()`     | Release tickets on cancellation/expiration     |

### Users Module (via UserQueryPort)

| Method             | Purpose                                  |
| ------------------ | ---------------------------------------- |
| `getUserByEmail()` | Resolve transfer target by email address |

### Dependency Flow

```
┌──────────────────┐     ┌──────────────────┐
│   Events Module  │     │   Users Module   │
│                  │     │                  │
│  EventRepository ◄─────┤                  │
│  TicketType info │     │  UserRepository  ◄──┐
└──────────────────┘     └──────────────────┘  │
        ▲                         ▲            │
        │ EventQueryAdapter       │ UserQuery  │
        │                         │ Adapter    │
┌───────┴─────────────────────────┴────────────┤
│                                              │
│              Tickets Module                  │
│                                              │
│  Domain:  TicketEntity, CheckInEntity        │
│  App:     6 Commands, 5 Queries              │
│  Infra:   Controller, Repos, Services        │
│                                              │
└──────────────────────────────────────────────┘
        │
        ▼ (future)
┌──────────────────┐
│ Payments Module  │
│ (consumes ticket │
│  confirmation)   │
└──────────────────┘
```

---

## API Endpoints

| Method | Path                                | Auth   | Role                       | Description                                                        |
| ------ | ----------------------------------- | ------ | -------------------------- | ------------------------------------------------------------------ |
| `POST` | `/api/tickets/reserve`              | Bearer | Any                        | Reserve tickets (15 min hold)                                      |
| `POST` | `/api/tickets/confirm`              | Bearer | Internal                   | Confirm after payment                                              |
| `POST` | `/api/tickets/cancel`               | Bearer | Any                        | Cancel tickets                                                     |
| `GET`  | `/api/tickets`                      | Bearer | Any                        | User's own tickets (paginated)                                     |
| `GET`  | `/api/tickets/:id`                  | Bearer | Owner/Organizer            | Ticket details                                                     |
| `GET`  | `/api/tickets/:id/pdf`              | Bearer | Owner                      | PDF download (302 → S3)                                            |
| `POST` | `/api/tickets/:id/transfer`         | Bearer | Owner                      | Transfer to another user                                           |
| `POST` | `/api/tickets/check-in`             | Bearer | Owner/Admin/assigned staff | Atomic check-in with `{ eventId, qrCode, deviceId, locationGate }` |
| `GET`  | `/api/tickets/event/:eventId/stats` | Bearer | Owner/Admin/assigned staff | Eligible, checked-in, remaining, and per-tier statistics           |

All endpoints decorated with `@ApiOperation`, `@ApiResponse`, `@ApiBody`/`@ApiParam`/`@ApiQuery` as appropriate. DTOs have full `@ApiProperty` coverage (68 properties across 15 classes).

---

## Infrastructure Services

### QRCodeService

Generates QR code images from the `v1-{uuid}-{checksum}` string using the `qrcode` library.

### PDFGeneratorService

Creates downloadable ticket PDFs using `pdfkit` with event details, holder info, and embedded QR image.

### TicketS3StorageService

Manages PDF storage in S3:

- Upload generated PDFs
- Generate 7-day signed download URLs
- Bucket path: `tickets/{env}/{ticketId}.pdf`

### TicketExpirationService

`@Cron`-based scheduled job that:

1. Finds all tickets with `status = RESERVED` and `reservedUntil < now`
2. Calls `expire()` on each, publishing `TicketExpiredEvent`
3. Increments availability back on the ticket type

---

## Testing Strategy

| Category               | Files      | Tests      | Coverage                                      |
| ---------------------- | ---------- | ---------- | --------------------------------------------- |
| **Unit — Domain**      | 5 suites   | 90+ tests  | Entities, VOs, exceptions                     |
| **Unit — Application** | 14 suites  | 127+ tests | All handlers + DTOs                           |
| **Integration**        | 1 suite    | 14 tests   | Repository roundtrip, expired query           |
| **E2E**                | 3 suites   | 28 tests   | Full HTTP flows (reserve, check-in, transfer) |
| **Architecture**       | (shared)   | 34 tests   | Auto-detected by fitness functions            |
| **Total**              | 23+ suites | 259+ tests | >85% statement coverage                       |

---

## Implementation Status

- [x] Domain entities with full lifecycle
- [x] 7 domain events with proper aggregate correlation
- [x] 11 domain exceptions covering all error cases
- [x] 3 value objects (QRCode, TicketStatus, CheckInResult)
- [x] 6 command handlers with Result pattern
- [x] 5 query handlers with pagination
- [x] 4 application event handlers + 4 infrastructure event handlers
- [x] 15 DTOs with full class-validator + Swagger decorators
- [x] TypeORM entities, mappers, and repositories
- [x] Anti-corruption adapters (EventQuery, UserQuery)
- [x] QR code, PDF, S3, and expiration services
- [x] REST controller with complete Swagger documentation
- [x] IsTicketOwnerGuard
- [x] Module wiring in tickets.module.ts and app.module.ts
- [x] Unit tests (217 passing, >85% coverage)
- [x] Integration tests (14 passing)
- [x] E2E tests (28 passing)
- [x] Architecture fitness functions (auto-detected, 34 passing)
