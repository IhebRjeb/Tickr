# Events Module Architecture

## Overview

The Events module follows **Hexagonal Architecture** (Ports and Adapters) principles, serving as the core bounded context for event management in Tickr. It handles event creation, ticket type management, publishing workflow, event-scoped check-in staff access, capacity management, and Redis caching.

**Status:** Active V1 implementation (verified September 1, 2026)

## Module Structure

```
src/modules/events/
├── domain/                           # Domain Layer (Core Business Logic) ✅
│   ├── entities/                    # Aggregate Root & Entities
│   │   ├── event.entity.ts          # Event Aggregate Root (1097 lines)
│   │   ├── event-check-in-staff-assignment.entity.ts
│   │   └── ticket-type.entity.ts    # TicketType Sub-Entity (525 lines)
│   ├── events/                      # Domain Events (7 events)
│   │   ├── event-created.event.ts
│   │   ├── event-published.event.ts
│   │   ├── event-updated.event.ts
│   │   ├── event-cancelled.event.ts
│   │   ├── ticket-type-added.event.ts
│   │   ├── ticket-type-updated.event.ts
│   │   └── ticket-type-sold-out.event.ts
│   ├── exceptions/                  # Domain Exceptions (14 exceptions)
│   │   └── *.exception.ts
│   ├── value-objects/               # Value Objects (7 VOs)
│   │   ├── event-category.vo.ts     # Event category enum & validation
│   │   ├── event-status.vo.ts       # Event lifecycle states
│   │   ├── location.vo.ts           # Location with geocoding
│   │   ├── event-date-range.vo.ts   # Date range validation
│   │   ├── sales-period.vo.ts       # Ticket sales window
│   │   ├── ticket-price.vo.ts       # Price with currency
│   │   └── currency.vo.ts           # Supported currencies (TND)
│   └── index.ts                     # Barrel exports
├── application/                      # Application Layer (Use Cases) ✅
│   ├── commands/                    # 9 Command Handlers
│   │   ├── create-event/
│   │   ├── update-event/
│   │   ├── publish-event/
│   │   ├── cancel-event/
│   │   ├── complete-event/
│   │   ├── add-ticket-type/
│   │   ├── update-ticket-type/
│   │   ├── remove-ticket-type/
│   │   └── upload-event-image/
│   ├── queries/                     # 6 Query Handlers
│   │   ├── get-event-by-id/
│   │   ├── get-published-events/
│   │   ├── get-events-by-category/
│   │   ├── get-organizer-events/
│   │   ├── get-upcoming-events/
│   │   └── search-events/
│   ├── event-handlers/              # 3 Domain Event Handlers
│   │   ├── event-published.handler.ts
│   │   ├── event-cancelled.handler.ts
│   │   └── ticket-type-sold-out.handler.ts
│   ├── dtos/                        # Request/Response DTOs
│   ├── ports/                       # Port Interfaces
│   ├── services/                    # Application Services
│   └── index.ts
└── infrastructure/                   # Infrastructure Layer ✅
    ├── controllers/
    │   └── events.controller.ts     # REST API endpoints
    ├── persistence/
    │   ├── entities/
    │   │   ├── event.orm-entity.ts
    │   │   └── ticket-type.orm-entity.ts
    │   └── mappers/
    │       ├── event.mapper.ts
    │       └── ticket-type.mapper.ts
    ├── repositories/
    │   ├── event.repository.ts      # EventRepositoryPort implementation
    │   └── ticket-type.repository.ts
    ├── adapters/
    │   └── user-validation.service.adapter.ts
    ├── services/
    │   ├── event-cache.service.ts   # Redis caching
    │   └── s3-storage.service.ts    # AWS S3 image storage
    ├── guards/
    │   └── is-event-owner.guard.ts
    ├── exceptions/
    │   └── s3.exceptions.ts
    └── events.module.ts             # NestJS module configuration
```

---

## Implementation Summary

| Layer              | Components                                           | Status  |
| ------------------ | ---------------------------------------------------- | ------- |
| **Domain**         | 2 Entities, 7 VOs, 7 Events, 14 Exceptions           | ✅ 100% |
| **Application**    | 9 Commands, 6 Queries, 3 Event Handlers, DTOs, Ports | ✅ 100% |
| **Infrastructure** | Controller, Repositories, Mappers, Services, Guards  | ✅ 100% |
| **Testing**        | 40 test files, 1805+ passing tests                   | ✅ 100% |

