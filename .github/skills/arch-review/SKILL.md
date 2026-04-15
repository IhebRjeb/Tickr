---
name: arch-review
description: "**REVIEW SKILL** — Verify hexagonal architecture compliance across backend modules. USE FOR: checking that domain/application/infrastructure layer boundaries are respected; validating naming conventions; detecting forbidden imports; finding cross-module coupling violations; reviewing before PR or after adding a new module. DO NOT USE FOR: writing architecture tests (they already exist); general code review; frontend review."
argument-hint: "Module name to review (e.g. 'events', 'users') or 'all' for every module"
---

# Architecture Compliance Review

Verify that Tickr backend modules respect the hexagonal architecture rules enforced by the architecture fitness functions in `backend/test/architecture/architecture.spec.ts`.

## When to Use

- Before opening a PR that touches backend module code
- After creating or modifying a module's domain, application, or infrastructure layers
- When adding new entities, value objects, commands, queries, or repositories
- To spot violations the architecture tests would catch in CI

## Procedure

### 1. Identify Target Modules

If the user specifies a module name, review that module only. If "all" or no argument, review every module under `backend/src/modules/`.

List existing modules:
```
backend/src/modules/*/
```

### 2. Check Hexagonal Layer Structure

Each module MUST have three directories:
```
modules/<name>/domain/
modules/<name>/application/
modules/<name>/infrastructure/
```

Report any missing layers.

### 3. Verify Domain Purity

Scan every `.ts` file in `modules/<name>/domain/` (excluding `*.spec.ts`). Extract all import statements and flag any that start with these forbidden prefixes:

| Forbidden Import | Why |
|---|---|
| `@nestjs` | Domain must be pure TypeScript |
| `typeorm` | No ORM in domain |
| `express` | No HTTP framework in domain |
| `axios` | No HTTP clients in domain |
| `ioredis` | No cache clients in domain |
| `@aws-sdk` | No cloud SDK in domain |
| `class-validator` | No decorator-based validation in domain |
| `class-transformer` | No decorator-based transformation in domain |

Domain CAN import: other domain files, `@shared/domain`, pure TypeScript libraries (`uuid`, `date-fns`).

### 4. Verify Application Layer

Scan every `.ts` file in `modules/<name>/application/`. Flag imports starting with:

| Forbidden Import | Why |
|---|---|
| `typeorm` | Application must not depend on ORM |
| `express` | Application must not depend on HTTP framework |
| `ioredis` | Application must not depend on cache client |
| `@aws-sdk` | Application must not depend on cloud SDK |

Application CAN import: domain, `@shared/domain`, `@shared/application`, `@nestjs/common` (for `@Injectable`, `@Inject`), `@nestjs/cqrs`.

### 5. Verify Module Isolation (No Cross-Module Coupling)

For every `.ts` file in the module (excluding `infrastructure/adapters/*.ts` and `*.module.ts`), check that no import references another module:

```
❌ import { ... } from '../../other-module/...'
❌ import { ... } from '@modules/other-module/...'
```

Cross-module imports are ONLY allowed in:
- `infrastructure/adapters/` — integration adapters
- `*.module.ts` — NestJS module definition

### 6. Verify Naming Conventions

Check file naming patterns in each layer:

| Location | Required Pattern |
|---|---|
| `domain/entities/` | `*.entity.ts` |
| `domain/value-objects/` | `*.vo.ts` |
| `domain/events/` | `*.event.ts` |
| `domain/exceptions/` | `*.exception.ts` |
| `application/commands/` | `*.command.ts` and `*.handler.ts` |
| `application/queries/` | `*.query.ts` and `*.handler.ts` |
| `application/ports/` | `*.port.ts` |
| `application/dtos/` | `*.dto.ts` |
| `infrastructure/controllers/` | `*.controller.ts` |
| `infrastructure/repositories/` | `*.repository.ts` |
| `infrastructure/persistence/` | `*.entity.ts` (ORM entities) |

### 7. Verify Shared Layer Purity

Check `backend/src/shared/domain/` for the same forbidden imports as module domains (no `@nestjs`, `typeorm`, `express`, etc.).

Check `backend/src/shared/application/` for the same forbidden imports as module application layers.

### 8. Check for Circular Dependencies

Build a dependency graph from imports within each module. Report any circular import chains, except for these acceptable DDD patterns:
- Value Object ↔ Exception (VOs throwing domain exceptions)
- ORM bidirectional relations in `infrastructure/persistence/`

### 9. Verify Infrastructure Patterns

For repository classes in `infrastructure/repositories/`:
- Must have `@Injectable()` decorator
- Must `implements` a Port interface from `application/ports/`

For controllers in `infrastructure/controllers/`:
- Must have `@Controller()` decorator

> Swagger/OpenAPI documentation compliance (`@ApiTags`, `@ApiOperation`, `@ApiResponse`) is out of scope — use a dedicated API-docs skill for that.

### 10. Run ESLint Architecture Rules

Run the linter to catch architecture boundary violations enforced by `import/no-restricted-paths`:

```bash
cd backend && npm run lint:check
```

Focus on these ESLint-reported violations:
- Domain importing from application or infrastructure
- Application importing from infrastructure
- Domain importing `@nestjs`, `typeorm`, or `express`
- Application importing `typeorm` or `express`

If there are lint errors, report each one with the file path and the violated rule. Do not confuse lint warnings (style) with architecture errors (import boundaries) — only architecture-related lint failures matter here.

### 11. Run Architecture Tests

After the manual review, run the automated fitness functions to confirm:
```bash
cd backend && npx jest --config test/jest-architecture.json
```

### 12. Report Findings

Produce a summary table:

| Check | Status | Details |
|---|---|---|
| Layer structure | ✅/❌ | Missing layers |
| Domain purity | ✅/❌ | Forbidden imports found |
| Application layer | ✅/❌ | Forbidden imports found |
| Module isolation | ✅/❌ | Cross-module imports |
| Naming conventions | ✅/❌ | Files not matching patterns |
| Shared layer purity | ✅/❌ | Forbidden imports |
| Circular dependencies | ✅/❌ | Cycles detected |
| Infrastructure patterns | ✅/❌ | Missing decorators/interfaces |
| ESLint boundaries | ✅/❌ | Lint rule violations |
| Architecture tests | ✅/❌ | Test run results |

For each ❌, explain the violation and suggest the exact fix.

### 13. Follow Up with API Documentation Review

After architecture compliance is confirmed, invoke the **api-docs-review** skill on the same module(s) to verify Swagger/OpenAPI documentation completeness. The two skills are designed to run in sequence:

1. `arch-review` → structure, boundaries, naming, imports
2. `api-docs-review` → Swagger decorators on controllers and DTOs

Ask the user if they want to proceed with the API docs review.

## Reference

See [architecture rules](./references/architecture-rules.md) for the complete list of forbidden imports, acceptable patterns, and the rationale behind each rule.
