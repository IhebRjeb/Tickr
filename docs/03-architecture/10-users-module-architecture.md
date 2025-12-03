# Users Module Architecture

## Overview

The Users module follows **Hexagonal Architecture** (Ports and Adapters) principles, ensuring clear separation of concerns between business logic and infrastructure details.

## Module Structure

```
src/modules/users/
├── domain/                    # Domain Layer (Core Business Logic)
│   ├── events/               # Domain Events
│   │   ├── email-verified.event.ts
│   │   ├── password-changed.event.ts
│   │   ├── password-reset-requested.event.ts
│   │   ├── user-deactivated.event.ts
│   │   ├── user-profile-updated.event.ts
│   │   └── user-registered.event.ts
│   ├── exceptions/           # Domain Exceptions
│   │   ├── duplicate-email.exception.ts
│   │   ├── invalid-email.exception.ts
│   │   ├── invalid-phone.exception.ts
│   │   └── weak-password.exception.ts
│   └── value-objects/        # Value Objects
│       ├── email.vo.ts
│       ├── hashed-password.vo.ts
│       ├── phone.vo.ts
│       └── user-role.vo.ts
├── application/               # Application Layer (Use Cases)
│   ├── commands/             # Command Handlers (CQRS)
│   │   ├── change-password.command.ts
│   │   ├── change-password.handler.ts
│   │   ├── deactivate-user.command.ts
│   │   ├── deactivate-user.handler.ts
│   │   ├── update-profile.command.ts
│   │   └── update-profile.handler.ts
│   ├── queries/              # Query Handlers (CQRS)
│   │   ├── get-user-by-email.handler.ts
│   │   ├── get-user-by-email.query.ts
│   │   ├── get-user-by-id.handler.ts
│   │   ├── get-user-by-id.query.ts
│   │   ├── get-users-by-role.handler.ts
│   │   └── get-users-by-role.query.ts
│   ├── event-handlers/       # Domain Event Handlers
│   │   ├── email-verified.handler.ts
│   │   ├── password-reset-requested.handler.ts
│   │   └── user-registered.handler.ts
│   ├── dtos/                 # Data Transfer Objects
│   │   ├── change-password.dto.ts
│   │   ├── update-profile.dto.ts
│   │   ├── user-profile.dto.ts
│   │   └── user.dto.ts
│   ├── mappers/              # Domain <-> DTO Mappers
│   │   └── user.mapper.ts
│   └── ports/                # Port Interfaces
│       └── user.repository.port.ts
└── infrastructure/            # Infrastructure Layer (Adapters)
    ├── controllers/          # HTTP Controllers
    │   ├── auth.controller.ts
    │   ├── users.controller.ts
    │   └── dtos/
    │       └── auth.dto.ts
    ├── persistence/          # Database Layer
    │   ├── entities/
    │   │   └── user.orm-entity.ts
    │   ├── mappers/
    │   │   └── user-persistence.mapper.ts
    │   └── repositories/
    │       └── user.typeorm-repository.ts
    ├── services/             # Infrastructure Services
    │   ├── jwt.service.ts
    │   ├── password.service.ts
    │   └── token.service.ts
    ├── strategies/           # Passport Strategies
    │   ├── jwt.strategy.ts
    │   └── local.strategy.ts
    ├── guards/               # NestJS Guards
    │   ├── email-verified.guard.ts
    │   ├── jwt-auth.guard.ts
    │   └── roles.guard.ts
    ├── decorators/           # Custom Decorators
    │   └── auth.decorators.ts
    └── users.module.ts       # Module Definition
```

---

## Architectural Layers

### 1. Domain Layer (Core)

The innermost layer containing pure business logic with **no external dependencies**.

#### Value Objects
Self-validating immutable objects representing domain concepts:

```typescript
// Email validation with format checking
const email = EmailVO.create('user@example.com');

// Password with strength validation (8+ chars, mixed case, numbers, symbols)
const password = await HashedPasswordVO.create('SecurePass123!');

// Phone with international format support
const phone = PhoneVO.create('+33612345678');

// Enum-based role with type safety
const role = UserRole.PARTICIPANT;
```

#### Domain Events
Events representing significant domain occurrences:

| Event | Trigger | Use Case |
|-------|---------|----------|
| `UserRegisteredEvent` | User registration | Send welcome email, init onboarding |
| `EmailVerifiedEvent` | Email verification | Update analytics, enable features |
| `PasswordChangedEvent` | Password update | Audit log, security notification |
| `PasswordResetRequestedEvent` | Reset request | Send reset email, track attempts |
| `UserDeactivatedEvent` | Account deactivation | Cleanup, audit trail |
| `UserProfileUpdatedEvent` | Profile changes | Sync with external systems |

### 2. Application Layer

Orchestrates use cases using CQRS (Command Query Responsibility Segregation):

