const authSession = window.authSession;
const userEmail = authSession ? authSession.getUserEmail() : localStorage.getItem("userEmail");

const plannerForm = document.getElementById("plannerForm");
const plannerWeekDateInput = document.getElementById("plannerWeekDate");
const plannerDayOfWeekSelect = document.getElementById("plannerDayOfWeek");
const plannerMealTypeSelect = document.getElementById("plannerMealType");
const plannerRecipeIdSelect = document.getElementById("plannerRecipeId");
const plannerFormMessage = document.getElementById("plannerFormMessage");
const plannerGridMessage = document.getElementById("plannerGridMessage");
const plannerWeekEyebrow = document.getElementById("plannerWeekEyebrow");
const plannerWeekLabel = document.getElementById("plannerWeekLabel");
const plannerPrevWeekButton = document.getElementById("plannerPrevWeekButton");
const plannerNextWeekButton = document.getElementById("plannerNextWeekButton");
const plannerWeekGrid = document.getElementById("plannerWeekGrid");

const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const mealTypeOptions = [
    { value: "breakfast", label: "Breakfast" },
    { value: "lunch", label: "Lunch" },
    { value: "dinner", label: "Dinner" },
    { value: "snack", label: "Snack" }
];

let recipes = [];
let currentWeekStart = getWeekStart(getTodayUtcDate());
let entriesBySlot = new Map();

if (!userEmail) {
    window.location.replace("/signin");
}

function setMessage(target, text, type) {
    target.textContent = text;
    target.classList.remove("is-error", "is-success");
    if (type) {
        target.classList.add(type);
    }
}

function setFormMessage(text, type) {
    setMessage(plannerFormMessage, text, type);
}

function setGridMessage(text, type) {
    setMessage(plannerGridMessage, text, type);
}

function getTodayUtcDate() {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function parseIsoDate(rawValue) {
    const value = (rawValue || "").toString().trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
        return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day));

    if (
        parsed.getUTCFullYear() !== year ||
        parsed.getUTCMonth() !== month - 1 ||
        parsed.getUTCDate() !== day
    ) {
        return null;
    }
    return parsed;
}

function toIsoDate(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getWeekStart(date) {
    const start = new Date(date.getTime());
    const weekDay = start.getUTCDay();
    const offsetToMonday = weekDay === 0 ? -6 : 1 - weekDay;
    start.setUTCDate(start.getUTCDate() + offsetToMonday);
    return start;
}

function addDays(date, days) {
    const nextDate = new Date(date.getTime());
    nextDate.setUTCDate(nextDate.getUTCDate() + days);
    return nextDate;
}

function formatDateLabel(date) {
    return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC"
    });
}

function formatMealTypeLabel(mealType) {
    const found = mealTypeOptions.find((item) => item.value === mealType);
    return found ? found.label : mealType;
}

function getSlotKey(dayOfWeek, mealType) {
    return `${dayOfWeek}:${mealType}`;
}

function clearActiveMealCards(exceptCard = null) {
    const cards = Array.from(plannerWeekGrid.querySelectorAll(".planner-day-meal.is-active"));
    cards.forEach((card) => {
        if (card !== exceptCard) {
            card.classList.remove("is-active");
        }
    });
}

function entriesForDay(dayOfWeek) {
    return mealTypeOptions
        .map((mealTypeOption) => entriesBySlot.get(getSlotKey(dayOfWeek, mealTypeOption.value)) || null)
        .filter((entry) => Boolean(entry));
}

async function readJson(response) {
    try {
        return await response.json();
    } catch (error) {
        return {};
    }
}

function renderRecipeOptions() {
    plannerRecipeIdSelect.innerHTML = "";

    if (!Array.isArray(recipes) || recipes.length === 0) {
        const emptyOption = document.createElement("option");
        emptyOption.value = "";
        emptyOption.textContent = "No recipes available";
        plannerRecipeIdSelect.appendChild(emptyOption);
        plannerRecipeIdSelect.disabled = true;
        return;
    }

    plannerRecipeIdSelect.disabled = false;
    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.textContent = "Select a recipe";
    plannerRecipeIdSelect.appendChild(placeholderOption);

    recipes.forEach((recipe) => {
        const option = document.createElement("option");
        option.value = String(recipe.id);
        const author = recipe.authorName || recipe.authorEmail || "Unknown";
        option.textContent = `${recipe.title} - ${author}`;
        plannerRecipeIdSelect.appendChild(option);
    });
}

function updateWeekHeading() {
    const weekEnd = addDays(currentWeekStart, 6);
    plannerWeekDateInput.value = toIsoDate(currentWeekStart);
    plannerWeekLabel.textContent = `${formatDateLabel(currentWeekStart)} - ${formatDateLabel(weekEnd)}`;

    const todayWeekStart = getWeekStart(getTodayUtcDate());
    const isCurrentWeek = toIsoDate(currentWeekStart) === toIsoDate(todayWeekStart);
    if (plannerWeekEyebrow) {
        plannerWeekEyebrow.hidden = !isCurrentWeek;
    }
}

