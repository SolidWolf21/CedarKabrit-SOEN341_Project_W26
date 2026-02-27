const userEmail = localStorage.getItem("userEmail");
const recipeList = document.getElementById("recipeList");

const recipeEmptyState = document.getElementById("recipeEmptyState");
const emptyStateSubtitle = recipeEmptyState.querySelector(".form-subtitle");
const recipeViewCard = document.getElementById("recipeViewCard");
const recipeEditCard = document.getElementById("recipeEditCard");

const viewRecipeTitle = document.getElementById("viewRecipeTitle");
const viewRecipeCuisineSubheading = document.getElementById("viewRecipeCuisineSubheading");
const viewRecipeServings = document.getElementById("viewRecipeServings");
const viewRecipePublished = document.getElementById("viewRecipePublished");
const viewRecipeUpdated = document.getElementById("viewRecipeUpdated");
const viewRecipeTime = document.getElementById("viewRecipeTime");
const viewRecipeCookingTime = document.getElementById("viewRecipeCookingTime");
const viewRecipeSteps = document.getElementById("viewRecipeSteps");
const viewRecipeDifficulty = document.getElementById("viewRecipeDifficulty");
const viewRecipeCost = document.getElementById("viewRecipeCost");
const viewRecipeIngredients = document.getElementById("viewRecipeIngredients");
const viewRecipeInstructions = document.getElementById("viewRecipeInstructions");
const viewRecipeDiets = document.getElementById("viewRecipeDiets");
const viewRecipeAllergies = document.getElementById("viewRecipeAllergies");
const viewRecipeMessage = document.getElementById("viewRecipeMessage");

const editRecipeButton = document.getElementById("editRecipeButton");
const deleteRecipeButton = document.getElementById("deleteRecipeButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const recipeEditForm = document.getElementById("recipeEditForm");
const editMessage = document.getElementById("editFormMessage");
const selectedRecipeMeta = document.getElementById("selectedRecipeMeta");
const dietaryGroup = document.getElementById("editDietaryOptions");
const allergyGroup = document.getElementById("editAllergyOptions");
const staticSignOutLink = document.getElementById("staticSignOutLink");

let currentRecipeId = null;
let currentRecipes = [];
let currentRecipeData = null;
let dietaryNameById = new Map();
let allergyNameById = new Map();

if (!userEmail) {
    window.location.replace("/signin");
}

if (staticSignOutLink) {
    staticSignOutLink.addEventListener("click", (event) => {
        event.preventDefault();
        localStorage.removeItem("userEmail");
        window.location.href = "/";
    });
}

function setMessage(target, text, type) {
    target.textContent = text;
    target.classList.remove("is-error", "is-success");
    if (type) {
        target.classList.add(type);
    }
}

function setEditMessage(text, type) {
    setMessage(editMessage, text, type);
}

function setViewMessage(text, type) {
    setMessage(viewRecipeMessage, text, type);
}

function clearMessages() {
    setEditMessage("", null);
    setViewMessage("", null);
}

function formatDate(rawDate) {
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) {
        return "Unknown";
    }
    return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

function formatDifficulty(level) {
    const labels = {
        1: "Very Easy",
        2: "Easy",
        3: "Medium",
        4: "Hard",
        5: "Very Hard"
    };
    return labels[level] || "Unknown";
}

function formatCost(level) {
    const normalized = Number(level);
    if (!Number.isInteger(normalized) || normalized < 1 || normalized > 5) {
        return "Unknown";
    }
    return "$".repeat(normalized);
}

function formatDuration(totalMinutes) {
    const minutes = Number(totalMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) {
        return "0 min";
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0 && remainingMinutes > 0) {
        return `${hours}h ${remainingMinutes} min`;
    }
    if (hours > 0) {
        return `${hours}h`;
    }
    return `${remainingMinutes} min`;
}

function toMinutes(value, unit) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) {
        return 0;
    }
    if (unit === "hours") {
        return Math.round(amount * 60);
    }
    return Math.round(amount);
}

function applyDurationInputMode(valueInput, unitSelect) {
    const isHours = unitSelect.value === "hours";
    valueInput.step = isHours ? "0.25" : "1";
    valueInput.max = isHours ? "24" : "1440";
}

