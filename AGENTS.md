# AGENTS.MD - Tickr Development Guide

> Reference guide for AI coding agents working on the Tickr ticketing platform codebase.

## Project Overview

**Tickr** is a Tunisian online ticketing platform built with:
- **Backend**: NestJS 11 + TypeScript 5.7 (Hexagonal Architecture)
- **Frontend**: Next.js 16 + React 19 + TailwindCSS 4
- **Architecture**: Modular Monolith with 6 bounded contexts (Users, Events, Tickets, Payments, Notifications, Analytics)
- **Current State**: Users, Events, Tickets & Payments modules implemented; Notifications & Analytics planned

---

## Build, Lint & Test Commands

### Backend (`/backend`)

```bash
# Development
npm run start:dev              # Start with hot-reload
npm run start:debug            # Start with debugger

# Build
npm run build                  # Production build
npm run start:prod             # Run production build

# Linting & Formatting
npm run lint                   # ESLint with auto-fix
npm run lint:check             # ESLint check only (CI)
npm run format                 # Prettier format

# Type Checking
npm run type-check             # TypeScript check (not in package.json, use: npx tsc --noEmit)

# Testing
npm test                       # All unit tests
npm run test:watch             # Unit tests in watch mode
npm run test:cov               # Tests with coverage
npm run test:e2e               # E2E tests
npm run test:arch              # Architecture fitness functions
npm run test:unit              # Unit tests only
npm run test:integration       # Integration tests only
npm run test:all               # Run all test suites

# Single Test File
npx jest path/to/file.spec.ts
npx jest --testNamePattern="test description"

# Database
npm run migration:generate -- src/migrations/MigrationName
npm run migration:run
npm run migration:revert
```

### Frontend (`/frontend`)

```bash
# Development
npm run dev                    # Start dev server (port 3001)
npm run build                  # Production build
npm run start                  # Start production server

# Linting & Formatting
npm run lint                   # ESLint check & fix
npm run format:check           # Prettier check

# Type Checking
npm run type-check             # TypeScript check

# Testing
npm test                       # Vitest unit tests
npm run test:unit              # Unit tests with coverage
npm run test:watch             # Watch mode
npm run test:ui                # Vitest UI
npm run test:e2e               # Playwright E2E tests

# Single Test
npx vitest run src/path/to/file.test.ts
```

### Docker & Make Commands

```bash
make dev                       # Start all services
make dev-backend               # Backend + DB + Redis only
make dev-frontend              # Frontend only
make stop                      # Stop all services
make logs                      # View logs
make test                      # Run all tests
make lint                      # Lint all projects
```

---

## Code Style Guidelines

### Import Conventions

**Backend** - Path aliases configured in `tsconfig.json`:
```typescript
// ✅ CORRECT: Use path aliases (alphabetized groups with newlines)
import { Injectable, Inject, Logger } from '@nestjs/common';

import { Result } from '@shared/domain/result';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

import { EventEntity } from '../../../domain/entities/event.entity';
import { EVENT_REPOSITORY } from '../../ports/event.repository.port';

import type { EventRepositoryPort } from '../../ports/event.repository.port';

// ❌ WRONG: Absolute imports without alias
import { Result } from '../../../../shared/domain/result';
```

**Import Order** (enforced by ESLint):
1. Node built-ins
2. External packages (`@nestjs/*`, `typeorm`, etc.)
3. Internal aliases (`@shared/*`, `@modules/*`)
4. Parent directories (`../`)
5. Siblings (`./`)
6. Type imports (use `import type`)

**Always** maintain blank lines between import groups.

**Frontend** - Next.js conventions:
```typescript
// ✅ CORRECT
import { useState } from 'react';
import Link from 'next/link';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// Type imports
import type { ComponentProps } from 'react';
```

### Formatting

