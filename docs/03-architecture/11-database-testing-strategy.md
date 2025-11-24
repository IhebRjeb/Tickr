# 🧪 Modern Database Testing Strategy

## Overview

This document explains our **modern, optimized approach** to database testing in CI/CD pipelines.

---

## 🎯 Strategy: Service Containers + Isolated Test Databases

### Why This Approach?

✅ **Fast**: No need to provision cloud databases  
✅ **Isolated**: Each test run gets a fresh database  
✅ **Cost-effective**: Free GitHub Actions service containers  
✅ **Reliable**: No flaky tests from shared state  
✅ **Parallel-safe**: Multiple jobs can run simultaneously  

---

## 🏗️ Architecture

### Local Development
```
┌─────────────────┐
│  Developer      │
│  Machine        │
├─────────────────┤
│ Docker Compose  │
│ - PostgreSQL    │
│ - Redis         │
│ - LocalStack    │
└─────────────────┘
```

### CI/CD Pipeline
```
┌──────────────────────┐
│  GitHub Actions      │
├──────────────────────┤
│  Service Containers  │
│  ┌────────────────┐  │
│  │ postgres:15    │  │ ← Fresh DB per job
│  │ tickr_test     │  │
│  └────────────────┘  │
│  ┌────────────────┐  │
│  │ redis:7        │  │ ← Fresh Redis per job
│  └────────────────┘  │
└──────────────────────┘
```

---

## 📁 Test Database Configuration

### Environment Variables

We support **two connection methods**:

#### Method 1: DATABASE_URL (Recommended for CI/CD)
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tickr_test
```

**Pros:**
- Single variable
- Easy to configure in CI/CD
- Standard across platforms (Heroku, Railway, etc.)

#### Method 2: Individual Variables (Good for Local)
```bash
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=tickr_test
```

**Pros:**
- More granular control
- Easy to override individual values
- Better for Docker Compose

---

## 🔄 Test Lifecycle

### 1. Setup (Once per test suite)
```typescript
beforeAll(async () => {
  await TestDatabaseHelper.setup();
  // - Initialize connection
  // - Run migrations
});
```

### 2. Cleanup (Between each test)
```typescript
afterEach(async () => {
  await TestDatabaseHelper.cleanup();
  // - Truncate all tables
  // - Keep schema intact
  // - Fast (~100ms)
});
```

### 3. Teardown (Once after all tests)
```typescript
afterAll(async () => {
  await TestDatabaseHelper.teardown();
  // - Close connections
  // - Release resources
});
```

---

## 🚀 Best Practices

### ✅ DO

1. **Use service containers in CI/CD**
   ```yaml
   services:
     postgres:
       image: postgres:15-alpine  # Lightweight
       env:
         POSTGRES_DB: tickr_test  # Dedicated test DB
   ```

2. **Run migrations in CI/CD**
   ```yaml
   - name: Run migrations
     run: npm run migration:run
   ```

3. **Clean between tests, not recreate**
   ```typescript
   afterEach(() => TestDatabaseHelper.cleanup());  // ✅ Fast
   ```

4. **Use transactions for unit tests** (when possible)
   ```typescript
   beforeEach(async () => {
     await queryRunner.startTransaction();
   });
   afterEach(async () => {
     await queryRunner.rollbackTransaction();
   });
   ```

### ❌ DON'T

1. **Don't use production database**
   ```yaml
   # ❌ NEVER
   DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
   ```

2. **Don't recreate DB per test**
   ```typescript
   // ❌ Slow (2-5 seconds per test)
   afterEach(async () => {
     await dataSource.dropDatabase();
     await dataSource.synchronize();
   });
   ```

3. **Don't share state between tests**
   ```typescript
   // ❌ Flaky tests
   test('create user', () => {
     const user = await createUser(); // user.id = 1
   });
   test('find user', () => {
     const user = await findUser(1); // Depends on previous test!
   });
   ```

4. **Don't use custom DB runners** (unless necessary)
   - Service containers are simpler
   - Self-hosted runners cost more
   - Managed runners have better caching

---

## 🏃 Performance Optimizations

### 1. Parallel Test Execution
```json
{
  "jest": {
    "maxWorkers": "50%",  // Use half CPU cores
    "testTimeout": 30000
  }
}
```

### 2. Database Connection Pooling
```typescript
{
  type: 'postgres',
  poolSize: 10,  // Adjust based on needs
  extra: {
    max: 20,
    min: 5,
    idle: 10000
  }
}
```

### 3. Migration Caching (CI/CD)
```yaml
- uses: actions/cache@v4
  with:
    path: |
      backend/node_modules
      backend/dist
    key: ${{ runner.os }}-build-${{ hashFiles('**/package-lock.json') }}