function bindDurationInputMode(valueInputId, unitSelectId) {
    const valueInput = document.getElementById(valueInputId);
    const unitSelect = document.getElementById(unitSelectId);
    if (!valueInput || !unitSelect) {
        return;
    }

    applyDurationInputMode(valueInput, unitSelect);
    unitSelect.addEventListener("change", () => {
        applyDurationInputMode(valueInput, unitSelect);
    });
}

function setDurationFields(totalMinutes, valueInputId, unitSelectId) {
    const minutes = Number(totalMinutes) || 0;
    const valueInput = document.getElementById(valueInputId);
    const unitSelect = document.getElementById(unitSelectId);

    if (!valueInput || !unitSelect) {
        return;
    }

    if (minutes >= 60 && minutes % 60 === 0) {
        valueInput.value = String(minutes / 60);
        unitSelect.value = "hours";
    } else {
        valueInput.value = String(minutes);
        unitSelect.value = "minutes";
    }

    applyDurationInputMode(valueInput, unitSelect);
}

function updateRecipeSelectionUI() {
    const buttons = Array.from(recipeList.querySelectorAll(".recipe-item"));
    buttons.forEach((button) => {
        const recipeId = Number(button.dataset.recipeId);
        button.classList.toggle("is-selected", recipeId === currentRecipeId);
    });
}

function showEmptyState(text) {
    recipeEmptyState.hidden = false;
    recipeViewCard.hidden = true;
    recipeEditCard.hidden = true;
    emptyStateSubtitle.textContent = text;
    clearMessages();
}

function showRecipeView() {
    recipeEmptyState.hidden = true;
    recipeViewCard.hidden = false;
    recipeEditCard.hidden = true;
}

function showRecipeEdit() {
    recipeEmptyState.hidden = true;
    recipeViewCard.hidden = true;
    recipeEditCard.hidden = false;
}

function renderTagRow(container, names, emptyText, tagVariantClass = "") {
    container.innerHTML = "";

    if (names.length === 0) {
        const emptyTag = document.createElement("span");
        emptyTag.className = "tag-empty";
        emptyTag.textContent = emptyText;
        container.appendChild(emptyTag);
        return;
    }

    names.forEach((name) => {
        const tag = document.createElement("span");
        tag.className = `recipe-tag ${tagVariantClass}`.trim();
        tag.textContent = name;
        container.appendChild(tag);
    });
}

function mapIdsToNames(ids, optionMap) {
    return ids
        .map((id) => optionMap.get(Number(id)))
        .filter((name) => Boolean(name));
}

function populateRecipeView(recipe) {
    viewRecipeTitle.textContent = recipe.title || "Untitled Recipe";
    viewRecipeCuisineSubheading.textContent = recipe.cuisine || "Cuisine not set";
    viewRecipeServings.textContent = `Serves ${recipe.servings || 1}`;
    const publisher = recipe.authorName || "Unknown";
    viewRecipePublished.textContent = "";
    viewRecipePublished.appendChild(document.createTextNode("Published by "));
    const publisherName = document.createElement("strong");
    publisherName.textContent = publisher;
    viewRecipePublished.appendChild(publisherName);
    viewRecipeUpdated.textContent = `Updated ${formatDate(recipe.updatedAt)}`;
    viewRecipeTime.textContent = formatDuration(recipe.preparationTimeMinutes);
    viewRecipeCookingTime.textContent = formatDuration(recipe.cookingTimeMinutes);
    viewRecipeSteps.textContent = `${recipe.preparationSteps || 0} steps`;
    viewRecipeDifficulty.textContent = formatDifficulty(recipe.difficulty);
    viewRecipeCost.textContent = formatCost(recipe.costLevel);
    viewRecipeIngredients.textContent = recipe.ingredients || "";
    viewRecipeInstructions.textContent = recipe.instructions || "";

    const dietNames = mapIdsToNames(recipe.dietaryOptionIds || [], dietaryNameById);
    const allergyNames = mapIdsToNames(recipe.allergyOptionIds || [], allergyNameById);
    renderTagRow(viewRecipeDiets, dietNames, "No dietary tags", "recipe-tag-dietary");
    renderTagRow(viewRecipeAllergies, allergyNames, "No allergy tags");
}

