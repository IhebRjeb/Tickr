# 🧪 Testing Architecture - Quick Reference

## Test Types & Tools

### 1. Unit Tests (Vitest)
**Purpose:** Test individual components and functions in isolation  
**Tool:** Vitest  
**Location:** `src/**/*.test.ts(x)`  
**Excludes:** `e2e/` directory

**Run:**
```bash
npm run test:unit         # CI/CD uses this
npm run test:watch        # Development
npm run test:ui           # Visual UI
```

**Config:** `vitest.config.ts`
```typescript
test: {
  exclude: [
    '**/e2e/**',  // ← Exclude Playwright tests
  ],
}
```

---

### 2. E2E Tests (Playwright)
**Purpose:** Test full user workflows across the entire application  
**Tool:** Playwright  
**Location:** `e2e/**/*.spec.ts`  
**Runs:** Separately from unit tests

**Run:**
```bash
npm run test:e2e          # CI/CD uses this
```

**Config:** `playwright.config.ts`
```typescript
testDir: './e2e',         // ← Only E2E tests
```

---

## Why Separate?

### Different Execution Contexts

| Aspect | Unit Tests (Vitest) | E2E Tests (Playwright) |
|--------|---------------------|------------------------|
| **Environment** | jsdom (simulated browser) | Real Chromium browser |
| **Speed** | ⚡⚡⚡ Very fast (ms) | ⚡ Slower (seconds) |
| **Scope** | Single component/function | Full user workflow |
| **Dependencies** | Mocked | Real (requires server) |
| **When** | Every commit | Before merge/deploy |

### Example

**Unit Test:**
```typescript
// src/components/Button.test.tsx
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

test('renders button text', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByText('Click me')).toBeInTheDocument();
});
```

**E2E Test:**
```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
```

---

## CI/CD Pipeline

### Job: Unit Tests
```yaml
- npm run test:unit
```
**Runs:** All `src/**/*.test.ts(x)` files  
**Excludes:** `e2e/` directory  
**Duration:** ~10-30 seconds  
**Coverage:** ✅ Generated

### Job: E2E Tests
```yaml
- docker-compose up
- npm run test:e2e
```
**Runs:** All `e2e/**/*.spec.ts` files  
**Requires:** Running server (Docker Compose)  
**Duration:** ~2-5 minutes  
**Coverage:** ❌ Not generated (full integration)

---

## Common Issues

### ❌ Issue: "Playwright Test did not expect test.describe()"

**Cause:** Vitest trying to run Playwright E2E tests

**Solution:** Already fixed in `vitest.config.ts`:
```typescript
test: {
  exclude: ['**/e2e/**'],  // ← Excludes Playwright tests
}
```

### ❌ Issue: E2E tests fail with "connect ECONNREFUSED"

**Cause:** Dev server not running

**Solution:**
```bash
# Option 1: Playwright starts server automatically (configured)
npm run test:e2e

# Option 2: Manual start (for debugging)
npm run dev &  # Start dev server
npm run test:e2e
```

---

## Best Practices

### ✅ DO

1. **Unit test components and logic**
   - Fast, isolated tests
   - Run frequently during development

2. **E2E test critical user flows**
   - Login/signup
   - Checkout process
   - Key workflows

3. **Keep tests separate**
   - Unit in `src/`
   - E2E in `e2e/`

### ❌ DON'T

1. **Don't mix test types**
   - Don't put Playwright tests in `src/`
   - Don't put Vitest tests in `e2e/`

2. **Don't over-test with E2E**
   - E2E is slower
   - Use unit tests for most cases

3. **Don't forget coverage**
   - Unit tests should have coverage
   - E2E tests don't need coverage

---

## Quick Commands

```bash
# Unit tests (fast, runs often)
npm run test:unit         # Run with coverage
npm run test:watch        # Watch mode for TDD

# E2E tests (slow, runs before deploy)
npm run test:e2e          # Full E2E suite

# All tests
npm run test:unit && npm run test:e2e

# Lint & Type check
npm run lint:check
npm run type-check
```

---

## Summary

✅ **Unit Tests (Vitest)** → `src/` → Fast, isolated  
✅ **E2E Tests (Playwright)** → `e2e/` → Slow, integrated  
✅ **Configured** → Tests properly separated  
✅ **CI/CD Ready** → Both run in pipeline

**No more conflicts between test frameworks!** 🎉
