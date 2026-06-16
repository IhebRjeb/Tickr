# Analytics Module Architecture

## Overview

The Analytics module follows **Hexagonal Architecture** (Ports and Adapters) principles, providing real-time metric recording, materialized analytics views, time-series aggregations, and export report generation (CSV/PDF). It operates as a read-model consumer of domain events from other bounded contexts.

**Status:** ✅ **100% COMPLETE** (as of June 16, 2026)

## Module Structure

```
src/modules/analytics/
├── domain/                              # Domain Layer (Core Business Logic) ✅
│   ├── entities/                       # Aggregate Root & Read Models
│   │   ├── metric.entity.ts             # Metric Aggregate Root (immutable data point)
│   │   ├── event-analytics.entity.ts    # Read Model: per-event analytics
│   │   └── platform-analytics.entity.ts # Read Model: platform-wide metrics
│   ├── events/                         # Domain Events (3 events)
│   │   ├── metric-recorded.event.ts
│   │   ├── analytics-updated.event.ts
│   │   └── report-generated.event.ts
│   ├── exceptions/                     # Domain Exceptions (3 exceptions)
│   │   ├── invalid-metric.exception.ts
│   │   ├── invalid-time-range.exception.ts
│   │   └── analytics-not-found.exception.ts
│   ├── value-objects/                  # Value Objects (4 VOs)
│   │   ├── metric-type.vo.ts            # REVENUE, TICKET_SOLD, CHECK_IN, etc.
│   │   ├── entity-type.vo.ts           # EVENT, USER, ORDER, PLATFORM
│   │   ├── time-range.vo.ts            # Start/end validation, max 1 year span
│   │   └── time-series-data.vo.ts      # Immutable timestamp + value + label
│   └── index.ts                        # Barrel exports
├── application/                         # Application Layer (Use Cases) ✅
│   ├── commands/                       # 3 Command Handlers
│   │   ├── record-metric/              # Record a new metric data point
│   │   ├── refresh-analytics/          # Recalculate materialized views
│   │   └── generate-report/            # Generate CSV/PDF export
│   ├── queries/                        # 5 Query Handlers
│   │   ├── get-event-analytics/        # Per-event analytics (organizer/admin)
│   │   ├── get-organizer-dashboard/    # Multi-event summary dashboard
│   │   ├── get-platform-analytics/     # Platform-wide metrics (admin only)
│   │   ├── get-sales-time-series/      # Time series with granularity
│   │   └── get-revenue-report/         # Revenue report for date range
│   ├── dtos/                           # Response DTOs
│   │   └── analytics.dtos.ts
│   ├── event-handlers/                 # Application Event Listeners
│   │   └── analytics-event.listener.ts # OrderPaid, EventPublished, UserCreated
│   ├── mappers/                        # Domain ↔ DTO mappers
│   │   └── analytics.mapper.ts
│   ├── ports/                          # Port Interfaces (5 ports)
│   │   ├── metric.repository.port.ts
│   │   ├── event-analytics.repository.port.ts
│   │   ├── platform-analytics.repository.port.ts
│   │   ├── cache.port.ts
│   │   └── report-storage.port.ts
│   └── types/                          # Shared type definitions
│       └── metric-aggregation.types.ts
├── infrastructure/                      # Infrastructure Layer (Adapters) ✅
│   ├── adapters/                       # External Service Adapters
│   │   └── s3-report-storage.adapter.ts # S3 upload + pre-signed URLs
│   ├── controllers/                    # REST Controllers
│   │   ├── analytics.controller.ts      # 6 endpoints with Swagger docs
│   │   └── dtos/
│   │       └── request.dto.ts           # Request DTOs with class-validator
│   ├── event-handlers/                 # Infrastructure Event Listeners
│   │   └── cross-module-event.listener.ts # TicketCheckedIn, OrderRefunded
│   ├── persistence/                    # TypeORM Entities & Mappers
│   │   ├── entities/
│   │   │   ├── metric.orm-entity.ts
│   │   │   ├── event-analytics.orm-entity.ts
│   │   │   └── platform-analytics.orm-entity.ts
│   │   └── mappers/
│   │       ├── metric-persistence.mapper.ts
│   │       ├── event-analytics-persistence.mapper.ts
│   │       └── platform-analytics-persistence.mapper.ts
│   ├── repositories/                   # TypeORM Repository Implementations
│   │   ├── metric.repository.ts
│   │   ├── event-analytics.repository.ts
│   │   └── platform-analytics.repository.ts
│   ├── services/                       # Infrastructure Services
│   │   ├── redis-cache.service.ts       # CachePort implementation (Redis)
│   │   ├── metric-aggregation.service.ts # Time-based aggregation utilities
│   │   ├── report-generator.service.ts  # CSV/PDF generation
│   │   └── analytics-refresh.service.ts # @Cron every 10 minutes
│   └── analytics.module.ts             # NestJS module wiring
```