**Enforced by Prettier** (`.prettierrc`):
- **Single quotes** for strings
- **Trailing commas** everywhere
- **No semicolons** (frontend) / **Semicolons** (backend follows standard JS)
- **2 spaces** indentation
- **Line length**: 80-100 chars (not strict)

### TypeScript Conventions

**Type Safety** (strict mode enabled):
```typescript
// ✅ CORRECT: Explicit types for public APIs
export class UserDto {
  readonly id: string;
  readonly email: string;
  readonly role: UserRole;
}

// ✅ CORRECT: Inferred types for internals
const result = await this.repository.save(event);

// ✅ CORRECT: Type imports
import type { EventRepositoryPort } from './ports';

// ❌ WRONG: Using 'any'
const data: any = await fetch();  // Use unknown or proper type

// ❌ WRONG: Type assertions
const user = data as User;  // Validate instead
```

**Interfaces vs Types**:
- **Interfaces**: For object shapes, DTOs, contracts
- **Types**: For unions, intersections, mapped types
- **Classes**: For domain entities, value objects, DTOs

**Decorators** (Backend only):
```typescript
@Injectable()
export class CreateEventHandler {
  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepositoryPort,
  ) {}
}
```

### Naming Conventions

**Files**:
- **Backend Domain**: `event.entity.ts`, `location.vo.ts`, `event-created.event.ts`
- **Backend Application**: `create-event.handler.ts`, `create-event.command.ts`, `user.dto.ts`
- **Backend Infrastructure**: `event.repository.ts`, `typeorm-event.repository.ts`
- **Frontend**: `page.tsx`, `layout.tsx`, `button.tsx`, `use-auth.ts`, `api-client.ts`
- **Tests**: `event.entity.spec.ts`, `button.test.tsx`

**Classes & Interfaces**:
```typescript
// Entities (domain models)
export class EventEntity extends BaseEntity {}

// Value Objects
export class LocationVO {}

// DTOs (data transfer objects)
export class CreateEventDto {}

// Repositories (interfaces)
export interface EventRepositoryPort {}

// Handlers
export class CreateEventHandler {}

// Exceptions
export class InvalidEventException extends DomainException {}
```

**Variables**:
- `camelCase` for variables and functions
- `PascalCase` for classes, types, interfaces
- `SCREAMING_SNAKE_CASE` for constants and injection tokens
- Prefix booleans with `is`, `has`, `should`
- No Hungarian notation

**React Components** (Frontend):
```typescript
// ✅ CORRECT: PascalCase, named export preferred for pages
export default function HomePage() {}

// ✅ CORRECT: Named export for reusable components
export function Button({ children, ...props }: ButtonProps) {}
```

### Error Handling

**Backend** - Railway-Oriented Programming with `Result<T, E>`:
```typescript
// ✅ CORRECT: Return Result for expected failures
async execute(command: CreateEventCommand): Promise<Result<EventId, CreateEventError>> {
  // Validation failure
  if (!userValidation.isOrganizer) {
    return Result.fail({
      type: 'NOT_ORGANIZER',
      message: 'User does not have ORGANIZER role',
    });
  }
  
  // Success
  return Result.ok({ eventId: savedEvent.id });
}

// ✅ CORRECT: Throw for unexpected errors (framework handles)
if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

// ❌ WRONG: Don't use try-catch for business logic
try {
  const event = await createEvent();
} catch (e) {
  return null;  // Lost error context
}
```

**Never**:
- Use `console.log` (fails ESLint) - use NestJS `Logger` instead
- Suppress errors silently
- Use `any` for error types

**Frontend**:
```typescript
// ✅ CORRECT: Handle errors with type safety
try {
  const data = await api.getEvent(id);
  return data;
} catch (error) {
  if (error instanceof ApiError) {
    toast.error(error.message);
  }
  throw error;
}
```

### Hexagonal Architecture Rules (Backend)

**CRITICAL** - Enforced by ESLint architecture rules:

```
Domain Layer (Pure business logic):
  ✅ CAN import: Other domain models, @shared/domain
  ❌ CANNOT import: Application, Infrastructure, NestJS, TypeORM, Express
  
Application Layer (Use cases):
  ✅ CAN import: Domain, @shared/domain, @shared/application
  ❌ CANNOT import: Infrastructure, TypeORM, Express
  ✅ CAN use: NestJS decorators (@Injectable, @Inject)
  
Infrastructure Layer (Adapters):
  ✅ CAN import: Everything (Domain, Application, external libs)
```

**Port & Adapter Pattern**:
```typescript
// Application layer defines PORT (interface)
export const EVENT_REPOSITORY = Symbol('EVENT_REPOSITORY');

export interface EventRepositoryPort {
  save(event: EventEntity): Promise<EventEntity>;
  findById(id: string): Promise<EventEntity | null>;
}

// Infrastructure provides ADAPTER (implementation)
@Injectable()
export class TypeOrmEventRepository implements EventRepositoryPort {
  // TypeORM-specific implementation
}
```

---

## Architecture Patterns

### CQRS (Backend)
- **Commands**: Mutate state (`CreateEventCommand` → `CreateEventHandler`)
- **Queries**: Read state (`GetUserByIdQuery` → `GetUserByIdHandler`)
- **Events**: Domain events published after state changes

### Result Pattern (Backend)
Prefer `Result<T, E>` over exceptions for expected failures:
```typescript
const result = await handler.execute(command);

if (result.isSuccess) {
  return result.value;
} else {
  // Handle specific error types
  switch (result.error.type) {
    case 'NOT_FOUND': return 404;
    case 'VALIDATION_ERROR': return 400;
  }
}
```

### Value Objects (Backend)
Immutable, self-validating domain primitives:
```typescript
// ✅ Static factory with validation
export class LocationVO {
  private constructor(private readonly props: LocationProps) {}
  
  static create(props: LocationProps): LocationVO {
    if (!props.city) throw new Error('City required');
    return new LocationVO(props);
  }
}
```

---

## Testing Conventions

**Backend Tests** (`*.spec.ts`):
```typescript
describe('CreateEventHandler', () => {
  let handler: CreateEventHandler;
  let mockRepository: jest.Mocked<EventRepositoryPort>;
  
  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
    };
    handler = new CreateEventHandler(mockRepository);
  });
  
  it('should create event successfully', async () => {
    // Arrange
    const command = new CreateEventCommand(/*...*/);
    
    // Act
    const result = await handler.execute(command);
    
    // Assert
    expect(result.isSuccess).toBe(true);
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });
});
```

**Frontend Tests** (`*.test.tsx`):
```typescript
import { render, screen } from '@testing-library/react';
import { HomePage } from './page';

describe('HomePage', () => {
  it('renders welcome message', () => {
    render(<HomePage />);
    expect(screen.getByText(/Tickr/i)).toBeInTheDocument();
  });
});
```

---

## Common Pitfalls

1. **Don't violate hexagonal boundaries** - Domain cannot import Infrastructure
2. **Don't use `console.log`** - Use NestJS `Logger` in backend
3. **Don't use `any`** - Prefer `unknown` and type guards
4. **Don't suppress TypeScript errors** - Fix the root cause
5. **Don't skip tests** - Coverage target is >80%
6. **Don't commit** `.env.local` files - Use `.env.example` as template
7. **Always use path aliases** - `@shared/*`, `@modules/*`, `@/*`
8. **Run linters before commit** - CI will fail otherwise

---

## Git Workflow

- **Branches**: `feature/*`, `bugfix/*`, `hotfix/*`
- **Commits**: Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`)
- **PRs**: Target `develop` (staging) or `main` (production)
- **CI**: Runs lint, type-check, tests, architecture tests on all PRs

---

## Need Help?

- **Docs**: `/docs` folder (architecture, API specs, infrastructure)
- **Make**: Run `make help` for all available commands
- **Architecture**: Check `/docs/03-architecture` for hexagonal principles