---

## Architectural Decisions

### Event-Scoped Check-In Staff

Check-in staff is an event-scoped authorization relationship, not a global Users role.
`EventCheckInStaffAssignmentEntity` is a separate aggregate because roster changes occur
independently from event editing and may happen concurrently during venue operations.

- Events owns assignment, revocation, event lifecycle, and the final access decision.
- An existing active, email-verified Tickr account may be assigned by the event owner.
- The event owner and current platform administrators have implicit check-in access.
- One partial unique index permits one active assignment per `(event_id, user_id)`.
- Revocation records `revoked_at` and `revoked_by`; history is not deleted.
- Tickets consumes the decision through its own application port and an infrastructure adapter.
- Authorization decisions are not positively cached, so revocation affects the next request.

The staff-management contract is:

```text
POST   /api/events/:id/check-in-staff
GET    /api/events/:id/check-in-staff
DELETE /api/events/:id/check-in-staff/:assignmentId
GET    /api/events/check-in-access/me
```

The first three routes are event-owner only. The final route returns the published, non-ended
events the current active and verified account may scan as owner, administrator, or assigned staff.

### 1. Aggregate Root Pattern

**EventEntity** is the aggregate root, controlling all access to **TicketTypeEntity** sub-entities.

```typescript
// All ticket type operations go through the Event aggregate
event.addTicketType(ticketType); // ✅ Correct
event.updateTicketType(id, updates); // ✅ Correct
event.removeTicketType(id); // ✅ Correct

// Direct manipulation is not allowed
ticketType.update(data); // ❌ Wrong - use aggregate methods
```

### 2. Domain Event Naming

Domain events follow DDD patterns for proper event correlation:

| Event Type            | ID Property                | Reason                              |
| --------------------- | -------------------------- | ----------------------------------- |
| **Aggregate Events**  | `aggregateId`              | Event's own ID (it's the aggregate) |
| **Sub-Entity Events** | `ticketTypeId` + `eventId` | Need both for correlation           |

**Example:**

```typescript
// EventPublishedEvent - aggregate event
new EventPublishedEvent(
  aggregateId: this._id,  // The event's ID
  organizerId: ...,
  ...
);

// TicketTypeSoldOutEvent - sub-entity event (on TicketTypeEntity)
new TicketTypeSoldOutEvent(
  ticketTypeId: this._id,  // Ticket type's ID
  eventId: this._eventId,  // Parent event's ID for correlation
  ...
);
```

### 3. UUID Validation

The `organizerId` is validated as UUID format in the domain layer:

```typescript
// Uses shared domain utility
import { isUUID } from "@shared/domain/utils";

if (!isUUID(props.organizerId.trim())) {
  return Result.fail(
    InvalidEventException.invalidOrganizerId(props.organizerId),
  );
}
```

---

## Event Entity (Aggregate Root)

### Lifecycle States

```
┌─────────┐
│  DRAFT  │ ← Initial state
└────┬────┘
     │ publish()
     ▼
┌───────────┐
│ PUBLISHED │
└─────┬─────┘
      │
      ├───────────────┬─────────────────┐
      │               │                 │
      ▼               ▼                 ▼
┌───────────┐   ┌───────────┐   ┌───────────────┐
│ CANCELLED │   │ COMPLETED │   │ hasStarted()  │
│           │   │           │   │ (no cancel)   │
└───────────┘   └───────────┘   └───────────────┘
```

### Business Rules

#### Event Creation

| Rule         | Validation                       |
| ------------ | -------------------------------- |
| Organizer ID | Required, must be valid UUID     |
| Title        | Required, 1-200 characters       |
| Description  | Optional, max 5000 characters    |
| Category     | Must be valid EventCategory enum |
| Location     | Must be valid LocationVO         |
| Date Range   | Must be valid EventDateRangeVO   |

#### Event Publishing

