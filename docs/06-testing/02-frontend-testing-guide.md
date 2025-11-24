# ✅ Frontend Testing Setup - Complete Guide

## Overview

This guide covers the complete testing infrastructure for the Next.js 16 frontend, including unit tests (Vitest) and E2E tests (Playwright).

---

## 📦 Testing Stack

| Tool | Purpose | Files | Run Command |
|------|---------|-------|-------------|
| **Vitest** | Unit & Component Tests | `src/**/*.test.ts(x)` | `npm run test:unit` |
| **Playwright** | E2E Tests | `e2e/**/*.spec.ts` | `npm run test:e2e` |
| **Testing Library** | Component Testing | With Vitest | N/A |
| **@vitest/coverage-v8** | Code Coverage | Auto-generated | In `test:unit` |

---

## 🚀 Quick Start

### Run All Tests
```bash
# Unit tests with coverage
npm run test:unit

# Unit tests in watch mode (development)
npm run test:watch

# E2E tests (requires server)
npm run test:e2e

# Type checking
npm run type-check

# Linting
npm run lint:check
```

---

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js app directory
│   ├── components/
│   │   └── Button.test.tsx    # Component unit tests
│   ├── lib/
│   │   └── utils.test.ts      # Utility unit tests
│   └── test/
│       ├── setup.ts           # Test configuration
│       └── example.test.ts    # Example tests
├── e2e/
│   └── example.spec.ts        # Playwright E2E tests
├── vitest.config.ts           # Vitest configuration
└── playwright.config.ts       # Playwright configuration
```

---

## 🧪 Unit Testing with Vitest

### Configuration

**File:** `vitest.config.ts`
```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['**/e2e/**'],  // Exclude Playwright tests
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
    },
  },
});
```

### Example Component Test

**File:** `src/components/Button.test.tsx`
```typescript
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders button text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    screen.getByText('Click me').click();
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

### Example Utility Test

**File:** `src/lib/utils.test.ts`
```typescript
import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility', () => {
  it('merges class names', () => {
    const result = cn('base-class', 'additional-class');
    expect(result).toBe('base-class additional-class');
  });
});
```

---

## 🎭 E2E Testing with Playwright

### Configuration

**File:** `playwright.config.ts`
```typescript
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Example E2E Test

**File:** `e2e/homepage.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav')).toBeVisible();
  });
});
```

### User Flow Test

**File:** `e2e/auth.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('user can sign up', async ({ page }) => {
    await page.goto('/signup');
    
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.fill('[name="confirmPassword"]', 'SecurePass123!');
    
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Welcome')).toBeVisible();
  });
});
```

---

## 📊 Coverage Configuration

### Coverage Reports

Coverage is automatically generated when running `npm run test:unit`.

**Output locations:**
- **Terminal:** Text summary
- **HTML:** `coverage/index.html` (open in browser)
- **LCOV:** `coverage/lcov.info` (for CI/CD)
- **JSON:** `coverage/coverage-final.json`

### Coverage Thresholds

Add to `vitest.config.ts`:
```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html', 'lcov'],
  thresholds: {
    statements: 80,
    branches: 75,
    functions: 80,
    lines: 80,
  },
}
```

---

## 🔧 Available Scripts

```json
{
  "test": "vitest",
  "test:unit": "vitest run --coverage",
  "test:watch": "vitest",
  "test:ui": "vitest --ui",
  "test:e2e": "playwright test",
  "lint:check": "eslint",
  "format:check": "prettier --check .",
  "type-check": "tsc --noEmit"
}
```

---

## 🎯 CI/CD Integration

### GitHub Actions Workflow

**Unit Tests:**
```yaml
- name: Run unit tests
  run: npm run test:unit -- --coverage
  
- name: Upload coverage
  uses: codecov/codecov-action@v4
  with:
    files: ./frontend/coverage/lcov.info
```

**E2E Tests:**
```yaml
- name: Start services
  run: docker-compose up -d
  
- name: Wait for frontend
  run: timeout 60 bash -c 'until curl -f http://localhost:3001; do sleep 2; done'
  
- name: Run E2E tests
  run: npm run test:e2e
```

---

## 🐛 Debugging

### Debugging Unit Tests

**VS Code Debug Config:**
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test:watch"],
  "console": "integratedTerminal"
}
```

### Debugging E2E Tests

**Headed mode (see browser):**
```bash
npx playwright test --headed
```

**Debug mode (step through):**
```bash
npx playwright test --debug
```

**Trace viewer:**
```bash
npx playwright test --trace on
npx playwright show-trace trace.zip
```

---

## ✅ Best Practices

### DO ✅

1. **Write tests for all components**
   ```typescript
   // Every component should have a .test.tsx file
   Button.tsx → Button.test.tsx
   ```

2. **Test user interactions**
   ```typescript
   it('handles click', () => {
     const onClick = vi.fn();
     render(<Button onClick={onClick}>Click</Button>);
     fireEvent.click(screen.getByText('Click'));
     expect(onClick).toHaveBeenCalled();
   });
   ```

3. **Use data-testid for complex selectors**
   ```typescript
   <button data-testid="submit-btn">Submit</button>
   screen.getByTestId('submit-btn');
   ```

4. **Test error states**
   ```typescript
   it('displays error message', () => {
     render(<Form error="Invalid input" />);
     expect(screen.getByText('Invalid input')).toBeInTheDocument();
   });
   ```

### DON'T ❌

1. **Don't test implementation details**
   ```typescript
   // ❌ Bad
   expect(component.state.count).toBe(1);
   
   // ✅ Good
   expect(screen.getByText('Count: 1')).toBeInTheDocument();
   ```

2. **Don't mix test types**
   - Keep unit tests in `src/`
   - Keep E2E tests in `e2e/`

3. **Don't write brittle selectors**
   ```typescript
   // ❌ Bad
   page.locator('div > div > button:nth-child(3)');
   
   // ✅ Good
   page.locator('[data-testid="submit-button"]');
   ```

---

## 📚 Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Next.js Testing Guide](https://nextjs.org/docs/testing)

---

## 🎓 Next Steps

1. ✅ **Basic setup complete**
2. ⏳ **Add component tests** for all UI components
3. ⏳ **Add E2E tests** for critical user flows
4. ⏳ **Set coverage thresholds**
5. ⏳ **Add visual regression tests** (optional)

---

**Status:** ✅ Testing infrastructure complete and CI-ready!  
**Location:** `docs/06-testing/02-frontend-testing-guide.md`  
**Last Updated:** November 24, 2025
