const userEmail = localStorage.getItem("userEmail");
const browseRecipeList = document.getElementById("browseRecipeList");
const browseStatus = document.getElementById("browseStatus");
const staticSignOutLink = document.getElementById("staticSignOutLink");

const browseFilterForm = document.getElementById("browseFilterForm");
const browseSearchInput = document.getElementById("browseSearchInput");
const filterPrepMaxInput = document.getElementById("filterPrepMax");
const filterCookMaxInput = document.getElementById("filterCookMax");
const filterServingsMinInput = document.getElementById("filterServingsMin");
const filterDifficultySelect = document.getElementById("filterDifficulty");
const filterCostSelect = document.getElementById("filterCost");
const browseDietaryFilters = document.getElementById("browseDietaryFilters");
const browseAllergyFilters = document.getElementById("browseAllergyFilters");
const clearBrowseFiltersButton = document.getElementById("clearBrowseFilters");

const detailCache = new Map();
let allBrowseRecipes = [];
let hasLoadedRecipes = false;

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

function normalizeFilterText(value) {
    return (value || "").toString().trim().toLowerCase();
}

function parseOptionalNumber(value) {
    const trimmed = (value || "").toString().trim();
    if (!trimmed) {
        return null;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return null;
    }
    return parsed;
}

function collectCheckedValues(container) {
    if (!container) {
        return [];
    }
    return Array.from(container.querySelectorAll("input[type='checkbox']:checked")).map((input) =>
        normalizeFilterText(input.value)
    );
}

function includesAllValues(sourceValues, requiredValues) {
    const sourceSet = new Set((sourceValues || []).map((value) => normalizeFilterText(value)));
    return requiredValues.every((value) => sourceSet.has(value));
}

function buildDietaryPreviewPills(options) {
    const row = document.createElement("div");
    row.className = "browse-dietary-meta";

    if (!options || options.length === 0) {
        const pill = document.createElement("span");
        pill.className = "browse-pill browse-pill-dietary browse-pill-dietary-empty";
        pill.textContent = "No dietary tags";
        row.appendChild(pill);
        return row;
    }

    options.forEach((option) => {
        const pill = document.createElement("span");
        pill.className = "browse-pill browse-pill-dietary";
        pill.textContent = option;
        row.appendChild(pill);
    });

    return row;
}

function renderTagRow(container, values, emptyText, tagVariantClass = "") {
    container.innerHTML = "";

    if (!values || values.length === 0) {
        const empty = document.createElement("span");
        empty.className = "tag-empty";
        empty.textContent = emptyText;
        container.appendChild(empty);
        return;
    }

    values.forEach((value) => {
        const tag = document.createElement("span");
        tag.className = `recipe-tag ${tagVariantClass}`.trim();
        tag.textContent = value;
        container.appendChild(tag);
    });
}

function setFilterGroupUnavailable(container, text) {
    if (!container) {
        return;
    }
    container.innerHTML = "";
    const note = document.createElement("p");
    note.className = "browse-filter-empty";
    note.textContent = text;
    container.appendChild(note);
}

function renderFilterOptions(container, options, inputName, idPrefix) {
    if (!container) {
        return;
    }

    container.innerHTML = "";
    if (!Array.isArray(options) || options.length === 0) {
        setFilterGroupUnavailable(container, "No options available.");
        return;
    }

    options.forEach((option, index) => {
        const label = document.createElement("label");
        label.className = "checkbox-item";

        const input = document.createElement("input");
        input.type = "checkbox";
        input.name = inputName;
        input.value = option.name;
        input.id = `${idPrefix}-${index}`;

        const text = document.createElement("span");
        text.textContent = option.name;

        label.htmlFor = input.id;
        label.appendChild(input);
        label.appendChild(text);
        container.appendChild(label);
    });
}

async function loadFilterOptions() {
    if (!browseDietaryFilters || !browseAllergyFilters) {
        return;
    }

    try {
        const response = await fetch("/api/preferences");
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Unable to load filter options.");
        }

        renderFilterOptions(
            browseDietaryFilters,
            data.dietaryOptions || [],
            "browseDietaryFilter",
            "browse-dietary"
        );
        renderFilterOptions(
            browseAllergyFilters,
            data.allergyOptions || [],
            "browseAllergyFilter",
            "browse-allergy"
        );
    } catch (error) {
        setFilterGroupUnavailable(browseDietaryFilters, "Unable to load dietary options.");
        setFilterGroupUnavailable(browseAllergyFilters, "Unable to load allergy options.");
    }
}