| Rule         | Validation                               |
| ------------ | ---------------------------------------- |
| Status       | Must be DRAFT                            |
| Ticket Types | At least one active ticket type required |
| Date         | Event start date must be in future       |
| Location     | Must be defined                          |
| Title        | Must be defined                          |

#### Event Cancellation

**Business Rule:** Both DRAFT and PUBLISHED events can be cancelled if they haven't started.

| Scenario               | Can Cancel? | Reason                                  |
| ---------------------- | ----------- | --------------------------------------- |
| DRAFT, not started     | ✅ Yes      | Organizer can abandon incomplete event  |
| PUBLISHED, not started | ✅ Yes      | Organizer can cancel (triggers refunds) |
| PUBLISHED, has started | ❌ No       | Event is in progress                    |
| CANCELLED              | ❌ No       | Already cancelled                       |
| COMPLETED              | ❌ No       | Event has finished                      |

```typescript
canBeCancelled(): boolean {
  return (
    (this._status === EventStatus.DRAFT || this._status === EventStatus.PUBLISHED) &&
    !this.hasStarted()
  );
}
```

#### Event Updates

**Terminal State Rule:** CANCELLED and COMPLETED are terminal states - no modifications allowed.

| Status    | Allowed Updates                                          |
| --------- | -------------------------------------------------------- |
| DRAFT     | All fields                                               |
| PUBLISHED | Title, description, category, image (NOT dates/location) |
| CANCELLED | ❌ None                                                  |
| COMPLETED | ❌ None                                                  |

```typescript
updateDetails(updates): Result<void, Error> {
  // Terminal states reject all modifications
  if (this._status === EventStatus.CANCELLED) {
    return Result.fail(EventCannotBeModifiedException.cancelled());
  }
  if (this._status === EventStatus.COMPLETED) {
    return Result.fail(EventCannotBeModifiedException.completed());
  }
  // ...
}
```

### Ticket Type Rules

| Rule              | Constraint                          |
| ----------------- | ----------------------------------- |
| Maximum per event | 10 ticket types                     |
| Unique names      | Names must be unique within event   |
| Sales period      | Must end before event starts        |
| Quantity limits   | 1 - 10,000 per type                 |
| Price limits      | 0.001 - 999,999 (currency units)    |
| Cannot remove if  | Status is PUBLISHED or tickets sold |

---

## Domain Events

### Event Domain Events

| Event                 | Published When        | Data                                                                            |
| --------------------- | --------------------- | ------------------------------------------------------------------------------- |
| `EventCreatedEvent`   | Event.create()        | aggregateId, organizerId, title, category                                       |
| `EventPublishedEvent` | Event.publish()       | aggregateId, organizerId, title, publishedAt, ticketTypeCount, totalCapacity    |
| `EventUpdatedEvent`   | Event.updateDetails() | aggregateId, organizerId, changes, updatedAt                                    |
| `EventCancelledEvent` | Event.cancel()        | aggregateId, organizerId, title, reason, cancelledAt, soldTickets, totalRevenue |

### Ticket Type Domain Events

| Event                    | Published When                             | Data                                                                           |
| ------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------ |
| `TicketTypeAddedEvent`   | Event.addTicketType()                      | aggregateId, ticketTypeId, name, price, quantity, salesStartDate, salesEndDate |
| `TicketTypeUpdatedEvent` | Event.updateTicketType()                   | aggregateId, ticketTypeId, ticketTypeName, changes, updatedAt                  |
| `TicketTypeSoldOutEvent` | TicketType.incrementSold() (when sold out) | ticketTypeId, eventId, ticketTypeName, totalQuantity                           |

---

## Value Objects

### EventCategory

Supported event categories:

```typescript
enum EventCategory {
  CONCERT = "CONCERT",
  CONFERENCE = "CONFERENCE",
  SPORT = "SPORT",
  THEATER = "THEATER",
  FESTIVAL = "FESTIVAL",
  WORKSHOP = "WORKSHOP",
  EXHIBITION = "EXHIBITION",
  NETWORKING = "NETWORKING",
  OTHER = "OTHER",
}
```

### EventStatus

Event lifecycle states:

```typescript
enum EventStatus {
  DRAFT = "DRAFT", // Being created/edited
  PUBLISHED = "PUBLISHED", // Live and visible
  CANCELLED = "CANCELLED", // Cancelled by organizer
  COMPLETED = "COMPLETED", // Event has ended
}
```

### LocationVO

Location with optional geocoding:

```typescript
interface LocationProps {
  address?: string | null; // Street address
  city: string; // Required
  country: string; // Required
  latitude?: number; // Optional geocode
  longitude?: number; // Optional geocode
}
```

### Currency

Supported currency (Tunisia-focused):

```typescript
enum Currency {
  TND = "TND", // Tunisian Dinar (primary)
  EUR = "EUR", // Euro (international)
  USD = "USD", // US Dollar (international)
}
```

---

## Query Methods

| Method                    | Returns              | Description                         |
| ------------------------- | -------------------- | ----------------------------------- |
| `getTotalRevenue()`       | `TicketPriceVO`      | Sum of all ticket type revenue      |
| `getTotalRevenueAmount()` | `number`             | Raw revenue amount (allows zero)    |
| `getAvailableCapacity()`  | `number`             | totalCapacity - soldTickets         |
| `canBeCancelled()`        | `boolean`            | Check if event can be cancelled     |
| `canBeModified()`         | `boolean`            | Check if event is DRAFT             |
| `isPublished()`           | `boolean`            | Check if status is PUBLISHED        |
| `hasStarted()`            | `boolean`            | Check if event has started          |
| `hasEnded()`              | `boolean`            | Check if event has ended            |
| `getActiveTicketTypes()`  | `TicketTypeEntity[]` | Filter active & on-sale types       |
| `getSalesProgress()`      | `number`             | Percentage of capacity sold (0-100) |
| `isSoldOut()`             | `boolean`            | Check if all capacity sold          |
| `hasTicketTypes()`        | `boolean`            | Check if any ticket types exist     |
| `getTicketTypeCount()`    | `number`             | Count of ticket types               |
| `findTicketType(id)`      | `TicketTypeEntity?`  | Find ticket type by ID              |

---

## Test Coverage

| Component             | Statement | Branch | Functions |
| --------------------- | --------- | ------ | --------- |
| **Overall Domain**    | 93.59%    | 90.6%  | 92.35%    |
| event.entity.ts       | 91.31%    | 85.62% | 95%       |
| ticket-type.entity.ts | 95.9%     | 93.24% | 100%      |
| Value Objects (avg)   | 96.98%    | 94.25% | 97.31%    |
| Exceptions (avg)      | 95.32%    | 100%   | 93.5%     |

**Total Tests:** 1805+ passing (40 test files for events module)

---

## Redis Caching Strategy

The Events module uses Redis caching for improved performance:

| Cache Type     | TTL    | Key Pattern            | Description              |
| -------------- | ------ | ---------------------- | ------------------------ |
| Single Event   | 5 min  | `event:{id}`           | Individual event details |
| Event Lists    | 1 min  | `events:list:{hash}`   | Published/filtered lists |
| Search Results | 30 sec | `events:search:{hash}` | Search query results     |

**Cache Invalidation:**

- Event create/update/delete → Invalidates single event + all lists
- Publish/cancel → Invalidates single event + all lists
- Pattern-based bulk invalidation supported

---

## Implementation Status (All Sub-Issues Complete) ✅

- [x] Domain Layer (3.2.1-3.2.3) - ✅ Complete
- [x] Repository Interface (3.2.4) - ✅ Complete
- [x] Application Layer Commands (3.2.5) - ✅ Complete (9 handlers)
- [x] Application Layer Queries (3.2.6) - ✅ Complete (6 handlers)
- [x] Persistence Layer (3.2.7) - ✅ Complete (TypeORM entities, mappers, repositories)
- [x] AWS S3 Service for images (3.2.8) - ✅ Complete
- [x] Image Upload & Scheduler (3.2.9) - ✅ Complete
- [x] Controllers & Guards (3.2.10) - ✅ Complete
- [x] Module Integration (3.2.11) - ✅ Complete (with UserValidationServiceAdapter)
- [x] Testing & Documentation (3.2.12) - ✅ Complete
- [x] Redis Caching (URG) - ✅ Complete (EventCacheService)
