const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'miketest@gmail.com';

async function mockLoggedInUser(page) {
  await page.addInitScript((email) => {
    window.localStorage.setItem('userEmail', email);
  }, TEST_EMAIL);
}

async function gotoLoggedIn(page, path) {
  await mockLoggedInUser(page);
  await page.goto(`${BASE_URL}${path}`);
}

async function getNonEmptyOptionValues(page, selector) {
  await page.locator(selector).waitFor();
  const options = page.locator(`${selector} option`);
  const count = await options.count();
  const values = [];

  for (let i = 0; i < count; i++) {
    const value = await options.nth(i).getAttribute('value');
    if (value && value.trim() !== '') {
      values.push(value);
    }
  }

  return values;
}

async function waitForBrowseLoad(page) {
  await page.locator('#browseRecipeList').waitFor();
  await page.waitForTimeout(1500);
}

async function waitForPlannerLoad(page) {
  await page.locator('#plannerRecipeId').waitFor();
  await page.waitForTimeout(1500);
}

async function createRecipe(page, title) {
  await gotoLoggedIn(page, '/recipes/new');

  await expect(page.locator('h1')).toHaveText(/create new recipe/i);

  await page.locator('#title').fill(title);
  await page.locator('#ingredients').fill('Chicken, rice, spices');
  await page.locator('#instructions').fill('Cook chicken. Cook rice. Mix together.');
  await page.locator('#preparationTimeValue').fill('15');
  await page.locator('#cookingTimeValue').fill('25');
  await page.locator('#preparationSteps').fill('3');
  await page.locator('#difficulty').selectOption('2');
  await page.locator('#costLevel').selectOption('2');
  await page.locator('#servings').fill('2');
  await page.locator('#cuisine').fill('Test Cuisine');

  await page.locator('#recipeForm button[type="submit"]').click();

  await expect(page.locator('#formMessage')).toContainText(/recipe published|redirecting/i);
  await page.waitForURL(/\/recipes\/mine/, { timeout: 10000 });
}

async function saveMealUsingAvailableRecipe(page, dayOfWeek, mealType, excludedRecipeValues = []) {
  const recipeValues = await getNonEmptyOptionValues(page, '#plannerRecipeId');
  const candidates = recipeValues.filter((value) => !excludedRecipeValues.includes(value));

  for (const recipeValue of candidates) {
    await page.locator('#plannerDayOfWeek').selectOption(String(dayOfWeek));
    await page.locator('#plannerMealType').selectOption(mealType);
    await page.locator('#plannerRecipeId').selectOption(recipeValue);
    await page.locator('#plannerForm button[type="submit"]').click();

    await page.waitForTimeout(700);
    const message = (await page.locator('#plannerFormMessage').textContent()) || '';

    if (/saved/i.test(message)) {
      await page.waitForTimeout(1200);
      return recipeValue;
    }
  }

  throw new Error('Could not find any recipe that can be saved for this week.');
}

