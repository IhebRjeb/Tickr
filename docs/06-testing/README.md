# 🧪 Testing Documentation

Comprehensive testing guides for the Tickr project.

---

## 📋 Table of Contents

1. **[Frontend Testing Architecture](./01-frontend-testing-architecture.md)**
   - Test separation strategy (Unit vs E2E)
   - Vitest and Playwright configuration
   - Common issues and solutions

2. **[Frontend Testing Guide](./02-frontend-testing-guide.md)**
   - Quick start commands
   - Component testing with Vitest
   - E2E testing with Playwright
   - CI/CD integration
   - Debugging tips

3. **[Backend Testing Guide](./03-backend-testing-guide.md)**
   - Unit tests (Jest)
   - Integration tests (TypeORM)
   - Architecture tests
   - E2E tests (Supertest)
   - Database testing helpers

---

## 🚀 Quick Reference

### Frontend

```bash
# Unit tests (Vitest)
cd frontend && npm run test:unit

# E2E tests (Playwright)
cd frontend && npm run test:e2e

# Watch mode
npm run test:watch

# Coverage
npm run test:unit -- --coverage
```

### Backend

```bash
# Unit tests
cd backend && npm run test:unit

# Integration tests
npm run test:integration

# Architecture tests
npm run test:arch

# E2E tests
npm run test:e2e

# All tests
npm run test:all
```

---

## 🏗️ Testing Architecture

```
frontend/
├── src/
│   ├── components/
│   │   └── Button/
│   │       ├── Button.tsx
│   │       └── Button.test.tsx        # Vitest unit tests
│   └── test/
│       └── setup.ts                    # Test configuration
└── e2e/
    └── example.spec.ts                 # Playwright E2E tests

backend/
├── src/
│   └── modules/
│       └── users/
│           ├── domain/
│           │   └── user.entity.spec.ts      # Domain tests
│           ├── application/
│           │   └── create-user.spec.ts      # Use case tests
│           └── infrastructure/
│               └── user.repository.spec.ts  # Integration tests
└── test/
    ├── architecture/                   # Architecture tests
    ├── helpers/                        # Test utilities
    └── app.e2e-spec.ts                # E2E tests
```

---

## 📊 Coverage Targets

| Project | Unit Tests | Integration Tests | E2E Tests |
|---------|-----------|-------------------|-----------|
| **Frontend** | 80%+ | N/A | Critical paths |
| **Backend** | 80%+ | 70%+ | Critical paths |

---

## 🔗 Related Documentation

- **Architecture:**
  - [Database Testing Strategy](../03-architecture/11-database-testing-strategy.md)
  - [Database Testing Quick Guide](../03-architecture/DATABASE_TESTING_QUICK_GUIDE.md)
  - [Tests Verification](../03-architecture/07-tests-verification.md)

- **CI/CD:**
  - [CI Integration Complete](../03-architecture/08-ci-integration-complete.md)
  - [Architecture Tests in CI/CD](../05-git-workflow/03-architecture-tests-in-cicd.md)
  - [Development CI/CD Alignment](../03-architecture/10-development-cicd-alignment.md)

---

## 🎯 Testing Philosophy

1. **Fast Feedback:** Unit tests run in milliseconds
2. **Comprehensive:** Integration tests verify real behavior
3. **Confidence:** E2E tests validate user flows
4. **Maintainable:** Architecture tests enforce rules

---

**Status:** ✅ Complete testing infrastructure  
**Last Updated:** November 24, 2025