function populateRecipeEdit(recipe) {
    selectedRecipeMeta.textContent = `Editing: ${recipe.title}`;
    document.getElementById("editTitle").value = recipe.title || "";
    document.getElementById("editIngredients").value = recipe.ingredients || "";
    document.getElementById("editInstructions").value = recipe.instructions || "";
    setDurationFields(recipe.preparationTimeMinutes, "editPreparationTimeValue", "editPreparationTimeUnit");
    setDurationFields(recipe.cookingTimeMinutes, "editCookingTimeValue", "editCookingTimeUnit");
    document.getElementById("editPreparationSteps").value = recipe.preparationSteps || "";
    document.getElementById("editDifficulty").value = String(recipe.difficulty || 3);
    document.getElementById("editCostLevel").value = String(recipe.costLevel || 3);
    document.getElementById("editServings").value = recipe.servings || "";
    document.getElementById("editCuisine").value = recipe.cuisine || "";

    setSelectedOptions(dietaryGroup, recipe.dietaryOptionIds || []);
    setSelectedOptions(allergyGroup, recipe.allergyOptionIds || []);
}

function createRecipeCard(recipe) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "recipe-item";
    button.dataset.recipeId = String(recipe.id);

    const title = document.createElement("strong");
    title.textContent = recipe.title;

    const cuisine = document.createElement("span");
    cuisine.className = "recipe-item-cuisine";
    cuisine.textContent = recipe.cuisine || "Cuisine not set";

    const updated = document.createElement("small");
    updated.textContent = `Updated ${formatDate(recipe.updatedAt)}`;

    button.appendChild(title);
    button.appendChild(cuisine);
    button.appendChild(updated);

    button.addEventListener("click", () => {
        selectRecipe(recipe.id);
    });

    return button;
}

function populateOptions(groupEl, options, inputName) {
    groupEl.innerHTML = "";
    options.forEach((option) => {
        const label = document.createElement("label");
        label.className = "checkbox-item";

        const input = document.createElement("input");
        input.type = "checkbox";
        input.name = inputName;
        input.value = String(option.id);

        const text = document.createElement("span");
        text.textContent = option.name;

        label.appendChild(input);
        label.appendChild(text);
        groupEl.appendChild(label);
    });
}

function setSelectedOptions(groupEl, selectedIds) {
    const selectedSet = new Set(selectedIds.map(String));
    Array.from(groupEl.querySelectorAll("input[type='checkbox']")).forEach((input) => {
        input.checked = selectedSet.has(input.value);
    });
}

function getSelectedIds(groupEl) {
    return Array.from(groupEl.querySelectorAll("input[type='checkbox']:checked")).map((input) =>
        Number(input.value)
    );
}

async function loadOptions() {
    const response = await fetch("/api/preferences");
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || "Unable to load options.");
    }

    dietaryNameById = new Map((data.dietaryOptions || []).map((option) => [Number(option.id), option.name]));
    allergyNameById = new Map((data.allergyOptions || []).map((option) => [Number(option.id), option.name]));

    populateOptions(dietaryGroup, data.dietaryOptions || [], "editDietaryOptions");
    populateOptions(allergyGroup, data.allergyOptions || [], "editAllergyOptions");
}

async function loadRecipeList() {
    const response = await fetch(`/api/recipes?email=${encodeURIComponent(userEmail)}`);
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || "Unable to load recipes.");
    }

    currentRecipes = data.recipes || [];
    recipeList.innerHTML = "";

    if (currentRecipes.length === 0) {
        currentRecipeId = null;
        currentRecipeData = null;
        recipeList.innerHTML = '<p class="empty-state">No recipes yet. Create your first recipe.</p>';
        showEmptyState("You have not published any recipes yet. Click New Recipe to publish your first post.");
        return;
    }

    currentRecipes.forEach((recipe) => {
        recipeList.appendChild(createRecipeCard(recipe));
    });

    updateRecipeSelectionUI();
}

async function selectRecipe(recipeId) {
    currentRecipeId = recipeId;
    updateRecipeSelectionUI();
    clearMessages();

    try {
        const response = await fetch(`/api/recipes/${recipeId}?email=${encodeURIComponent(userEmail)}`);
        const data = await response.json();
        if (!response.ok) {
            showEmptyState("Unable to load this recipe right now.");
            setViewMessage(data.error || "Unable to load recipe.", "is-error");
            return;
        }

        currentRecipeData = data;
        populateRecipeView(data);
        populateRecipeEdit(data);
        showRecipeView();
    } catch (error) {
        showEmptyState("Unable to load this recipe right now.");
        setViewMessage("Network error. Please try again.", "is-error");
    }
}

