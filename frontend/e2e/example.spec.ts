/**
 * Example E2E Test
 * 
 * Basic end-to-end test to verify homepage loads.
 * Expand with actual user flows.
 */

import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check that the page has content
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have correct title', async ({ page }) => {
    await page.goto('/');
    
    // Check page title
    await expect(page).toHaveTitle(/Tickr/);
  });
});
