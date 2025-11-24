# 🧪 Backend Testing Guide

## Overview

This guide covers the complete testing infrastructure for the NestJS backend, including unit tests, integration tests, architecture tests, and E2E tests.

---

## 📦 Testing Stack

| Tool | Purpose | Files | Run Command |
|------|---------|-------|-------------|
| **Jest** | Unit & Integration Tests | `**/*.spec.ts` | `npm run test:unit` |
| **Supertest** | HTTP Testing | `test/**/*.e2e-spec.ts` | `npm run test:e2e` |
| **Architecture Tests** | Hexagonal Rules | `test/architecture/**` | `npm run test:arch` |
| **TypeORM** | Database Testing | Integration tests | N/A |

---

## 🚀 Quick Start

```bash
# Unit tests
npm run test:unit

# Integration tests (requires DB)
npm run test:integration

# E2E tests (requires full stack)
npm run test:e2e

# Architecture tests
npm run test:arch

# All tests
npm run test:all

# Coverage
npm run test:cov
```

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── modules/
│   │   └── users/
│   │       ├── domain/
│   │       │   └── user.entity.spec.ts      # Domain tests
│   │       ├── application/
│   │       │   └── create-user.spec.ts      # Use case tests
│   │       └── infrastructure/
│   │           └── user.repository.spec.ts  # Integration tests
│   └── shared/
│       └── domain/
│           └── domain-event.base.spec.ts
└── test/
    ├── app.e2e-spec.ts                      # E2E tests
    ├── setup.ts                              # Test setup
    ├── architecture/                         # Architecture tests
    │   ├── domain-layer.spec.ts
    │   └── application-layer.spec.ts
    └── helpers/
        └── test-database.helper.ts           # DB helpers
```

---

## 🧪 Unit Tests

### Domain Layer Tests

**File:** `src/modules/users/domain/user.entity.spec.ts`
```typescript
import { User } from './user.entity';

describe('User Entity', () => {
  it('should create a user', () => {
    const user = User.create({
      email: 'test@example.com',
      name: 'Test User',
    });

    expect(user.email).toBe('test@example.com');
    expect(user.name).toBe('Test User');
  });

  it('should validate email format', () => {
    expect(() => {
      User.create({ email: 'invalid', name: 'Test' });
    }).toThrow('Invalid email format');
  });
});
```

### Use Case Tests

**File:** `src/modules/users/application/create-user.use-case.spec.ts`
```typescript
import { CreateUserUseCase } from './create-user.use-case';
import { MockUserRepository } from '../../../test/mocks';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let mockRepository: MockUserRepository;

  beforeEach(() => {
    mockRepository = new MockUserRepository();
    useCase = new CreateUserUseCase(mockRepository);
  });

  it('should create a user', async () => {
    const result = await useCase.execute({
      email: 'test@example.com',
      name: 'Test User',
    });

    expect(result).toBeDefined();
    expect(mockRepository.save).toHaveBeenCalled();
  });
});
```

---

## 🔗 Integration Tests

### Database Integration

**File:** `src/modules/users/infrastructure/user.repository.spec.ts`
```typescript
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRepository } from './user.repository';
import { TestDatabaseHelper } from '../../../../test/helpers/test-database.helper';

describe('UserRepository (Integration)', () => {
  let repository: UserRepository;

  beforeAll(async () => {
    await TestDatabaseHelper.setup();
    
    const module = await Test.createTestingModule({
      imports: [TypeOrmModule.forRoot(), TypeOrmModule.forFeature([User])],
      providers: [UserRepository],
    }).compile();

    repository = module.get(UserRepository);
  });

  afterEach(async () => {
    await TestDatabaseHelper.cleanup();
  });

  afterAll(async () => {
    await TestDatabaseHelper.teardown();
  });

  it('should save and retrieve a user', async () => {
    const user = await repository.save({
      email: 'test@example.com',
      name: 'Test User',
    });

    const found = await repository.findById(user.id);
    expect(found).toBeDefined();
    expect(found.email).toBe('test@example.com');
  });
});
```

---

## 🏛️ Architecture Tests

### Domain Layer Rules

**File:** `test/architecture/domain-layer.spec.ts`
```typescript
import { filesInPath } from './helpers';

describe('Domain Layer Architecture', () => {
  it('should not import from infrastructure', () => {
    const domainFiles = filesInPath('src/modules/*/domain/**/*.ts');
    const violations = domainFiles.filter(file => 
      file.imports.some(imp => imp.includes('/infrastructure/'))
    );

    expect(violations).toHaveLength(0);
  });

  it('should not import NestJS framework', () => {
    const domainFiles = filesInPath('src/modules/*/domain/**/*.ts');
    const violations = domainFiles.filter(file =>
      file.imports.some(imp => imp.includes('@nestjs'))
    );

    expect(violations).toHaveLength(0);
  });
});
```

---

## 🌐 E2E Tests

**File:** `test/app.e2e-spec.ts`
```typescript
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/users (POST)', () => {
    return request(app.getHttpServer())
      .post('/users')
      .send({ email: 'test@example.com', name: 'Test User' })
      .expect(201)
      .expect(res => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.email).toBe('test@example.com');
      });
  });
});
```

---

## 🗄️ Database Testing

### Test Database Helper

See: `test/helpers/test-database.helper.ts`

**Usage:**
```typescript
beforeAll(async () => {
  await TestDatabaseHelper.setup();  // Initialize & migrate
});

afterEach(async () => {
  await TestDatabaseHelper.cleanup();  // Clear data between tests
});

afterAll(async () => {
  await TestDatabaseHelper.teardown();  // Close connection
});
```

### Environment Configuration

**File:** `.env.test`
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tickr_test
NODE_ENV=test
LOG_LEVEL=error
```

---

## 📊 CI/CD Integration

### GitHub Actions

**Architecture Tests:**
```yaml
- name: Run architecture tests
  run: npm run test:arch
```

**Unit Tests:**
```yaml
- name: Run unit tests
  run: npm run test:unit -- --coverage
```

**Integration Tests:**
```yaml
services:
  postgres:
    image: postgres:15-alpine
    env:
      POSTGRES_DB: tickr_test

steps:
  - name: Run migrations
    run: npm run migration:run
    
  - name: Run integration tests
    run: npm run test:integration
```

**E2E Tests:**
```yaml
- name: Start services
  run: docker-compose up -d
  
- name: Run E2E tests
  run: npm run test:e2e
```

---

## ✅ Best Practices

### DO ✅

1. **Test domain logic thoroughly**
2. **Use mocks for external dependencies**
3. **Clean database between tests**
4. **Test error cases**
5. **Follow AAA pattern** (Arrange, Act, Assert)

### DON'T ❌

1. **Don't test framework code**
2. **Don't share state between tests**
3. **Don't use production database**
4. **Don't skip architecture tests**

---

## 📚 Resources

- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/)
- [Supertest](https://github.com/ladjs/supertest)
- [TypeORM Testing](https://typeorm.io/testing)

---

**Status:** ✅ Testing infrastructure complete  
**Location:** `docs/06-testing/03-backend-testing-guide.md`  
**Last Updated:** November 24, 2025