function createDayCard(dayOfWeek) {
    const dayCard = document.createElement("article");
    dayCard.className = "planner-day-card";

    const header = document.createElement("header");
    header.className = "planner-day-header";

    const title = document.createElement("h3");
    title.textContent = dayNames[dayOfWeek];

    const dateBadge = document.createElement("span");
    dateBadge.className = "planner-day-date";
    dateBadge.textContent = formatDateLabel(addDays(currentWeekStart, dayOfWeek));

    header.appendChild(title);
    header.appendChild(dateBadge);
    dayCard.appendChild(header);

    const dayEntries = entriesForDay(dayOfWeek);
    if (dayEntries.length === 0) {
        const emptyText = document.createElement("p");
        emptyText.className = "planner-day-empty";
        emptyText.textContent = "No planned meals for this day yet.";

        const planButton = document.createElement("button");
        planButton.type = "button";
        planButton.className = "action-btn action-btn-secondary planner-slot-action";
        planButton.dataset.action = "plan";
        planButton.dataset.dayOfWeek = String(dayOfWeek);
        planButton.dataset.mealType = "breakfast";
        planButton.textContent = "Plan Meal";

        dayCard.appendChild(emptyText);
        dayCard.appendChild(planButton);
        return dayCard;
    }

    const dayList = document.createElement("div");
    dayList.className = "planner-day-list";

    dayEntries.forEach((entry) => {
        const row = document.createElement("div");
        row.className = "planner-day-meal";
        row.tabIndex = 0;
        row.setAttribute("role", "button");
        row.setAttribute("aria-label", `${formatMealTypeLabel(entry.mealType)}: ${entry.recipe.title}`);

        const mealTypeTag = document.createElement("span");
        mealTypeTag.className = "planner-meal-type-tag";
        mealTypeTag.textContent = formatMealTypeLabel(entry.mealType);

        const recipeTitle = document.createElement("strong");
        recipeTitle.className = "planner-slot-title";
        recipeTitle.textContent = entry.recipe.title;

        const actions = document.createElement("div");
        actions.className = "planner-slot-actions";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "action-btn action-btn-secondary planner-slot-action";
        editButton.dataset.action = "edit";
        editButton.dataset.dayOfWeek = String(dayOfWeek);
        editButton.dataset.mealType = entry.mealType;
        editButton.dataset.recipeId = String(entry.recipe.id);
        editButton.textContent = "Edit";

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "action-btn action-btn-danger planner-slot-action";
        removeButton.dataset.action = "remove";
        removeButton.dataset.entryId = String(entry.id);
        removeButton.textContent = "Delete";

        actions.appendChild(editButton);
        actions.appendChild(removeButton);

        row.appendChild(mealTypeTag);
        row.appendChild(recipeTitle);
        row.appendChild(actions);
        dayList.appendChild(row);
    });

    const addAnotherButton = document.createElement("button");
    addAnotherButton.type = "button";
    addAnotherButton.className = "action-btn action-btn-secondary planner-slot-action";
    addAnotherButton.dataset.action = "plan";
    addAnotherButton.dataset.dayOfWeek = String(dayOfWeek);
    addAnotherButton.dataset.mealType = "lunch";
    addAnotherButton.textContent = "Add Meal";

    dayCard.appendChild(dayList);
    dayCard.appendChild(addAnotherButton);
    return dayCard;
}

function renderPlannerGrid() {
    plannerWeekGrid.innerHTML = "";
    dayNames.forEach((unusedName, dayOfWeek) => {
        plannerWeekGrid.appendChild(createDayCard(dayOfWeek));
    });
}

