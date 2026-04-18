# Notifications Module — Jira Sub-Issues Breakdown

> **Parent Epic:** Notifications Module (Bounded Context #5)
> **Sprint:** 5-6 | **Priority:** MEDIUM | **Estimated:** ~2-3 weeks
> **Dependencies:** Users Module ✅, Events Module ✅, Tickets Module ✅
> **Architecture:** Hexagonal (Domain → Application → Infrastructure), CQRS, Result Pattern

---

## Sub-Issue Numbering Convention

| Prefix | Layer | Example |
|--------|-------|---------|
| `NOTIF-D-*` | Domain Layer | Entities, VOs, Events, Exceptions |
| `NOTIF-A-*` | Application Layer | Commands, Queries, Ports, DTOs, Mappers |
| `NOTIF-I-*` | Infrastructure Layer | Controllers, Repos, Services, Module wiring |
| `NOTIF-T-*` | Testing | Unit, Integration, E2E |
| `NOTIF-X-*` | Cross-cutting | Migrations, Config, AWS setup |

---

## Phase 5: Cross-Cutting

### NOTIF-X-01 — AWS Configuration & Environment Setup ✅

**Type:** Task | **Priority:** Highest | **Points:** 2 | **Status: DONE**

**Description:**
Configure AWS SES and SNS credentials, update `.env.example`, and set up LocalStack for local development.

**Acceptance Criteria:**
- [x] Add to `.env.example`: SES, SNS, and notification rate limit env vars
- [x] LocalStack SES/SNS configuration in `docker-compose.dev.yml`
- [x] Update `scripts/localstack-init.sh` with SES/SNS setup
- [x] Configuration module validation — `notification.config.ts` created

---

### NOTIF-X-02 — Install NPM Dependencies ✅

**Type:** Task | **Priority:** Highest | **Points:** 1 | **Status: DONE**

**Description:**
Install required npm packages for the Notifications module.

**Acceptance Criteria:**
- [x] Install: `@aws-sdk/client-sesv2`, `@aws-sdk/client-sns`, `handlebars`, `juice`
- [x] Install: `@nestjs/schedule` (if not already present) — was already installed
- [x] Verify no version conflicts
- [x] Update `package-lock.json`

---

### NOTIF-X-03 — Architecture Tests Update

**Type:** Task | **Priority:** Medium | **Points:** 2

**Description:**
Add the Notifications module to the existing architecture fitness function tests.

**Acceptance Criteria:**
- [ ] Add notifications module to `test/architecture/` boundary checks
- [ ] Verify domain layer has no infrastructure imports
- [ ] Verify application layer has no infrastructure imports
- [ ] Verify cross-module boundaries (no direct imports from Users/Events/Tickets domain)
- [ ] All existing architecture tests still pass

---

### NOTIF-X-04 — API Documentation (Swagger)

**Type:** Task | **Priority:** Medium | **Points:** 1

**Description:**
Verify all controller endpoints have complete Swagger documentation.

**Acceptance Criteria:**
- [ ] All endpoints have `@ApiOperation`, `@ApiResponse`
- [ ] All DTOs have `@ApiProperty` with descriptions and examples
- [ ] Swagger UI shows correct request/response schemas
- [ ] Error responses documented (400, 401, 403, 404, 429)

---

## Summary Table

| Sub-Issue | Title | Points | Priority | Phase | Status |
|-----------|-------|--------|----------|-------|--------|
| NOTIF-D-01 | Notification Aggregate Root Entity | 5 | Highest | Domain | ✅ |
| NOTIF-D-02 | NotificationPreference Entity | 3 | High | Domain | ✅ |
| NOTIF-D-03 | NotificationTemplate Entity | 3 | High | Domain | ✅ |
| NOTIF-D-04 | Value Objects (6 VOs) | 3 | High | Domain | ✅ |
| NOTIF-D-05 | Domain Events (7 events) | 2 | High | Domain | ✅ |
| NOTIF-D-06 | Domain Exceptions (11 exceptions) | 2 | Medium | Domain | ✅ |
| NOTIF-D-07 | Domain Barrel Exports | 1 | Medium | Domain | ✅ |
| NOTIF-A-01 | Repository Port Interfaces | 3 | Highest | Application | ✅ |
| NOTIF-A-02 | Provider Port Interfaces (Email & SMS) | 2 | Highest | Application | ✅ |
| NOTIF-A-03 | SendNotification Command + Handler | 5 | Highest | Application | ✅ |
| NOTIF-A-04 | SendBulkNotifications Command + Handler | 3 | High | Application | |
| NOTIF-A-05 | UpdatePreferences Command + Handler | 2 | High | Application | |
| NOTIF-A-06 | Unsubscribe Command + Handler | 2 | High | Application | |
| NOTIF-A-07 | RetryFailedNotification Command + Handler | 2 | Medium | Application | |
| NOTIF-A-08 | ProcessScheduledNotifications (Cron) | 5 | High | Application | |
| NOTIF-A-09 | Query Handlers (4 queries) | 3 | High | Application | |
| NOTIF-A-10 | DTOs (Request/Response) | 3 | High | Application | |
| NOTIF-A-11 | Application Event Handlers | 3 | Medium | Application | |
| NOTIF-A-12 | Mappers (Domain ↔ DTO) | 2 | Medium | Application | |
| NOTIF-I-01 | TypeORM ORM Entities & Persistence Mappers | 5 | Highest | Infra | |
| NOTIF-I-02 | TypeORM Repository Implementations | 5 | Highest | Infra | |
| NOTIF-I-03 | Database Migration | 3 | Highest | Infra | |
| NOTIF-I-04 | AWS SES Email Provider Adapter | 5 | Highest | Infra | |
| NOTIF-I-05 | AWS SNS SMS Provider Adapter | 3 | High | Infra | |
| NOTIF-I-06 | Template Renderer Service | 3 | High | Infra | |
| NOTIF-I-07 | Notification Scheduler (Cron) | 3 | High | Infra | |
| NOTIF-I-08 | Rate Limiter Service | 3 | High | Infra | |
| NOTIF-I-09 | Notifications Controller | 5 | High | Infra | |
| NOTIF-I-10 | Cross-Module Event Handlers | 5 | Medium | Infra | |
| NOTIF-I-11 | Email Templates (Handlebars) | 3 | Medium | Infra | |
| NOTIF-I-12 | NestJS Module Wiring | 3 | High | Infra | |
| NOTIF-T-01 | Domain Layer Unit Tests | 5 | High | Testing | |
| NOTIF-T-02 | Application Layer Unit Tests | 5 | High | Testing | |
| NOTIF-T-03 | Infrastructure Services Unit Tests | 3 | High | Testing | |
| NOTIF-T-04 | Integration Tests | 5 | Medium | Testing | |
| NOTIF-T-05 | E2E Tests | 3 | Medium | Testing | |
| NOTIF-X-01 | AWS Configuration & Environment Setup | 2 | Highest | Cross-cut | ✅ |
| NOTIF-X-02 | Install NPM Dependencies | 1 | Highest | Cross-cut | ✅ |
| NOTIF-X-03 | Architecture Tests Update | 2 | Medium | Cross-cut | |
| NOTIF-X-04 | API Documentation (Swagger) | 1 | Medium | Cross-cut | |

**Total Story Points: ~124**

---

## Recommended Implementation Order

```
Sprint 5 (Week 1-2): Foundation + Core
─────────────────────────────────────────
1. NOTIF-X-02  Install NPM Dependencies
2. NOTIF-X-01  AWS Configuration & Environment Setup
3. NOTIF-D-04  Value Objects
4. NOTIF-D-05  Domain Events
5. NOTIF-D-06  Domain Exceptions
6. NOTIF-D-01  Notification Aggregate Root Entity
7. NOTIF-D-02  NotificationPreference Entity
8. NOTIF-D-03  NotificationTemplate Entity
9. NOTIF-D-07  Domain Barrel Exports
10. NOTIF-A-01  Repository Port Interfaces
11. NOTIF-A-02  Provider Port Interfaces
12. NOTIF-T-01  Domain Layer Unit Tests (parallel with domain work)

Sprint 6 (Week 3): Application + Infrastructure
──────────────────────────────────────────────────
13. NOTIF-A-03  SendNotification Command + Handler
14. NOTIF-A-05  UpdatePreferences Command + Handler
15. NOTIF-A-06  Unsubscribe Command + Handler
16. NOTIF-A-07  RetryFailedNotification Command + Handler
17. NOTIF-A-08  ProcessScheduledNotifications (Cron)
18. NOTIF-A-04  SendBulkNotifications Command + Handler
19. NOTIF-A-09  Query Handlers
20. NOTIF-A-10  DTOs
21. NOTIF-A-11  Application Event Handlers
22. NOTIF-A-12  Mappers
23. NOTIF-I-01  TypeORM ORM Entities & Persistence Mappers
24. NOTIF-I-02  TypeORM Repository Implementations
25. NOTIF-I-03  Database Migration
26. NOTIF-I-04  AWS SES Email Provider Adapter
27. NOTIF-I-05  AWS SNS SMS Provider Adapter
28. NOTIF-I-06  Template Renderer Service
29. NOTIF-I-07  Notification Scheduler (Cron)
30. NOTIF-I-08  Rate Limiter Service
31. NOTIF-I-09  Notifications Controller
32. NOTIF-I-11  Email Templates (Handlebars)
33. NOTIF-I-10  Cross-Module Event Handlers
34. NOTIF-I-12  NestJS Module Wiring
35. NOTIF-T-02  Application Layer Unit Tests (parallel)
36. NOTIF-T-03  Infrastructure Services Unit Tests (parallel)
37. NOTIF-T-04  Integration Tests
38. NOTIF-T-05  E2E Tests
39. NOTIF-X-03  Architecture Tests Update
40. NOTIF-X-04  API Documentation (Swagger)
```

---

## Dependencies Between Sub-Issues

```
NOTIF-X-02 ─┐
NOTIF-X-01 ─┤
             ├─→ NOTIF-D-04 (VOs) ──┐
             │   NOTIF-D-05 (Events) ├─→ NOTIF-D-01 (Notification Entity) ──┐
             │   NOTIF-D-06 (Exceptions)┘  NOTIF-D-02 (Preference Entity) ──┤
             │                             NOTIF-D-03 (Template Entity) ─────┤
             │                                                               │
             │   NOTIF-D-07 (Barrel) ←───────────────────────────────────────┘
             │        │
             ├────────┤
             │        ▼
             │   NOTIF-A-01 (Repo Ports) ─────┐
             │   NOTIF-A-02 (Provider Ports) ──┤
             │                                 │
             │   ┌─────────────────────────────┘
             │   │
             │   ├─→ NOTIF-A-03 (Send Command) ──────┐
             │   ├─→ NOTIF-A-05 (Update Prefs) ──────┤
             │   ├─→ NOTIF-A-06 (Unsubscribe) ───────┤
             │   ├─→ NOTIF-A-07 (Retry) ─────────────┤
             │   ├─→ NOTIF-A-08 (Process Scheduled) ──┤
             │   ├─→ NOTIF-A-04 (Bulk Send) ──────────┤
             │   ├─→ NOTIF-A-09 (Queries) ────────────┤
             │   ├─→ NOTIF-A-10 (DTOs) ───────────────┤
             │   ├─→ NOTIF-A-11 (App Event Handlers) ─┤
             │   └─→ NOTIF-A-12 (Mappers) ────────────┤
             │                                         │
             │   ┌─────────────────────────────────────┘
             │   │
             │   ├─→ NOTIF-I-01 (ORM Entities) ──┐
             │   │   NOTIF-I-03 (Migration) ──────┤
             │   │                                │
             │   ├─→ NOTIF-I-02 (Repos) ←────────┘
             │   ├─→ NOTIF-I-04 (SES Provider)
             │   ├─→ NOTIF-I-05 (SNS Provider)
             │   ├─→ NOTIF-I-06 (Template Renderer)
             │   ├─→ NOTIF-I-08 (Rate Limiter)
             │   │         │
             │   ├─→ NOTIF-I-07 (Scheduler) ←─── NOTIF-A-08
             │   ├─→ NOTIF-I-09 (Controller)
             │   ├─→ NOTIF-I-10 (Cross-Module Handlers)
             │   ├─→ NOTIF-I-11 (Email Templates)
             │   │
             │   └─→ NOTIF-I-12 (Module Wiring) ←── ALL infra components
             │
             └─→ NOTIF-T-* (Testing: parallel with each phase)
                 NOTIF-X-03 (Arch Tests) ←── NOTIF-I-12
                 NOTIF-X-04 (API Docs) ←── NOTIF-I-09
```