function getActiveFilters() {
    return {
        searchText: normalizeFilterText(browseSearchInput && browseSearchInput.value),
        prepTimeMax: parseOptionalNumber(filterPrepMaxInput && filterPrepMaxInput.value),
        cookTimeMax: parseOptionalNumber(filterCookMaxInput && filterCookMaxInput.value),
        servingsMin: parseOptionalNumber(filterServingsMinInput && filterServingsMinInput.value),
        difficulty: parseOptionalNumber(filterDifficultySelect && filterDifficultySelect.value),
        costLevel: parseOptionalNumber(filterCostSelect && filterCostSelect.value),
        dietaryValues: collectCheckedValues(browseDietaryFilters),
        allergyValues: collectCheckedValues(browseAllergyFilters)
    };
}

function hasAnyFilters(filters) {
    return Boolean(
        filters.searchText ||
            filters.prepTimeMax !== null ||
            filters.cookTimeMax !== null ||
            filters.servingsMin !== null ||
            filters.difficulty !== null ||
            filters.costLevel !== null ||
            filters.dietaryValues.length > 0 ||
            filters.allergyValues.length > 0
    );
}

function recipeMatchesFilters(recipe, filters) {
    if (filters.searchText) {
        const searchCorpus = normalizeFilterText(
            `${recipe.title || ""} ${recipe.cuisine || ""} ${recipe.authorName || ""} ${recipe.authorEmail || ""}`
        );
        if (!searchCorpus.includes(filters.searchText)) {
            return false;
        }
    }

    if (
        filters.prepTimeMax !== null &&
        Number(recipe.preparationTimeMinutes || 0) > filters.prepTimeMax
    ) {
        return false;
    }

    if (
        filters.cookTimeMax !== null &&
        Number(recipe.cookingTimeMinutes || 0) > filters.cookTimeMax
    ) {
        return false;
    }

    if (filters.servingsMin !== null && Number(recipe.servings || 0) < filters.servingsMin) {
        return false;
    }

    if (filters.difficulty !== null && Number(recipe.difficulty || 0) !== filters.difficulty) {
        return false;
    }

    if (filters.costLevel !== null && Number(recipe.costLevel || 0) !== filters.costLevel) {
        return false;
    }

    if (
        filters.dietaryValues.length > 0 &&
        !includesAllValues(recipe.dietaryOptions || [], filters.dietaryValues)
    ) {
        return false;
    }

    if (
        filters.allergyValues.length > 0 &&
        !includesAllValues(recipe.allergyOptions || [], filters.allergyValues)
    ) {
        return false;
    }

    return true;
}

function collapseCard(card) {
    card.classList.remove("is-selected", "is-expanded");
    const expanded = card.querySelector(".browse-expanded");
    if (expanded) {
        expanded.remove();
    }
}

function collapseOtherCards(currentCard) {
    const cards = Array.from(browseRecipeList.querySelectorAll(".browse-card"));
    cards.forEach((card) => {
        if (card !== currentCard) {
            collapseCard(card);
        }
    });
}