## Architecture Decisions

### 1. Event-Driven Data Collection

The analytics module **never directly queries other modules**. Instead, it listens for domain events:

| Event Source | Event | Metric Recorded |
|---|---|---|
| Payments | `OrderPaidEvent` | REVENUE + TICKET_SOLD |
| Events | `EventPublishedEvent` | EVENT_CREATED |
| Users | `UserCreatedEvent` | USER_REGISTERED |
| Tickets | `TicketCheckedInEvent` | CHECK_IN |
| Payments | `OrderRefundedEvent` | REFUND |

This ensures **zero coupling** between analytics and other bounded contexts.

### 2. Materialized View Pattern

Rather than computing analytics on every read:
- **Metrics** are recorded as immutable data points (write-optimized)
- **EventAnalytics** and **PlatformAnalytics** are pre-calculated read models
- A **cron job** (every 10 minutes) refreshes materialized views
- Results are **cached in Redis** (5–15 min TTL)

### 3. Cache-Aside Pattern

All query handlers follow the cache-aside strategy:
1. Check Redis cache → return if hit
2. Query repository → compute result
3. Store in Redis with TTL → return

Cache invalidation happens on:
- Scheduled analytics refresh
- Manual cache clear via admin endpoint

### 4. Schema Isolation

All ORM entities use `schema: 'analytics'`:
- `analytics.metrics` — raw metric data points
- `analytics.event_analytics` — per-event aggregations
- `analytics.platform_analytics` — platform-wide summaries

No TypeORM relations to other module entities (UUID references only).

### 5. Report Generation

Export reports are generated as:
- **CSV**: Proper escaping, column headers, max 10,000 rows
- **PDF**: Simplified table layout

Reports are uploaded to S3 and accessed via pre-signed URLs (1-hour expiry).

## Data Flow

```
┌─────────────────┐     Domain Events      ┌──────────────────────┐
│  Other Modules  │ ──────────────────────► │  Event Listeners     │
│  (Payments,     │                         │  (Application +      │
│   Events, etc.) │                         │   Infrastructure)    │
└─────────────────┘                         └──────────┬───────────┘
                                                       │
                                                       ▼
                                            ┌──────────────────────┐
                                            │  RecordMetricHandler  │
                                            │  (creates MetricEntity)│
                                            └──────────┬───────────┘
                                                       │
                                                       ▼
┌──────────────────┐                        ┌──────────────────────┐
│  Redis Cache     │◄───── Cache-aside ────►│  Query Handlers      │
└──────────────────┘                        └──────────┬───────────┘
                                                       │
                                                       ▼
┌──────────────────┐    Cron (10 min)       ┌──────────────────────┐
│  analytics.*     │◄──────────────────────►│  RefreshAnalytics    │
│  (PostgreSQL)    │                        │  Handler             │
└──────────────────┘                        └──────────────────────┘
```

## API Endpoints

| Method | Path | Description | Access |
|--------|------|-------------|--------|
| GET | `/analytics/events/:id` | Event analytics | Organizer (own event) / Admin |
| GET | `/analytics/dashboard` | Organizer dashboard | Authenticated organizer |
| GET | `/analytics/platform` | Platform analytics | Admin only |
| GET | `/analytics/events/:id/sales-timeline` | Sales time series | Organizer / Admin |
| GET | `/analytics/revenue-report` | Revenue report | Authenticated |
| POST | `/analytics/export` | Generate CSV/PDF export | Authenticated |

## Testing Strategy

- **Domain tests** (7 suites): Pure unit tests, no mocks, no framework
- **Application tests** (4 suites): Mocked ports, Result pattern validation
- **Infrastructure tests** (2 suites): Service logic, persistence mappers
- **Architecture tests**: All 34 fitness functions pass

Total: **13 test suites, 90 tests, 100% passing**