function setFormSlot(dayOfWeek, mealType, recipeId) {
    plannerDayOfWeekSelect.value = String(dayOfWeek);
    plannerMealTypeSelect.value = mealType;

    if (recipeId) {
        plannerRecipeIdSelect.value = String(recipeId);
    }

    plannerForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function loadRecipes() {
    const response = await fetch(`/api/recipes/browse?email=${encodeURIComponent(userEmail)}`);
    const data = await readJson(response);

    if (!response.ok) {
        throw new Error(data.error || "Unable to load recipes.");
    }

    recipes = (data.recipes || [])
        .slice()
        .sort((first, second) =>
            (first.title || "").localeCompare(second.title || "", undefined, { sensitivity: "base" })
        );
    renderRecipeOptions();
}

async function loadPlannerWeek() {
    const weekStartDate = toIsoDate(currentWeekStart);
    updateWeekHeading();
    setGridMessage("Loading weekly planner...", null);

    const response = await fetch(
        `/api/meal-planner/entries?email=${encodeURIComponent(userEmail)}&weekStartDate=${encodeURIComponent(weekStartDate)}`
    );
    const data = await readJson(response);

    if (!response.ok) {
        entriesBySlot = new Map();
        renderPlannerGrid();
        setGridMessage(data.error || "Unable to load planner entries.", "is-error");
        return;
    }

    entriesBySlot = new Map();
    (data.entries || []).forEach((entry) => {
        const slotKey = getSlotKey(Number(entry.dayOfWeek), entry.mealType);
        entriesBySlot.set(slotKey, entry);
    });

    renderPlannerGrid();
    if (entriesBySlot.size === 0) {
        setGridMessage("No meals planned for this week yet.", null);
    } else {
        setGridMessage("", null);
    }
}

plannerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const recipeId = Number(plannerRecipeIdSelect.value);
    if (!Number.isInteger(recipeId) || recipeId < 1) {
        setFormMessage("Select a recipe before saving.", "is-error");
        return;
    }

    const payload = {
        email: userEmail,
        weekStartDate: toIsoDate(currentWeekStart),
        dayOfWeek: Number(plannerDayOfWeekSelect.value),
        mealType: plannerMealTypeSelect.value,
        recipeId
    };

    setFormMessage("Saving meal...", null);
    const response = await fetch("/api/meal-planner/entries", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    const data = await readJson(response);

    if (!response.ok) {
        setFormMessage(data.error || "Unable to save meal.", "is-error");
        return;
    }

    setFormMessage(
        `Saved ${formatMealTypeLabel(payload.mealType).toLowerCase()} for ${dayNames[payload.dayOfWeek]}.`,
        "is-success"
    );
    await loadPlannerWeek();
});

plannerWeekGrid.addEventListener("click", async (event) => {
    const button = event.target.closest(".planner-slot-action");
    if (!button) {
        const mealCard = event.target.closest(".planner-day-meal");
        if (!mealCard) {
            return;
        }

        if (mealCard.classList.contains("is-active")) {
            mealCard.classList.remove("is-active");
        } else {
            clearActiveMealCards(mealCard);
            mealCard.classList.add("is-active");
        }
        return;
    }

    const action = button.dataset.action;
    if (action === "plan" || action === "edit") {
        const dayOfWeek = Number(button.dataset.dayOfWeek);
        const mealType = button.dataset.mealType;
        const recipeId = Number(button.dataset.recipeId);

        if (!Number.isInteger(dayOfWeek) || !mealType) {
            return;
        }

        setFormSlot(dayOfWeek, mealType, Number.isInteger(recipeId) && recipeId > 0 ? recipeId : null);
        if (action === "plan") {
            setFormMessage(
                `Choose a recipe to plan ${formatMealTypeLabel(mealType).toLowerCase()} for ${dayNames[dayOfWeek]}.`,
                null
            );
        } else {
            setFormMessage(
                `Editing ${formatMealTypeLabel(mealType).toLowerCase()} on ${dayNames[dayOfWeek]}.`,
                null
            );
        }
        return;
    }

    if (action === "remove") {
        const entryId = Number(button.dataset.entryId);
        if (!Number.isInteger(entryId) || entryId < 1) {
            return;
        }

        const confirmed = window.confirm("Remove this meal from the weekly planner?");
        if (!confirmed) {
            return;
        }

        setGridMessage("Removing meal...", null);
        const response = await fetch(
            `/api/meal-planner/entries/${entryId}?email=${encodeURIComponent(userEmail)}`,
            { method: "DELETE" }
        );
        const data = await readJson(response);
        if (!response.ok) {
            setGridMessage(data.error || "Unable to remove meal.", "is-error");
            return;
        }

        await loadPlannerWeek();
        setGridMessage("Meal removed from the planner.", "is-success");
    }
});

plannerWeekGrid.addEventListener("keydown", (event) => {
    const mealCard = event.target.closest(".planner-day-meal");
    if (!mealCard) {
        return;
    }

    if (event.key !== "Enter" && event.key !== " ") {
        return;
    }

    event.preventDefault();
    if (mealCard.classList.contains("is-active")) {
        mealCard.classList.remove("is-active");
    } else {
        clearActiveMealCards(mealCard);
        mealCard.classList.add("is-active");
    }
});

plannerWeekDateInput.addEventListener("change", async () => {
    const selectedDate = parseIsoDate(plannerWeekDateInput.value);
    if (!selectedDate) {
        setFormMessage("Enter a valid week date.", "is-error");
        return;
    }

    currentWeekStart = getWeekStart(selectedDate);
    setFormMessage("", null);
    await loadPlannerWeek();
});

plannerPrevWeekButton.addEventListener("click", async () => {
    currentWeekStart = addDays(currentWeekStart, -7);
    await loadPlannerWeek();
});

plannerNextWeekButton.addEventListener("click", async () => {
    currentWeekStart = addDays(currentWeekStart, 7);
    await loadPlannerWeek();
});

(async function init() {
    if (!userEmail) {
        return;
    }

    try {
        await loadRecipes();
        await loadPlannerWeek();
    } catch (error) {
        setFormMessage(error.message || "Unable to load planner.", "is-error");
        setGridMessage("Planner could not be loaded.", "is-error");
    }
})();