#### Commands (Write Operations)
```typescript
// Change password
const command = new ChangePasswordCommand(userId, currentPwd, newPwd);
const result = await changePasswordHandler.execute(command);

// Update profile
const command = new UpdateProfileCommand(userId, firstName, lastName, phone);
const result = await updateProfileHandler.execute(command);

// Deactivate user
const command = new DeactivateUserCommand(userId);
const result = await deactivateUserHandler.execute(command);
```

#### Queries (Read Operations)
```typescript
// Get user by ID
const query = new GetUserByIdQuery(userId);
const user = await getUserByIdHandler.execute(query);

// Get user by email
const query = new GetUserByEmailQuery(email);
const user = await getUserByEmailHandler.execute(query);

// Get users by role with pagination
const query = new GetUsersByRoleQuery(role, page, limit);
const users = await getUsersByRoleHandler.execute(query);
```

### 3. Infrastructure Layer

Implements technical concerns and external integrations:

#### Repository Pattern
The repository port defines the contract:

```typescript
interface UserRepositoryPort {
  findById(id: string): Promise<UserEntityPort | null>;
  findByEmail(email: string): Promise<UserEntityPort | null>;
  findByRole(role: UserRole, options?: PaginationOptions): Promise<PaginatedResult<UserEntityPort>>;
  save(user: UserEntityPort): Promise<UserEntityPort>;
  delete(id: string): Promise<void>;
  existsByEmail(email: string): Promise<boolean>;
}
```

The TypeORM implementation fulfills the contract:

```typescript
@Injectable()
export class UserTypeOrmRepository implements UserRepositoryPort {
  // Implementation using TypeORM Repository
}
```

---

## CQRS Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Request                          │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
      ┌───────────────┐               ┌───────────────┐
      │   Commands    │               │    Queries    │
      │  (Write Ops)  │               │  (Read Ops)   │
      └───────────────┘               └───────────────┘
              │                               │
              ▼                               ▼
      ┌───────────────┐               ┌───────────────┐
      │   Handlers    │               │   Handlers    │
      └───────────────┘               └───────────────┘
              │                               │
              ▼                               │
      ┌───────────────┐                       │
      │ Domain Events │                       │
      └───────────────┘                       │
              │                               │
              └───────────────┬───────────────┘
                              ▼
                      ┌───────────────┐
                      │  Repository   │
                      │    Port       │
                      └───────────────┘
                              │
                              ▼
                      ┌───────────────┐
                      │  PostgreSQL   │
                      └───────────────┘
```

---

## Event-Driven Architecture

### Event Publishing
Domain events are published after successful operations:

```typescript
// After registration
eventBus.publish(new UserRegisteredEvent(userId, email, firstName));

// After email verification
eventBus.publish(new EmailVerifiedEvent(userId, email));

// After password change
eventBus.publish(new PasswordChangedEvent(userId));
```

### Event Handling
Handlers react to events asynchronously:

```typescript
@EventsHandler(UserRegisteredEvent)
export class UserRegisteredEventHandler 
  implements IEventHandler<UserRegisteredEvent> {
  
  async handle(event: UserRegisteredEvent): Promise<void> {
    // Send welcome email
    // Initialize user preferences
    // Track analytics
  }
}
```

---

## Dependency Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Infrastructure Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Controllers  │  │  TypeORM     │  │    Passport/JWT      │  │
│  │              │  │  Repository  │  │    Strategies        │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Commands   │  │   Queries    │  │    Event Handlers    │  │
│  │   Handlers   │  │   Handlers   │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                              │                                  │
│                    ┌─────────▼─────────┐                       │
│                    │       Ports       │                       │
│                    │  (Interfaces)     │                       │
│                    └───────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Domain Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │    Value     │  │   Domain     │  │      Exceptions      │  │
│  │   Objects    │  │   Events     │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

### 1. Port-Based Repository
- Interface defined in application layer
- Implementation in infrastructure layer
- Enables easy testing with mocks

### 2. Value Objects for Validation
- Email, Phone, Password validated at construction
- Immutable once created
- Self-documenting validation rules

### 3. CQRS Separation
- Commands for writes (with side effects)
- Queries for reads (no side effects)
- Easier to optimize and scale independently

### 4. Domain Events
- Decouple side effects from core logic
- Enable async processing
- Audit trail support

### 5. Result Type Pattern
- Explicit error handling
- No thrown exceptions in business logic
- Type-safe error handling

---

## Testing Strategy

| Layer | Test Type | Coverage Target |
|-------|-----------|-----------------|
| Domain | Unit Tests | 100% |
| Application | Unit Tests | 90%+ |
| Infrastructure | Integration Tests | 75%+ |
| Full Flow | E2E Tests | Critical paths |

See [Testing Guide](../06-testing/03-backend-testing-guide.md) for details.