function buildExpandedSection(detail) {
    const expanded = document.createElement("section");
    expanded.className = "browse-expanded";

    const postCard = document.createElement("article");
    postCard.className = "recipe-post-card";

    const header = document.createElement("header");
    header.className = "recipe-post-header";

    const titleRow = document.createElement("div");
    titleRow.className = "recipe-title-row";

    const titleWrap = document.createElement("div");

    const title = document.createElement("h2");
    title.textContent = detail.title || "Untitled Recipe";

    const cuisine = document.createElement("p");
    cuisine.className = "recipe-cuisine-subheading";
    cuisine.textContent = detail.cuisine || "Cuisine not set";

    titleWrap.appendChild(title);
    titleWrap.appendChild(cuisine);

    const serves = document.createElement("div");
    serves.className = "servings-badge";
    serves.textContent = `Serves ${detail.servings || 1}`;

    titleRow.appendChild(titleWrap);
    titleRow.appendChild(serves);

    const subtitle = document.createElement("p");
    subtitle.className = "form-subtitle";
    subtitle.appendChild(document.createTextNode("Published by "));
    const expandedPublisher = document.createElement("strong");
    expandedPublisher.textContent = detail.authorName || detail.authorEmail || "Unknown";
    subtitle.appendChild(expandedPublisher);

    header.appendChild(titleRow);
    header.appendChild(subtitle);

    const metadata = document.createElement("section");
    metadata.className = "recipe-metadata";

    const metadataItems = [
        ["Prep Time", formatDuration(detail.preparationTimeMinutes)],
        ["Cooking Time", formatDuration(detail.cookingTimeMinutes)],
        ["Prep Steps", `${detail.preparationSteps || 0} steps`],
        ["Difficulty", formatDifficulty(detail.difficulty)],
        ["Cost", formatCost(detail.costLevel)]
    ];

    metadataItems.forEach(([label, value]) => {
        const pill = document.createElement("div");
        pill.className = "meta-pill";

        const labelEl = document.createElement("span");
        labelEl.textContent = label;

        const valueEl = document.createElement("strong");
        valueEl.textContent = value;

        pill.appendChild(labelEl);
        pill.appendChild(valueEl);
        metadata.appendChild(pill);
    });

    const ingredientsSection = document.createElement("section");
    ingredientsSection.className = "post-section";
    const ingredientsTitle = document.createElement("h3");
    ingredientsTitle.textContent = "Ingredients";
    const ingredientsBody = document.createElement("p");
    ingredientsBody.className = "post-content";
    ingredientsBody.textContent = detail.ingredients || "";
    ingredientsSection.appendChild(ingredientsTitle);
    ingredientsSection.appendChild(ingredientsBody);

    const instructionsSection = document.createElement("section");
    instructionsSection.className = "post-section";
    const instructionsTitle = document.createElement("h3");
    instructionsTitle.textContent = "Instructions";
    const instructionsBody = document.createElement("p");
    instructionsBody.className = "post-content";
    instructionsBody.textContent = detail.instructions || "";
    instructionsSection.appendChild(instructionsTitle);
    instructionsSection.appendChild(instructionsBody);

    const dietarySection = document.createElement("section");
    dietarySection.className = "post-section";
    const dietaryTitle = document.createElement("h3");
    dietaryTitle.textContent = "Dietary Preferences";
    const dietaryTags = document.createElement("div");
    dietaryTags.className = "tag-row";
    renderTagRow(dietaryTags, detail.dietaryOptions || [], "No dietary tags", "recipe-tag-dietary");
    dietarySection.appendChild(dietaryTitle);
    dietarySection.appendChild(dietaryTags);

    const allergySection = document.createElement("section");
    allergySection.className = "post-section";
    const allergyTitle = document.createElement("h3");
    allergyTitle.textContent = "Allergies";
    const allergyTags = document.createElement("div");
    allergyTags.className = "tag-row";
    renderTagRow(allergyTags, detail.allergyOptions || [], "No allergy tags");
    allergySection.appendChild(allergyTitle);
    allergySection.appendChild(allergyTags);

    const updatedRow = document.createElement("div");
    updatedRow.className = "browse-expanded-updated-row";

    const updated = document.createElement("p");
    updated.className = "browse-expanded-updated";
    updated.textContent = `Updated ${formatDate(detail.updatedAt)}`;
    updatedRow.appendChild(updated);

    postCard.appendChild(header);
    postCard.appendChild(metadata);
    postCard.appendChild(ingredientsSection);
    postCard.appendChild(instructionsSection);
    postCard.appendChild(dietarySection);
    postCard.appendChild(allergySection);
    postCard.appendChild(updatedRow);
    expanded.appendChild(postCard);

    return expanded;
}

function createBrowseCard(recipe) {
    const card = document.createElement("article");
    card.className = "browse-card";
    card.dataset.recipeId = String(recipe.id);

    const preview = document.createElement("div");
    preview.className = "browse-preview";

    const header = document.createElement("div");
    header.className = "browse-card-header";

    const titleWrap = document.createElement("div");

    const title = document.createElement("h2");
    title.textContent = recipe.title;
    titleWrap.appendChild(title);

    const cuisineExpanded = document.createElement("p");
    cuisineExpanded.className = "browse-cuisine browse-cuisine-expanded";
    cuisineExpanded.textContent = recipe.cuisine || "Cuisine not set";
    titleWrap.appendChild(cuisineExpanded);

    const serves = document.createElement("span");
    serves.className = "browse-servings";
    serves.textContent = `Serves ${recipe.servings}`;

    header.appendChild(titleWrap);
    header.appendChild(serves);

    const author = document.createElement("p");
    author.className = "browse-author";
    author.appendChild(document.createTextNode("Published by "));
    const previewPublisher = document.createElement("strong");
    previewPublisher.textContent = recipe.authorName || recipe.authorEmail || "Unknown";
    author.appendChild(previewPublisher);

    const meta = document.createElement("div");
    meta.className = "browse-meta";

    const metaItems = [
        `Prep ${formatDuration(recipe.preparationTimeMinutes)}`,
        `Cook ${formatDuration(recipe.cookingTimeMinutes)}`,
        `${formatDifficulty(recipe.difficulty)} Difficulty`,
        formatCost(recipe.costLevel)
    ];

    metaItems.forEach((text) => {
        const pill = document.createElement("span");
        pill.className = "browse-pill";
        pill.textContent = text;
        meta.appendChild(pill);
    });

    const updated = document.createElement("p");
    updated.className = "browse-updated";
    updated.textContent = `Updated ${formatDate(recipe.updatedAt)}`;

    const dietaryPreviewRow = buildDietaryPreviewPills(recipe.dietaryOptions || []);

    preview.appendChild(header);
    preview.appendChild(author);
    preview.appendChild(updated);
    preview.appendChild(meta);
    preview.appendChild(dietaryPreviewRow);
    card.appendChild(preview);

    card.addEventListener("click", async () => {
        const isExpanded = card.classList.contains("is-expanded");
        if (isExpanded) {
            collapseCard(card);
            return;
        }

        collapseOtherCards(card);
        card.classList.add("is-selected", "is-expanded");

        const cached = detailCache.get(recipe.id);
        if (cached) {
            card.appendChild(buildExpandedSection(cached));
            return;
        }

        try {
            const response = await fetch(
                `/api/recipes/browse/${recipe.id}?email=${encodeURIComponent(userEmail)}`
            );
            const data = await response.json();

            if (!response.ok) {
                browseStatus.textContent = data.error || "Unable to load selected recipe.";
                browseStatus.classList.add("is-error");
                collapseCard(card);
                return;
            }

            browseStatus.classList.remove("is-error");
            detailCache.set(recipe.id, data);
            card.appendChild(buildExpandedSection(data));
        } catch (error) {
            browseStatus.textContent = "Network error while loading selected recipe.";
            browseStatus.classList.add("is-error");
            collapseCard(card);
        }
    });

    return card;
}

