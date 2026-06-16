# Analytics Module — Implementation Plan

> **Parent Epic:** Analytics Module (Bounded Context #6)  
> **Sprint:** 7-8 | **Priority:** MEDIUM | **Estimated:** ~2-3 weeks  
> **Dependencies:** Users ✅, Events ✅, Tickets ✅, Payments ✅, Notifications ✅  
> **Architecture:** Hexagonal (Domain → Application → Infrastructure), CQRS, Result Pattern  
> **Schema:** `analytics` (PostgreSQL isolated schema)

---

## Sub-Issue Numbering Convention

| Prefix | Layer | Example |
|--------|-------|---------|
| `ANLYT-D-*` | Domain Layer | Entities, VOs, Events, Exceptions |
| `ANLYT-A-*` | Application Layer | Commands, Queries, Ports, DTOs, Mappers |
| `ANLYT-I-*` | Infrastructure Layer | Controllers, Repos, Services, Module wiring |
| `ANLYT-T-*` | Testing | Unit, Integration, E2E |
| `ANLYT-X-*` | Cross-cutting | Migrations, Config, Dependencies |

---

## Architecture Alignment Checklist

These rules come from `test/architecture/architecture.spec.ts` (34 fitness functions):

| Rule | Constraint | Enforcement |
|------|-----------|-------------|
| **Module Structure** | Must have `domain/`, `application/`, `infrastructure/` | §1 - Isolation des Modules |
| **Domain Purity** | No `@nestjs`, `typeorm`, `express`, `axios`, `ioredis`, `@aws-sdk` imports | §2 - Domain Layer |
| **Application Isolation** | No `typeorm`, `express`, `ioredis`, `@aws-sdk` imports | §3 - Application Layer |
| **Cross-Module** | No direct imports between modules (only via `infrastructure/adapters/` or `.module.ts`) | §1 - Cross-module rule |
| **Naming** | Entities: `*.entity.ts`, VOs: `*.vo.ts`, Events: `*.event.ts`, Ports: `*.port.ts`, Handlers: `*.handler.ts`, Controllers: `*.controller.ts`, Repos: `*.repository.ts`, Adapters: `*.adapter.ts` | §7 - Naming |
| **Schema Isolation** | ORM entities use `schema: 'analytics'` | §5 - DB Schema |
| **No Cross-Schema FK** | Use UUIDs only, no TypeORM relations to other modules | §5 - No FK |
| **Domain Events** | Must extend `DomainEvent` base class | §6 - Event-Driven |
| **Ports** | Must export `interface` or `abstract class`, file suffix `*.port.ts` | §3 - Ports |
| **Repositories** | Must `implements *Port`, in `infrastructure/repositories/` | §4 - Repos |
| **Controllers** | Must have `@Controller()` decorator, in `infrastructure/controllers/` | §4 - Controllers |
| **No console.log** | Use NestJS `Logger` only | §8 - Code Quality |
| **Exceptions** | In `domain/exceptions/`, extend `Error` or base exception | §8 - Exceptions |
| **DTOs** | Use `class-validator` decorators | §8 - DTOs |
| **Swagger** | Controllers must have `@ApiTags()` | §10 - Documentation |
| **Unit Tests** | Must exist at `test/unit/analytics/` | §9 - Test Structure |

---

## Target File Structure

```
src/modules/analytics/
├── domain/
│   ├── entities/
│   │   ├── metric.entity.ts              # Aggregate Root
│   │   ├── event-analytics.entity.ts     # Read Model (calculated)
│   │   └── platform-analytics.entity.ts  # Read Model (calculated)
│   ├── value-objects/
│   │   ├── metric-type.vo.ts             # REVENUE, TICKET_SOLD, CHECK_IN, etc.
│   │   ├── entity-type.vo.ts            # EVENT, USER, ORDER, PLATFORM
│   │   ├── time-range.vo.ts             # Start/end with validation
│   │   └── time-series-data.vo.ts       # Timestamp + value pairs
│   ├── events/
│   │   ├── metric-recorded.event.ts
│   │   ├── analytics-updated.event.ts
│   │   └── report-generated.event.ts
│   ├── exceptions/
│   │   ├── invalid-metric.exception.ts
│   │   ├── invalid-time-range.exception.ts
│   │   └── analytics-not-found.exception.ts
│   └── index.ts
│
├── application/
│   ├── commands/
│   │   ├── record-metric/
│   │   │   ├── record-metric.command.ts
│   │   │   └── record-metric.handler.ts
│   │   ├── refresh-analytics/
│   │   │   ├── refresh-analytics.command.ts
│   │   │   └── refresh-analytics.handler.ts
│   │   └── generate-report/
│   │       ├── generate-report.command.ts
│   │       └── generate-report.handler.ts
│   ├── queries/
│   │   ├── get-event-analytics/
│   │   │   ├── get-event-analytics.query.ts
│   │   │   └── get-event-analytics.handler.ts
│   │   ├── get-organizer-dashboard/
│   │   │   ├── get-organizer-dashboard.query.ts
│   │   │   └── get-organizer-dashboard.handler.ts
│   │   ├── get-platform-analytics/
│   │   │   ├── get-platform-analytics.query.ts
│   │   │   └── get-platform-analytics.handler.ts
│   │   ├── get-sales-time-series/
│   │   │   ├── get-sales-time-series.query.ts
│   │   │   └── get-sales-time-series.handler.ts
│   │   └── get-revenue-report/
│   │       ├── get-revenue-report.query.ts
│   │       └── get-revenue-report.handler.ts
│   ├── ports/
│   │   ├── metric.repository.port.ts
│   │   ├── event-analytics.repository.port.ts
│   │   ├── platform-analytics.repository.port.ts
│   │   ├── cache.port.ts
│   │   └── report-storage.port.ts
│   ├── dtos/
│   │   ├── event-analytics.dto.ts
│   │   ├── organizer-dashboard.dto.ts
│   │   ├── platform-analytics.dto.ts
│   │   ├── time-series.dto.ts
│   │   ├── revenue-report.dto.ts
│   │   └── metric.dto.ts
│   ├── mappers/
│   │   ├── event-analytics.mapper.ts
│   │   ├── platform-analytics.mapper.ts
│   │   └── metric.mapper.ts
│   └── event-handlers/
│       ├── order-paid.handler.ts         # Records REVENUE + TICKET_SOLD
│       ├── event-published.handler.ts    # Records EVENT_CREATED
│       └── user-registered.handler.ts    # Records USER_REGISTERED
│
├── infrastructure/
│   ├── controllers/
│   │   ├── analytics.controller.ts
│   │   └── request.dto.ts
│   ├── persistence/
│   │   ├── entities/
│   │   │   ├── metric.orm-entity.ts
│   │   │   ├── event-analytics.orm-entity.ts
│   │   │   └── platform-analytics.orm-entity.ts
│   │   └── mappers/
│   │       ├── metric.mapper.ts
│   │       ├── event-analytics.mapper.ts
│   │       └── platform-analytics.mapper.ts
│   ├── repositories/
│   │   ├── metric.repository.ts
│   │   ├── event-analytics.repository.ts
│   │   └── platform-analytics.repository.ts
│   ├── services/
│   │   ├── metric-aggregation.service.ts
│   │   ├── report-generator.service.ts
│   │   ├── analytics-refresh.service.ts  # @Cron every 15 min
│   │   └── redis-cache.service.ts
│   ├── adapters/
│   │   └── s3-report-storage.adapter.ts
│   ├── event-handlers/
│   │   └── cross-module-event.handler.ts # Listens to other module events
│   └── analytics.module.ts
│
test/unit/analytics/
├── domain/
│   ├── entities/
│   │   ├── metric.entity.spec.ts
│   │   ├── event-analytics.entity.spec.ts
│   │   └── platform-analytics.entity.spec.ts
│   ├── value-objects/
│   │   ├── metric-type.vo.spec.ts
│   │   ├── entity-type.vo.spec.ts
│   │   ├── time-range.vo.spec.ts
│   │   └── time-series-data.vo.spec.ts
│   └── exceptions/ (tested inline)
├── application/
│   ├── commands/
│   │   ├── record-metric.handler.spec.ts
│   │   ├── refresh-analytics.handler.spec.ts
│   │   └── generate-report.handler.spec.ts
│   ├── queries/
│   │   ├── get-event-analytics.handler.spec.ts
│   │   ├── get-organizer-dashboard.handler.spec.ts
│   │   ├── get-platform-analytics.handler.spec.ts
│   │   ├── get-sales-time-series.handler.spec.ts
│   │   └── get-revenue-report.handler.spec.ts
│   └── event-handlers/
│       └── analytics-event-handlers.spec.ts
├── infrastructure/
│   ├── controllers/
│   │   └── analytics.controller.spec.ts
│   ├── services/
│   │   ├── metric-aggregation.service.spec.ts
│   │   ├── report-generator.service.spec.ts
│   │   ├── analytics-refresh.service.spec.ts
│   │   └── redis-cache.service.spec.ts
│   └── persistence/
│       ├── metric.mapper.spec.ts
│       ├── event-analytics.mapper.spec.ts
│       └── platform-analytics.mapper.spec.ts

test/integration/analytics/
└── analytics.integration.spec.ts
```

---

## Progress Tracker

| Phase | Status | Completed Items |
|-------|--------|-----------------|
| Phase 1: Cross-Cutting (Foundation) | ✅ DONE | X-01, X-02, X-03 |
| Phase 2: Domain Layer | ✅ DONE | D-01, D-02, D-03, D-04, D-05, D-06, D-07 |
| Phase 3: Application Layer | ✅ DONE | A-01, A-02, A-03, A-04, A-05, A-06, A-07, A-08 |
| Phase 4: Infrastructure Layer | ✅ DONE | I-01, I-02, I-03, I-04, I-05, I-06, I-07, I-08, I-09, I-10 |
| Phase 5: Testing | ✅ DONE | T-01, T-02, T-03, T-05 |
| Phase 6: Cross-Cutting (Final) | 🔄 NEXT | — |

---

## Phase 1: Cross-Cutting (Foundation)

### ✅ ANLYT-X-01 — Install NPM Dependencies

**Type:** Task | **Priority:** Highest | **Points:** 1

**Description:**  
Install required packages for report generation and scheduling.

**Acceptance Criteria:**
- [ ] Install: `pdfkit`, `json2csv`
- [ ] `@nestjs/schedule` already installed (from Notifications)
- [ ] No version conflicts
- [ ] Update `package-lock.json`

---

### ✅ ANLYT-X-02 — Environment Configuration

**Type:** Task | **Priority:** Highest | **Points:** 2

**Description:**  
Add analytics-specific environment variables and configuration validation.

**Acceptance Criteria:**
- [ ] Add to `.env.example`: `ANALYTICS_CACHE_TTL_SECONDS`, `ANALYTICS_REFRESH_INTERVAL_MINUTES`, `ANALYTICS_EXPORT_MAX_ROWS`, `ANALYTICS_DATA_RETENTION_DAYS`
- [ ] Create `src/modules/analytics/infrastructure/config/analytics.config.ts`
- [ ] Validate config in module bootstrap
- [ ] Default values: cache 300s, refresh 15min, max export 10000, retention 730 days

---

### ✅ ANLYT-X-03 — Database Migration

**Type:** Task | **Priority:** Highest | **Points:** 3

**Description:**  
Create migration `006_create_analytics_tables.ts` in the analytics schema.

**Acceptance Criteria:**
- [ ] Create `analytics` schema
- [ ] `analytics.metrics` table with proper indexes
- [ ] `analytics.event_analytics` table (materialized view pattern)
- [ ] `analytics.platform_analytics` table with unique period constraint
- [ ] Indexes on `metric_type`, `entity_id + entity_type`, `timestamp`, composite
- [ ] `CHECK(value >= 0)` constraint on metrics
- [ ] Migration runs forward and reverts cleanly

---

## Phase 2: Domain Layer

### ✅ ANLYT-D-01 — Value Objects (4 VOs)

**Type:** Story | **Priority:** Highest | **Points:** 3

**Description:**  
Create all value objects for the analytics domain.

**Acceptance Criteria:**
- [ ] `MetricType` — Enum VO: `REVENUE`, `TICKET_SOLD`, `CHECK_IN`, `EVENT_CREATED`, `USER_REGISTERED`, `REFUND`
- [ ] `EntityType` — Enum VO: `EVENT`, `USER`, `ORDER`, `PLATFORM`
- [ ] `TimeRange` — Start/end date, validates start < end, max span 1 year
- [ ] `TimeSeriesData` — Immutable timestamp + value + optional label
- [ ] All pure TypeScript, no framework dependencies
- [ ] File naming: `*.vo.ts` in `domain/value-objects/`

---

### ✅ ANLYT-D-02 — Metric Entity (Aggregate Root)

**Type:** Story | **Priority:** Highest | **Points:** 5

**Description:**  
Create the Metric aggregate root — an immutable data point recorded from domain events.

**Acceptance Criteria:**
- [ ] Extends `BaseEntity`
- [ ] `static create(props): Result<MetricEntity>` — validates type, entity, value >= 0
- [ ] `static reconstitute(props): MetricEntity` — for persistence hydration
- [ ] Immutable after creation (no state mutations)
- [ ] Records `MetricRecorded` domain event on creation
- [ ] Properties: `id`, `metricType`, `entityId`, `entityType`, `value`, `unit`, `dimensions`, `timestamp`
- [ ] Validation: UUID for entityId, positive value, known metric type

---

### ✅ ANLYT-D-03 — EventAnalytics Entity (Read Model)

**Type:** Story | **Priority:** High | **Points:** 5

**Description:**  
Calculated read model that aggregates metrics for a single event.

**Acceptance Criteria:**
- [ ] `static calculate(eventId, metrics: MetricEntity[]): Result<EventAnalytics>`
- [ ] Properties: `eventId`, `totalRevenue` (Money), `totalTicketsSold`, `totalCapacity`, `checkInRate`, `conversionRate`, `averageTicketPrice`, `topSellingTicketType`, `salesByDay`, `checkInsByHour`, `lastUpdated`
- [ ] `getConversionRate(): number` — tickets sold / total capacity × 100
- [ ] `getCheckInRate(): number` — check-ins / tickets sold × 100
- [ ] `getRevenueGrowth(previous): number` — percentage growth
- [ ] `static reconstitute(props): EventAnalytics` — from persistence

---

### ✅ ANLYT-D-04 — PlatformAnalytics Entity (Read Model)

**Type:** Story | **Priority:** High | **Points:** 5

**Description:**  
Calculated read model for platform-wide metrics over a period.

**Acceptance Criteria:**
- [ ] `static calculate(period, metrics: MetricEntity[]): Result<PlatformAnalytics>`
- [ ] Properties: `periodStart`, `periodEnd`, `totalRevenue` (Money), `platformCommission` (Money), `totalEvents`, `totalTicketsSold`, `activeUsers`, `conversionRate`, `revenueByCategory`, `topEvents`, `lastUpdated`
- [ ] `getGrowthRate(previous): number` — period-over-period growth
- [ ] `getTopPerformers(limit): TopEvent[]` — sorted by revenue
- [ ] `static reconstitute(props): PlatformAnalytics`

---

### ✅ ANLYT-D-05 — Domain Events (3 Events)

**Type:** Task | **Priority:** High | **Points:** 2

**Description:**  
Create domain events emitted by analytics entities.

**Acceptance Criteria:**
- [ ] `MetricRecordedEvent` — extends `DomainEvent`, payload: `{ metricId, type, entityId, value }`
- [ ] `AnalyticsUpdatedEvent` — extends `DomainEvent`, payload: `{ entityType, entityId, updatedAt }`
- [ ] `ReportGeneratedEvent` — extends `DomainEvent`, payload: `{ reportId, reportType, format, url }`
- [ ] All in `domain/events/`, file suffix `*.event.ts`

---

### ✅ ANLYT-D-06 — Domain Exceptions

**Type:** Task | **Priority:** Medium | **Points:** 1

**Description:**  
Domain-specific exception classes.

**Acceptance Criteria:**
- [ ] `InvalidMetricException` — invalid metric data (negative value, unknown type)
- [ ] `InvalidTimeRangeException` — start >= end, span > 1 year
- [ ] `AnalyticsNotFoundException` — event/platform analytics not found
- [ ] All extend `Error` or shared `DomainException` base
- [ ] In `domain/exceptions/`, suffix `*.exception.ts`

---

### ✅ ANLYT-D-07 — Domain Barrel Exports

**Type:** Task | **Priority:** Medium | **Points:** 1

**Description:**  
Create `domain/index.ts` barrel file for clean imports.

**Acceptance Criteria:**
- [ ] Re-exports all entities, VOs, events, exceptions
- [ ] Clean public API for the domain layer

---

## Phase 3: Application Layer

### ✅ ANLYT-A-01 — Repository Port Interfaces

**Type:** Story | **Priority:** Highest | **Points:** 3

**Description:**  
Define port interfaces for all persistence needs.

**Acceptance Criteria:**
- [ ] `MetricRepositoryPort` — `save()`, `findByEntityId()`, `findByType()`, `aggregate()`
- [ ] `EventAnalyticsRepositoryPort` — `save()`, `findByEventId()`, `findByOrganizer()`
- [ ] `PlatformAnalyticsRepositoryPort` — `save()`, `findByPeriod()`, `findLatest()`
- [ ] `CachePort` — `get<T>()`, `set()`, `delete()`, `invalidatePattern()`
- [ ] `ReportStoragePort` — `upload()`, `getSignedUrl()`
- [ ] All export `interface`, file suffix `*.port.ts`
- [ ] Use injection token constants: `METRIC_REPOSITORY`, `EVENT_ANALYTICS_REPOSITORY`, etc.

---

### ✅ ANLYT-A-02 — RecordMetric Command + Handler

**Type:** Story | **Priority:** Highest | **Points:** 3

**Description:**  
Command handler for recording a new metric data point.

**Acceptance Criteria:**
- [ ] `RecordMetricCommand` — `{ type, entityId, entityType, value, unit, dimensions?, timestamp? }`
- [ ] `RecordMetricHandler` — validates, creates `MetricEntity`, persists, publishes event
- [ ] Returns `Result<{ metricId: string }>`
- [ ] Uses `@Injectable()` and `@Inject(METRIC_REPOSITORY)`
- [ ] Publishes `MetricRecordedEvent` via `DomainEventPublisher`

---

### ✅ ANLYT-A-03 — RefreshAnalytics Command + Handler

**Type:** Story | **Priority:** High | **Points:** 5

**Description:**  
Scheduled command that recalculates materialized analytics views.

**Acceptance Criteria:**
- [ ] `RefreshAnalyticsCommand` — `{ targetType?: 'event' | 'platform' }`
- [ ] `RefreshAnalyticsHandler`:
  - Fetches recent metrics since last refresh
  - Recalculates `EventAnalytics` for affected events
  - Recalculates `PlatformAnalytics` for current period
  - Saves updated views
  - Invalidates cache
- [ ] Returns `Result<{ refreshedEvents: number, platformUpdated: boolean }>`
- [ ] Publishes `AnalyticsUpdatedEvent`

---

### ✅ ANLYT-A-04 — GenerateReport Command + Handler

**Type:** Story | **Priority:** High | **Points:** 3

**Description:**  
Generate and store export reports (CSV/PDF).

**Acceptance Criteria:**
- [ ] `GenerateReportCommand` — `{ reportType, organizerId, filters, format: 'CSV' | 'PDF' }`
- [ ] `GenerateReportHandler`:
  - Validates filters (time range, max rows)
  - Queries metrics from repository
  - Delegates to report generator service port
  - Uploads to storage
  - Returns signed URL
- [ ] Returns `Result<{ reportId, url, format }>`
- [ ] Max 10,000 rows per export

---

### ✅ ANLYT-A-05 — Query Handlers (5 Queries)

**Type:** Story | **Priority:** High | **Points:** 5

**Description:**  
Read-side query handlers with caching.

**Acceptance Criteria:**
- [ ] `GetEventAnalyticsHandler` — cache 5min, returns `EventAnalyticsDto`
- [ ] `GetOrganizerDashboardHandler` — cache 5min, returns `OrganizerDashboardDto`
- [ ] `GetPlatformAnalyticsHandler` — cache 15min, returns `PlatformAnalyticsDto` (admin only)
- [ ] `GetSalesTimeSeriesHandler` — returns `TimeSeriesDto[]`, granularity: hour/day
- [ ] `GetRevenueReportHandler` — returns `RevenueReportDto` for date range
- [ ] All use `CachePort` for cache-aside pattern
- [ ] Each query + handler in its own subdirectory

---

### ✅ ANLYT-A-06 — DTOs (Request/Response)

**Type:** Task | **Priority:** High | **Points:** 2

**Description:**  
Data transfer objects for API responses.

**Acceptance Criteria:**
- [ ] `EventAnalyticsDto` — event-level analytics response
- [ ] `OrganizerDashboardDto` — multi-event summary + timeline
- [ ] `PlatformAnalyticsDto` — platform-wide metrics (admin)
- [ ] `TimeSeriesDto` — timestamp/value/label array items
- [ ] `RevenueReportDto` — report summary with download URL
- [ ] `MetricDto` — single metric data point
- [ ] All in `application/dtos/`

---

### ✅ ANLYT-A-07 — Application Event Handlers

**Type:** Story | **Priority:** High | **Points:** 3

**Description:**  
Handlers that react to domain events from other modules to record metrics.

**Acceptance Criteria:**
- [ ] `OnOrderPaid` → records `REVENUE` + `TICKET_SOLD` metrics
- [ ] `OnEventPublished` → records `EVENT_CREATED` metric
- [ ] `OnUserRegistered` → records `USER_REGISTERED` metric
- [ ] Each handler uses `RecordMetricCommand` internally (or direct repo access)
- [ ] Handlers in `application/event-handlers/`
- [ ] No direct imports from other modules' domain (uses event payload data only)

---

### ✅ ANLYT-A-08 — Mappers (Domain ↔ DTO)

**Type:** Task | **Priority:** Medium | **Points:** 2

**Description:**  
Application-layer mappers for converting between domain and DTO.

**Acceptance Criteria:**
- [ ] `EventAnalyticsMapper.toDto()` / `toDomain()`
- [ ] `PlatformAnalyticsMapper.toDto()` / `toDomain()`
- [ ] `MetricMapper.toDto()` / `toDomain()`
- [ ] In `application/mappers/`

---

## Phase 4: Infrastructure Layer

### ✅ ANLYT-I-01 — TypeORM ORM Entities & Persistence Mappers

**Type:** Story | **Priority:** Highest | **Points:** 5

**Description:**  
TypeORM entity classes and domain ↔ persistence mappers.

**Acceptance Criteria:**
- [ ] `MetricOrmEntity` — `@Entity({ name: 'metrics', schema: 'analytics' })`
- [ ] `EventAnalyticsOrmEntity` — `@Entity({ name: 'event_analytics', schema: 'analytics' })`
- [ ] `PlatformAnalyticsOrmEntity` — `@Entity({ name: 'platform_analytics', schema: 'analytics' })`
- [ ] Persistence mappers: `toDomain()` and `toPersistence()` for each
- [ ] JSONB columns for `dimensions`, `salesByDay`, `checkInsByHour`, `revenueByCategory`, `topEvents`
- [ ] No cross-module TypeORM relations

---

### ✅ ANLYT-I-02 — TypeORM Repository Implementations

**Type:** Story | **Priority:** Highest | **Points:** 5

**Description:**  
Concrete repository implementations with query builders.

**Acceptance Criteria:**
- [ ] `TypeOrmMetricRepository` implements `MetricRepositoryPort`
  - `aggregate()` uses raw SQL with GROUP BY for efficiency
- [ ] `TypeOrmEventAnalyticsRepository` implements `EventAnalyticsRepositoryPort`
- [ ] `TypeOrmPlatformAnalyticsRepository` implements `PlatformAnalyticsRepositoryPort`
- [ ] All in `infrastructure/repositories/`, suffix `*.repository.ts`
- [ ] All `implements *Port`

---

### ✅ ANLYT-I-03 — Redis Cache Service

**Type:** Story | **Priority:** High | **Points:** 3

**Description:**  
Redis-based cache adapter implementing `CachePort`.

**Acceptance Criteria:**
- [ ] Implements `CachePort` interface
- [ ] `get<T>(key)` — deserializes from Redis
- [ ] `set(key, value, ttlSeconds)` — serializes to Redis
- [ ] `delete(key)` — removes single key
- [ ] `invalidatePattern(pattern)` — uses SCAN + DEL for pattern matching
- [ ] Graceful degradation if Redis unavailable (log warning, skip cache)

---

### ✅ ANLYT-I-04 — Metric Aggregation Service

**Type:** Story | **Priority:** High | **Points:** 3

**Description:**  
Service for time-based metric aggregation and statistical calculations.

**Acceptance Criteria:**
- [ ] `aggregateByHour(metrics)` — groups and sums by hour
- [ ] `aggregateByDay(metrics)` — groups and sums by day
- [ ] `calculateMovingAverage(data, windowSize)` — moving average calculation
- [ ] `calculateGrowthRate(current, previous)` — percentage change
- [ ] Pure computation (no I/O), could live in domain services but uses Logger

---

### ✅ ANLYT-I-05 — Report Generator Service

**Type:** Story | **Priority:** High | **Points:** 3

**Description:**  
Generates PDF and CSV reports from analytics data.

**Acceptance Criteria:**
- [ ] `generateCSV(data, columns)` — uses `json2csv`
- [ ] `generatePDF(data, template)` — uses `pdfkit`
- [ ] Returns `Buffer` for upload to S3
- [ ] Max 10,000 rows enforced

---

### ✅ ANLYT-I-06 — S3 Report Storage Adapter

**Type:** Task | **Priority:** High | **Points:** 2

**Description:**  
S3 adapter for uploading and serving generated reports.

**Acceptance Criteria:**
- [ ] Implements `ReportStoragePort`
- [ ] `upload(buffer, key, contentType)` — uploads to S3 bucket
- [ ] `getSignedUrl(key, expiresIn)` — returns pre-signed download URL
- [ ] Uses existing `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`
- [ ] In `infrastructure/adapters/`, suffix `*.adapter.ts`

---

### ✅ ANLYT-I-07 — Analytics Refresh Service (Cron)

**Type:** Story | **Priority:** High | **Points:** 3

**Description:**  
Scheduled job that refreshes materialized analytics views.

**Acceptance Criteria:**
- [ ] Uses `@nestjs/schedule` `@Cron()` decorator
- [ ] Runs every 15 minutes (configurable via env)
- [ ] Invokes `RefreshAnalyticsHandler`
- [ ] Logs execution time and results
- [ ] Handles errors gracefully (does not crash app)

---

### ✅ ANLYT-I-08 — Analytics Controller

**Type:** Story | **Priority:** High | **Points:** 5

**Description:**  
REST controller exposing analytics endpoints.

**Acceptance Criteria:**
- [ ] `@Controller('analytics')` with `@ApiTags('Analytics')`
- [ ] `GET /analytics/events/:id` — event analytics (organizer owns event OR admin)
- [ ] `GET /analytics/dashboard` — organizer dashboard (`?timeRange=7d|30d|90d`)
- [ ] `GET /analytics/platform` — platform analytics (admin only)
- [ ] `GET /analytics/events/:id/sales-timeline` — time series data (`?granularity=hour|day`)
- [ ] `GET /analytics/revenue-report` — revenue report (`?startDate&endDate`)
- [ ] `POST /analytics/export` — generate export (CSV/PDF)
- [ ] Auth guards: `@UseGuards(JwtAuthGuard, RolesGuard)`
- [ ] Request DTOs with `class-validator` decorators
- [ ] Full Swagger documentation (`@ApiOperation`, `@ApiResponse`)

---

### ✅ ANLYT-I-09 — Cross-Module Event Handlers (Infrastructure)

**Type:** Story | **Priority:** Medium | **Points:** 3

**Description:**  
Infrastructure-level event listeners that bridge other module events into analytics.

**Acceptance Criteria:**
- [ ] Listens for `OrderPaidEvent` from Payments module → calls `RecordMetricHandler`
- [ ] Listens for `EventPublishedEvent` from Events module → calls `RecordMetricHandler`
- [ ] Listens for `UserCreatedEvent` from Users module → calls `RecordMetricHandler`
- [ ] Lives in `infrastructure/event-handlers/`
- [ ] Uses only event payload (no cross-module domain imports)

---

### ✅ ANLYT-I-10 — NestJS Module Wiring

**Type:** Task | **Priority:** Highest | **Points:** 3

**Description:**  
Wire all providers, imports, and exports in the analytics module.

**Acceptance Criteria:**
- [ ] `analytics.module.ts` with `@Module()` decorator
- [ ] Registers all providers with injection tokens
- [ ] Imports: `TypeOrmModule.forFeature([...])`, `ScheduleModule`, `ConfigModule`
- [ ] Provider bindings: `{ provide: METRIC_REPOSITORY, useClass: TypeOrmMetricRepository }`
- [ ] Register in `AppModule` imports
- [ ] Update data source entity list for migrations

---

## Phase 5: Testing

### ✅ ANLYT-T-01 — Domain Layer Unit Tests

**Type:** Story | **Priority:** High | **Points:** 5

**Description:**  
Pure unit tests for all domain entities, VOs, and events.

**Acceptance Criteria:**
- [ ] `metric.entity.spec.ts` — creation, validation, reconstitution
- [ ] `event-analytics.entity.spec.ts` — calculation, rates, growth
- [ ] `platform-analytics.entity.spec.ts` — calculation, top performers
- [ ] `metric-type.vo.spec.ts` — enum validation
- [ ] `entity-type.vo.spec.ts` — enum validation
- [ ] `time-range.vo.spec.ts` — validation (start < end, max 1 year)
- [ ] `time-series-data.vo.spec.ts` — immutability
- [ ] No mocks, no framework dependencies
- [ ] Coverage target: >90%

---

### ✅ ANLYT-T-02 — Application Layer Unit Tests

**Type:** Story | **Priority:** High | **Points:** 5

**Description:**  
Unit tests for all command/query handlers with mocked ports.

**Acceptance Criteria:**
- [ ] `record-metric.handler.spec.ts` — happy path + validation errors
- [ ] `refresh-analytics.handler.spec.ts` — recalculation logic
- [ ] `generate-report.handler.spec.ts` — format handling, max rows
- [ ] `get-event-analytics.handler.spec.ts` — cache hit/miss
- [ ] `get-organizer-dashboard.handler.spec.ts` — aggregation
- [ ] `get-platform-analytics.handler.spec.ts` — admin access
- [ ] `get-sales-time-series.handler.spec.ts` — granularity
- [ ] `get-revenue-report.handler.spec.ts` — date range
- [ ] `analytics-event-handlers.spec.ts` — event → metric recording
- [ ] All ports mocked with `jest.Mocked<*Port>`
- [ ] Coverage target: >85%

---

### ✅ ANLYT-T-03 — Infrastructure Services Unit Tests

**Type:** Story | **Priority:** High | **Points:** 3

**Description:**  
Unit tests for infrastructure services.

**Acceptance Criteria:**
- [ ] `metric-aggregation.service.spec.ts` — hourly/daily aggregation, moving average
- [ ] `report-generator.service.spec.ts` — CSV/PDF generation
- [ ] `analytics-refresh.service.spec.ts` — cron scheduling
- [ ] `redis-cache.service.spec.ts` — get/set/delete/invalidate
- [ ] `analytics.controller.spec.ts` — route handling, guards
- [ ] Persistence mapper specs (3 files)
- [ ] Coverage target: >80%

---

### ANLYT-T-04 — Integration Tests

**Type:** Story | **Priority:** Medium | **Points:** 5

**Description:**  
End-to-end flows with real/in-memory database.

**Acceptance Criteria:**
- [ ] Record metric → query analytics → verify aggregation
- [ ] Refresh job → materialized view update
- [ ] Cache behavior (hit/miss/invalidation)
- [ ] Report generation → S3 upload (mocked)
- [ ] Located at `test/integration/analytics/`

---

### ✅ ANLYT-T-05 — Architecture Test Verification

**Type:** Task | **Priority:** High | **Points:** 1

**Description:**  
Verify all 34 architecture fitness functions pass with the analytics module.

**Acceptance Criteria:**
- [ ] `npm run test:arch` passes (0 failures)
- [ ] Domain layer has no forbidden imports
- [ ] Application layer has no forbidden imports
- [ ] No cross-module direct imports
- [ ] Naming conventions all pass
- [ ] Schema isolation verified

---

## Phase 6: Cross-Cutting (Finalization)

### ANLYT-X-04 — API Documentation (Swagger)

**Type:** Task | **Priority:** Medium | **Points:** 1

**Description:**  
Complete Swagger documentation for all endpoints.

**Acceptance Criteria:**
- [ ] `@ApiTags('Analytics')` on controller
- [ ] `@ApiOperation()` on all endpoints
- [ ] `@ApiResponse()` for 200, 400, 401, 403, 404
- [ ] Request DTOs have `@ApiProperty()` with descriptions and examples
- [ ] Swagger UI shows correct schemas

---

### ANLYT-X-05 — Architecture Documentation

**Type:** Task | **Priority:** Medium | **Points:** 2

**Description:**  
Create architecture documentation for the analytics module.

**Acceptance Criteria:**
- [ ] Create `docs/03-architecture/17-analytics-module-architecture.md`
- [ ] Document domain model, caching strategy, refresh mechanism
- [ ] Update `docs/PROJECT_STATUS.md` with module completion
- [ ] Update `AGENTS.md` current state

---

## Summary Table

| Sub-Issue | Title | Points | Priority | Phase |
|-----------|-------|--------|----------|-------|
| ANLYT-X-01 | Install NPM Dependencies | 1 | Highest | Cross-cut |
| ANLYT-X-02 | Environment Configuration | 2 | Highest | Cross-cut |
| ANLYT-X-03 | Database Migration | 3 | Highest | Cross-cut |
| ANLYT-D-01 | Value Objects (4 VOs) | 3 | Highest | Domain |
| ANLYT-D-02 | Metric Entity (Aggregate Root) | 5 | Highest | Domain |
| ANLYT-D-03 | EventAnalytics Entity | 5 | High | Domain |
| ANLYT-D-04 | PlatformAnalytics Entity | 5 | High | Domain |
| ANLYT-D-05 | Domain Events (3) | 2 | High | Domain |
| ANLYT-D-06 | Domain Exceptions | 1 | Medium | Domain |
| ANLYT-D-07 | Domain Barrel Exports | 1 | Medium | Domain |
| ANLYT-A-01 | Repository Port Interfaces | 3 | Highest | Application |
| ANLYT-A-02 | RecordMetric Command + Handler | 3 | Highest | Application |
| ANLYT-A-03 | RefreshAnalytics Command + Handler | 5 | High | Application |
| ANLYT-A-04 | GenerateReport Command + Handler | 3 | High | Application |
| ANLYT-A-05 | Query Handlers (5 queries) | 5 | High | Application |
| ANLYT-A-06 | DTOs (Request/Response) | 2 | High | Application |
| ANLYT-A-07 | Application Event Handlers | 3 | High | Application |
| ANLYT-A-08 | Mappers (Domain ↔ DTO) | 2 | Medium | Application |
| ANLYT-I-01 | TypeORM ORM Entities & Mappers | 5 | Highest | Infra |
| ANLYT-I-02 | TypeORM Repository Implementations | 5 | Highest | Infra |
| ANLYT-I-03 | Redis Cache Service | 3 | High | Infra |
| ANLYT-I-04 | Metric Aggregation Service | 3 | High | Infra |
| ANLYT-I-05 | Report Generator Service | 3 | High | Infra |
| ANLYT-I-06 | S3 Report Storage Adapter | 2 | High | Infra |
| ANLYT-I-07 | Analytics Refresh Service (Cron) | 3 | High | Infra |
| ANLYT-I-08 | Analytics Controller | 5 | High | Infra |
| ANLYT-I-09 | Cross-Module Event Handlers | 3 | Medium | Infra |
| ANLYT-I-10 | NestJS Module Wiring | 3 | Highest | Infra |
| ANLYT-T-01 | Domain Layer Unit Tests | 5 | High | Testing |
| ANLYT-T-02 | Application Layer Unit Tests | 5 | High | Testing |
| ANLYT-T-03 | Infrastructure Services Unit Tests | 3 | High | Testing |
| ANLYT-T-04 | Integration Tests | 5 | Medium | Testing |
| ANLYT-T-05 | Architecture Test Verification | 1 | High | Testing |
| ANLYT-X-04 | API Documentation (Swagger) | 1 | Medium | Cross-cut |
| ANLYT-X-05 | Architecture Documentation | 2 | Medium | Cross-cut |

**Total Story Points: ~111**

---

## Recommended Implementation Order

```
Sprint 7 (Week 1-2): Foundation + Domain + Application
─────────────────────────────────────────────────────────
 1. ANLYT-X-01  Install NPM Dependencies
 2. ANLYT-X-02  Environment Configuration
 3. ANLYT-X-03  Database Migration
 4. ANLYT-D-01  Value Objects (4 VOs)
 5. ANLYT-D-05  Domain Events
 6. ANLYT-D-06  Domain Exceptions
 7. ANLYT-D-02  Metric Entity (Aggregate Root)
 8. ANLYT-D-03  EventAnalytics Entity
 9. ANLYT-D-04  PlatformAnalytics Entity
10. ANLYT-D-07  Domain Barrel Exports
11. ANLYT-A-01  Repository Port Interfaces
12. ANLYT-A-02  RecordMetric Command + Handler
13. ANLYT-T-01  Domain Layer Unit Tests (parallel)

Sprint 8 (Week 3): Application + Infrastructure + Tests
─────────────────────────────────────────────────────────
14. ANLYT-A-03  RefreshAnalytics Command + Handler
15. ANLYT-A-04  GenerateReport Command + Handler
16. ANLYT-A-05  Query Handlers (5 queries)
17. ANLYT-A-06  DTOs
18. ANLYT-A-07  Application Event Handlers
19. ANLYT-A-08  Mappers
20. ANLYT-I-01  TypeORM ORM Entities & Mappers
21. ANLYT-I-02  TypeORM Repository Implementations
22. ANLYT-I-03  Redis Cache Service
23. ANLYT-I-04  Metric Aggregation Service
24. ANLYT-I-05  Report Generator Service
25. ANLYT-I-06  S3 Report Storage Adapter
26. ANLYT-I-07  Analytics Refresh Service (Cron)
27. ANLYT-I-08  Analytics Controller
28. ANLYT-I-09  Cross-Module Event Handlers
29. ANLYT-I-10  NestJS Module Wiring
30. ANLYT-T-02  Application Layer Unit Tests
31. ANLYT-T-03  Infrastructure Services Unit Tests
32. ANLYT-T-04  Integration Tests
33. ANLYT-T-05  Architecture Test Verification
34. ANLYT-X-04  API Documentation (Swagger)
35. ANLYT-X-05  Architecture Documentation
```

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Immutable Metrics** | Once recorded, metrics never change — append-only for audit trail |
| **Materialized Views (not actual PG views)** | TypeORM ORM entities with periodic refresh — simpler to manage, cache-friendly |
| **Cache-Aside Pattern** | Query handler checks cache → DB fallback → populate cache |
| **No cross-module TypeORM relations** | Analytics references entities by UUID only, never imports domain models |
| **Event-driven metric recording** | Metrics created by reacting to domain events, not direct coupling |
| **Separate read models** | EventAnalytics/PlatformAnalytics are calculated snapshots, not live queries |
| **S3 for reports** | Large files (PDF/CSV) stored in S3 with pre-signed URLs, not served from API |
| **15-minute refresh** | Balance between freshness and compute cost; real-time via cache for recent data |

---

## Privacy & Security

- Organizers can only see analytics for their own events
- Admins see all platform-level data
- **No PII** stored in analytics tables (only UUIDs, amounts, counts)
- Data retention: 2 years (configurable via `ANALYTICS_DATA_RETENTION_DAYS`)
- Export limited to 10,000 rows to prevent abuse
- All endpoints require JWT authentication

---

## Performance Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| Dashboard query | <500ms | Redis cache (5min TTL) + pre-aggregated views |
| Analytics refresh | <2min | Batch processing, incremental updates |
| Report generation | <10s | Streaming PDF/CSV, S3 upload |
| Cache hit rate | >80% | 5-15min TTL, invalidation on refresh |
| Data accuracy | 100% | Immutable metrics, calculated views |
