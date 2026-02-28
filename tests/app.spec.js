const { test, expect } = require('@playwright/test');

test('MealMajor homepage loads', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await expect(page).toHaveTitle(/MealMajor/i);
});