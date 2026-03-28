# Architecture Rules Reference

Complete rule set derived from `backend/test/architecture/architecture.spec.ts` and `backend/eslint.config.mjs`.

## Hexagonal Layers

```
┌─────────────────────────────────────┐
│         Infrastructure              │  ← Controllers, Repositories (TypeORM),
│  ┌───────────────────────────────┐  │     external adapters, NestJS modules
│  │        Application            │  │  ← Commands, Queries, Handlers, Ports,
│  │  ┌─────────────────────────┐  │  │     DTOs, Services
│  │  │        Domain           │  │  │  ← Entities, Value Objects, Events,
│  │  │   (Pure TypeScript)     │  │  │     Exceptions
│  │  └─────────────────────────┘  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

**Dependency rule**: Inner layers NEVER import from outer layers. Domain → nothing. Application → Domain only. Infrastructure → anything.

## Forbidden Imports by Layer

### Domain Layer (`modules/*/domain/**`)

These imports are **forbidden** — domain must be pure TypeScript:

```
@nestjs/*            # No framework decorators or DI
typeorm              # No ORM
express              # No HTTP
axios                # No HTTP client
ioredis              # No cache
@aws-sdk/*           # No cloud SDK
class-validator      # No decorator-based validation
class-transformer    # No decorator-based transformation
```

**Allowed**: `uuid`, `date-fns`, `@shared/domain`, relative domain imports.

### Application Layer (`modules/*/application/**`)

These imports are **forbidden**:

```
typeorm              # No ORM (use Ports instead)
express              # No HTTP
ioredis              # No cache
@aws-sdk/*           # No cloud SDK
```

**Allowed**: `@nestjs/common` (`@Injectable`, `@Inject`), `@nestjs/cqrs`, `@shared/domain`, `@shared/application`, domain imports.

### Shared Domain (`shared/domain/**`)

Same forbidden list as module domain layers.

### Shared Application (`shared/application/**`)

Same forbidden list as module application layers.

## Module Isolation

- Modules MUST NOT import from other modules directly
- Cross-module imports allowed ONLY in:
  - `infrastructure/adapters/` — integration point with other modules
  - `*.module.ts` — NestJS module wiring
- Inter-module communication should use the **event bus**

## Naming Conventions

| Layer | Directory | File Pattern | Example |
|---|---|---|---|
| Domain | `entities/` | `*.entity.ts` | `event.entity.ts` |
| Domain | `value-objects/` | `*.vo.ts` | `location.vo.ts` |
| Domain | `events/` | `*.event.ts` | `event-created.event.ts` |
| Domain | `exceptions/` | `*.exception.ts` | `invalid-event.exception.ts` |
| Application | `commands/` | `*.command.ts`, `*.handler.ts` | `create-event.command.ts` |
| Application | `queries/` | `*.query.ts`, `*.handler.ts` | `get-event-by-id.query.ts` |
| Application | `ports/` | `*.port.ts` | `event.repository.port.ts` |
| Application | `dtos/` | `*.dto.ts` | `create-event.dto.ts` |
| Infrastructure | `controllers/` | `*.controller.ts` | `event.controller.ts` |
| Infrastructure | `repositories/` | `*.repository.ts` | `typeorm-event.repository.ts` |
| Infrastructure | `persistence/` | `*.entity.ts` | `event.orm-entity.ts` |

## Infrastructure Requirements

### Repositories

- Must have `@Injectable()` decorator
- Must implement a Port interface from `application/ports/`
- Injection token: `Symbol('REPOSITORY_NAME')` defined alongside the Port

### Controllers

- Must have `@Controller()` decorator
- Swagger documentation (`@ApiTags`, `@ApiOperation`, `@ApiResponse`) is reviewed separately

## Database Isolation

- Each module uses its own PostgreSQL schema
- No cross-schema foreign keys
- Migrations scoped per module

## Acceptable Circular Dependencies

These DDD patterns are allowed and will not be flagged:

1. **Value Object ↔ Exception**: VOs importing domain exceptions for validation
2. **ORM bidirectional relations**: TypeORM entities in `infrastructure/persistence/` may reference each other within the same module

## Code Quality Rules

- No `console.log` — use NestJS `Logger`
- No `any` type — use `unknown` or proper types
- Domain exceptions must extend `DomainException` base class
- DTOs should use `class-validator` decorators for validation (in application/infrastructure, not domain)

## 6 Planned Modules

| Module | Status | Schema |
|---|---|---|
| `users` | ✅ Implemented | `users` |
| `events` | ✅ Implemented | `events` |
| `tickets` | 🔲 Planned | `tickets` |
| `payments` | 🔲 Planned | `payments` |
| `notifications` | 🔲 Planned | `notifications` |
| `analytics` | 🔲 Planned | `analytics` |

## Running Tests

```bash
# All architecture tests (14 suites, 30+ assertions)
npm run test:arch

# Specific suite
npx jest --config test/jest-architecture.json --testNamePattern="Domain"

# ESLint architecture rules
npm run lint:check
```