```

### 4. Use Alpine Images
```yaml
services:
  postgres:
    image: postgres:15-alpine  # 50% smaller than full image
```

---

## 📊 Comparison: Different Approaches

| Approach | Speed | Cost | Isolation | Complexity |
|----------|-------|------|-----------|------------|
| **Service Containers** ✅ | ⚡⚡⚡ Fast | 💰 Free | 🔒 Perfect | 😊 Simple |
| Custom DB Runner | ⚡⚡ Medium | 💰💰 $50+/mo | 🔒 Good | 😐 Medium |
| Cloud Test DB | ⚡ Slow | 💰💰💰 $100+/mo | 🔓 Shared | 😊 Simple |
| In-Memory DB | ⚡⚡⚡ Very Fast | 💰 Free | 🔒 Perfect | 😕 Complex* |

_* In-memory (SQLite) requires different SQL dialect, not production-like_

---

## 🎯 Our Recommendation

### For CI/CD: **Service Containers** (Current Setup ✅)

**Why:**
- Free with GitHub Actions
- Fast (< 30 seconds for full test suite)
- Perfect isolation
- Production-like (same PostgreSQL version)
- No maintenance

**Implementation:**
```yaml
services:
  postgres:
    image: postgres:15-alpine
    env:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: tickr_test
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
    ports:
      - 5432:5432
```

### For Local Development: **Docker Compose** (Already Have ✅)

**Why:**
- Consistent with CI/CD
- Easy to start/stop
- No local PostgreSQL installation needed
- Same versions as production

---

## 🔍 Troubleshooting

### Issue: "database 'tickr' does not exist"

**Cause:** Mismatch between DB name in config and actual DB

**Solution:**
```typescript
// data-source.ts now supports both:
// 1. DATABASE_URL (preferred for CI)
DATABASE_URL=postgresql://user:pass@host:5432/tickr_test

// 2. Individual vars (preferred for local)
DB_DATABASE=tickr_test
```

### Issue: Tests are slow

**Solutions:**
1. Use `cleanup()` instead of `reset()` between tests
2. Enable connection pooling
3. Run tests in parallel (`jest --maxWorkers=50%`)
4. Use transactions for unit tests

### Issue: Port 5432 already in use

**Solutions:**
```bash
# Stop local PostgreSQL
sudo systemctl stop postgresql

# Or use different port in CI
ports:
  - 5433:5432
```

---

## 📚 References

- [GitHub Actions Service Containers](https://docs.github.com/en/actions/using-containerized-services/about-service-containers)
- [TypeORM Testing Best Practices](https://typeorm.io/testing)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)

---

## ✅ Checklist

- [x] Service containers configured in CI
- [x] `DATABASE_URL` support added
- [x] Test helpers created (`TestDatabaseHelper`)
- [x] `.env.test` file created
- [x] Jest configuration updated
- [x] Migrations run in CI before tests
- [x] Cleanup between tests implemented
- [x] Health checks configured
- [ ] Add integration tests
- [ ] Add E2E tests
- [ ] Monitor test performance

---

**Last Updated:** November 24, 2025  
**Status:** ✅ Optimized and Production-Ready