function renderBrowseRecipeList(recipes, hasActiveFilters) {
    browseRecipeList.innerHTML = "";

    if (!Array.isArray(recipes) || recipes.length === 0) {
        const emptyText = hasActiveFilters
            ? "No recipes match your current filters."
            : "No recipes are available in the database right now.";
        browseRecipeList.innerHTML = `<p class="empty-state">${emptyText}</p>`;
        return;
    }

    recipes.forEach((recipe) => {
        browseRecipeList.appendChild(createBrowseCard(recipe));
    });
}

function updateBrowseStatus(filteredCount, totalCount, hasActiveFilters) {
    browseStatus.classList.remove("is-error");

    if (totalCount === 0) {
        browseStatus.textContent = "No published recipes yet.";
        return;
    }

    if (filteredCount === 0 && hasActiveFilters) {
        browseStatus.textContent = "No recipes match your current filters.";
        return;
    }

    if (!hasActiveFilters) {
        browseStatus.textContent = `${totalCount} recipe${totalCount === 1 ? "" : "s"} available`;
        return;
    }

    browseStatus.textContent =
        `${filteredCount} of ${totalCount} recipe${totalCount === 1 ? "" : "s"} match filters`;
}

function applyFiltersAndRender() {
    if (!hasLoadedRecipes) {
        return;
    }

    const filters = getActiveFilters();
    const hasActiveFilters = hasAnyFilters(filters);
    const filteredRecipes = allBrowseRecipes.filter((recipe) => recipeMatchesFilters(recipe, filters));

    renderBrowseRecipeList(filteredRecipes, hasActiveFilters);
    updateBrowseStatus(filteredRecipes.length, allBrowseRecipes.length, hasActiveFilters);
}

function bindFilterEvents() {
    if (!browseFilterForm) {
        return;
    }

    browseFilterForm.addEventListener("submit", (event) => {
        event.preventDefault();
    });

    browseFilterForm.addEventListener("input", () => {
        applyFiltersAndRender();
    });

    browseFilterForm.addEventListener("change", () => {
        applyFiltersAndRender();
    });

    if (clearBrowseFiltersButton) {
        clearBrowseFiltersButton.addEventListener("click", () => {
            browseFilterForm.reset();
            Array.from(browseFilterForm.querySelectorAll("input[type='checkbox']")).forEach((checkbox) => {
                checkbox.checked = false;
            });
            applyFiltersAndRender();
        });
    }
}

async function loadBrowseRecipes() {
    const response = await fetch(`/api/recipes/browse?email=${encodeURIComponent(userEmail)}`);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Unable to load recipes.");
    }

    allBrowseRecipes = data.recipes || [];
    hasLoadedRecipes = true;
}

async function initBrowse() {
    bindFilterEvents();
    await loadFilterOptions();
    await loadBrowseRecipes();
    applyFiltersAndRender();
}

initBrowse().catch((error) => {
    hasLoadedRecipes = false;
    browseStatus.textContent = error.message || "Network error. Please try again.";
    browseStatus.classList.add("is-error");
    browseRecipeList.innerHTML = '<p class="empty-state">Unable to load recipes right now.</p>';
});