editRecipeButton.addEventListener("click", () => {
    if (!currentRecipeData) {
        return;
    }
    setEditMessage("", null);
    showRecipeEdit();
});

cancelEditButton.addEventListener("click", () => {
    if (!currentRecipeData) {
        showEmptyState("Choose one of your published recipes to open its post view.");
        return;
    }
    setEditMessage("", null);
    showRecipeView();
});

deleteRecipeButton.addEventListener("click", async () => {
    if (!currentRecipeId || !currentRecipeData) {
        return;
    }

    const confirmed = window.confirm(
        `Delete "${currentRecipeData.title}"?\n\nThis will permanently remove the recipe and its tags.`
    );
    if (!confirmed) {
        return;
    }

    setViewMessage("Deleting recipe...", null);
    try {
        const response = await fetch(
            `/api/recipes/${currentRecipeId}?email=${encodeURIComponent(userEmail)}`,
            { method: "DELETE" }
        );
        const data = await response.json();
        if (!response.ok) {
            setViewMessage(data.error || "Unable to delete recipe.", "is-error");
            return;
        }

        await loadRecipeList();
        if (currentRecipes.length > 0) {
            await selectRecipe(currentRecipes[0].id);
            setViewMessage("Recipe deleted successfully.", "is-success");
        } else {
            showEmptyState("Recipe deleted. You have no published recipes.");
        }
    } catch (error) {
        setViewMessage("Network error. Please try again.", "is-error");
    }
});

recipeEditForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentRecipeId) {
        setEditMessage("Select a recipe to edit first.", "is-error");
        return;
    }

    const payload = {
        editorEmail: userEmail,
        title: document.getElementById("editTitle").value.trim(),
        ingredients: document.getElementById("editIngredients").value.trim(),
        instructions: document.getElementById("editInstructions").value.trim(),
        preparationTimeMinutes: toMinutes(
            document.getElementById("editPreparationTimeValue").value,
            document.getElementById("editPreparationTimeUnit").value
        ),
        cookingTimeMinutes: toMinutes(
            document.getElementById("editCookingTimeValue").value,
            document.getElementById("editCookingTimeUnit").value
        ),
        preparationSteps: Number(document.getElementById("editPreparationSteps").value),
        difficulty: Number(document.getElementById("editDifficulty").value),
        costLevel: Number(document.getElementById("editCostLevel").value),
        servings: Number(document.getElementById("editServings").value),
        cuisine: document.getElementById("editCuisine").value.trim(),
        dietaryOptionIds: getSelectedIds(dietaryGroup),
        allergyOptionIds: getSelectedIds(allergyGroup)
    };

    if (
        !payload.title ||
        !payload.ingredients ||
        !payload.instructions ||
        !payload.cuisine ||
        !payload.preparationTimeMinutes ||
        !payload.cookingTimeMinutes ||
        !payload.preparationSteps ||
        !payload.servings
    ) {
        setEditMessage("Please complete all required fields.", "is-error");
        return;
    }

    setEditMessage("Saving recipe...", null);

    try {
        const response = await fetch(`/api/recipes/${currentRecipeId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) {
            setEditMessage(data.error || "Unable to save recipe.", "is-error");
            return;
        }

        await loadRecipeList();
        const stillExists = currentRecipes.some((recipe) => recipe.id === currentRecipeId);
        const targetId = stillExists ? currentRecipeId : currentRecipes[0].id;
        await selectRecipe(targetId);
        setViewMessage("Recipe updated successfully.", "is-success");
    } catch (error) {
        setEditMessage("Network error. Please try again.", "is-error");
    }
});

(async function init() {
    if (!userEmail) {
        return;
    }

    try {
        bindDurationInputMode("editPreparationTimeValue", "editPreparationTimeUnit");
        bindDurationInputMode("editCookingTimeValue", "editCookingTimeUnit");
        await loadOptions();
        await loadRecipeList();

        if (currentRecipes.length > 0) {
            await selectRecipe(currentRecipes[0].id);
        }
    } catch (error) {
        recipeList.innerHTML = '<p class="empty-state">Unable to load recipes right now.</p>';
        showEmptyState(error.message || "Unable to load page.");
    }
})();