test.describe('MealMajor acceptance tests', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await expect(page).toHaveTitle(/MealMajor/i);
  });

  test.describe('US.04 - create, edit, delete recipes', () => {
    test('US.04.1 - user can create a recipe', async ({ page }) => {
      const recipeTitle = `PW Recipe ${Date.now()}`;

      await createRecipe(page, recipeTitle);

      await expect(page.locator('#recipeList')).toContainText(recipeTitle);
      await expect(page.locator('#viewRecipeTitle')).toHaveText(recipeTitle);
    });

    test('US.04.2 - user can edit and delete a recipe', async ({ page }) => {
      const recipeTitle = `PW Edit Recipe ${Date.now()}`;
      const updatedTitle = `${recipeTitle} Updated`;

      await createRecipe(page, recipeTitle);

      await expect(page.locator('#recipeList')).toContainText(recipeTitle);

      await page.locator('.recipe-item', { hasText: recipeTitle }).click();
      await page.locator('#editRecipeButton').click();

      await page.locator('#editTitle').fill(updatedTitle);
      await page.locator('#editCuisine').fill('Updated Cuisine');
      await page.locator('#recipeEditForm button[type="submit"]').click();

      await expect(page.locator('#viewRecipeMessage')).toContainText(/updated successfully/i);
      await expect(page.locator('#viewRecipeTitle')).toHaveText(updatedTitle);

      page.once('dialog', async (dialog) => {
        await dialog.accept();
      });

      await page.locator('#deleteRecipeButton').click();

      await expect(page.locator('#recipeList')).not.toContainText(updatedTitle);
    });
  });

  test.describe('US.05 - search recipes', () => {
    test('US.05.1 - search returns relevant recipes', async ({ page }) => {
      await gotoLoggedIn(page, '/recipes/browse');
      await waitForBrowseLoad(page);

      await expect(page.locator('h1')).toHaveText(/browse recipes/i);

      await page.locator('#browseSearchInput').fill('Falafel');
      await expect(page.locator('#browseRecipeList')).toContainText(/Falafel Salad with Lemon-Tahini Dressing/i);
    });

    test('US.05.2 - search updates results dynamically', async ({ page }) => {
      await gotoLoggedIn(page, '/recipes/browse');
      await waitForBrowseLoad(page);

      await page.locator('#browseSearchInput').fill('Tabbouleh');
      await expect(page.locator('#browseRecipeList')).toContainText(/Tabbouleh/i);

      await page.locator('#browseSearchInput').fill('Shawarma');
      await expect(page.locator('#browseRecipeList')).toContainText(/Chicken Shawarma with Potatoes/i);
    });
  });

  test.describe('US.06 - filter recipes', () => {
    test('US.06.1 - user can filter recipes by difficulty and cost', async ({ page }) => {
      await gotoLoggedIn(page, '/recipes/browse');
      await waitForBrowseLoad(page);

      await page.locator('#filterDifficulty').selectOption('2');
      await page.locator('#filterCost').selectOption('4');

      await expect(page.locator('#browseRecipeList')).toContainText(/Avocado & Smoked Salmon Omelet/i);
    });

    test('US.06.2 - clear filters resets the browse state', async ({ page }) => {
      await gotoLoggedIn(page, '/recipes/browse');
      await waitForBrowseLoad(page);

      await page.locator('#browseSearchInput').fill('Tabbouleh');
      await expect(page.locator('#browseRecipeList')).toContainText(/Tabbouleh/i);

      await page.locator('#clearBrowseFilters').click();
      await expect(page.locator('#browseStatus')).toContainText(/recipe/i);
    });
  });

  test.describe('US.07 - create weekly meal plan', () => {
    test('US.07.1 - user can save a meal in the weekly planner', async ({ page }) => {
      await gotoLoggedIn(page, '/planner/weekly');
      await waitForPlannerLoad(page);

      await expect(page.locator('h1')).toHaveText(/weekly meal planner/i);

      await saveMealUsingAvailableRecipe(page, 0, 'dinner');

      await expect(page.locator('#plannerFormMessage')).toContainText(/saved .* for monday|saved/i);
    });

    test('US.07.2 - user sees error when saving without recipe', async ({ page }) => {
      await gotoLoggedIn(page, '/planner/weekly');
      await waitForPlannerLoad(page);

      await page.locator('#plannerRecipeId').selectOption('');
      await page.locator('#plannerForm button[type="submit"]').click();

      await expect(page.locator('#plannerFormMessage')).toContainText(/select a recipe before saving/i);
    });
  });

 test.describe('US.08 - edit and remove weekly meals', () => {
   test('US.08.1 - user can edit an existing weekly meal', async ({ page }) => {
     await gotoLoggedIn(page, '/planner/weekly');
     await waitForPlannerLoad(page);

     await saveMealUsingAvailableRecipe(page, 1, 'lunch');
     await expect(page.locator('#plannerFormMessage')).toContainText(/saved/i);

     const mealCard = page.locator('.planner-day-meal').first();
     await mealCard.waitFor({ state: 'attached', timeout: 10000 });
     await mealCard.click();

     const editButton = mealCard.locator('.planner-slot-action[data-action="edit"]');
     await editButton.click();

     await expect(page.locator('#plannerFormMessage')).toContainText(/editing/i);

     await saveMealUsingAvailableRecipe(page, 1, 'snack');
     await expect(page.locator('#plannerFormMessage')).toContainText(/saved/i);
   });

   test('US.08.2 - user can delete an existing weekly meal', async ({ page }) => {
     await gotoLoggedIn(page, '/planner/weekly');
     await waitForPlannerLoad(page);

     await saveMealUsingAvailableRecipe(page, 2, 'breakfast');
     await expect(page.locator('#plannerFormMessage')).toContainText(/saved/i);

     const mealCard = page.locator('.planner-day-meal').first();
     await mealCard.waitFor({ state: 'attached', timeout: 10000 });
     await mealCard.click();

     const deleteButton = mealCard.locator('.planner-slot-action[data-action="remove"]');

     page.once('dialog', async (dialog) => {
       await dialog.accept();
     });

     await deleteButton.click();

     await expect(page.locator('#plannerGridMessage')).toContainText(/meal removed from the planner/i);
   });
 });
  test.describe('US.09 - view other users recipes', () => {
    test('US.09.1 - user can browse community recipes', async ({ page }) => {
      await gotoLoggedIn(page, '/recipes/browse');
      await waitForBrowseLoad(page);

      await expect(page.locator('h1')).toHaveText(/browse recipes/i);
      await expect(page.locator('#browseRecipeList')).toContainText(/published by/i);
    });

    test('US.09.2 - user can expand a recipe card to view details', async ({ page }) => {
      await gotoLoggedIn(page, '/recipes/browse');
      await waitForBrowseLoad(page);

      const firstCard = page.locator('.browse-card').first();
      await expect(firstCard).toBeVisible();
      await firstCard.click();

      await expect(firstCard).toContainText(/ingredients|instructions|dietary preferences|allergies/i);
    });
  });

  test.describe('US.10 - prevent duplicates in same week', () => {
    test('US.10.1 - duplicate recipe assignment shows an error', async ({ page }) => {
      await gotoLoggedIn(page, '/planner/weekly');
      await waitForPlannerLoad(page);

      const savedRecipe = await saveMealUsingAvailableRecipe(page, 3, 'dinner');
      await expect(page.locator('#plannerFormMessage')).toContainText(/saved/i);

      await page.locator('#plannerDayOfWeek').selectOption('4');
      await page.locator('#plannerMealType').selectOption('lunch');
      await page.locator('#plannerRecipeId').selectOption(savedRecipe);
      await page.locator('#plannerForm button[type="submit"]').click();

      await expect(page.locator('#plannerFormMessage')).toContainText(
        /duplicate|already exists|already assigned|selected week/i
      );
    });

    test('US.10.2 - duplicate recipe is not silently accepted', async ({ page }) => {
      await gotoLoggedIn(page, '/planner/weekly');
      await waitForPlannerLoad(page);

      const savedRecipe = await saveMealUsingAvailableRecipe(page, 5, 'breakfast');
      await expect(page.locator('#plannerFormMessage')).toContainText(/saved/i);

      await page.locator('#plannerDayOfWeek').selectOption('6');
      await page.locator('#plannerMealType').selectOption('snack');
      await page.locator('#plannerRecipeId').selectOption(savedRecipe);
      await page.locator('#plannerForm button[type="submit"]').click();

      await expect(page.locator('#plannerFormMessage')).not.toContainText(/saved .* for sunday/i);
      await expect(page.locator('#plannerFormMessage')).toContainText(
        /duplicate|already exists|already assigned|selected week/i
      );
    });
  });
});