const userEmail = localStorage.getItem("userEmail");
const recipeForm = document.getElementById("recipeForm");
const message = document.getElementById("formMessage");
const dietaryGroup = document.getElementById("recipeDietaryOptions");
const allergyGroup = document.getElementById("recipeAllergyOptions");

function setMessage(text, type) {
    message.textContent = text;
    message.classList.remove("is-error", "is-success");
    if (type) {
        message.classList.add(type);
    }
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

function getSelectedIds(groupEl) {
    return Array.from(groupEl.querySelectorAll("input[type='checkbox']:checked")).map((input) =>
        Number(input.value)
    );
}

async function loadOptions() {
    try {
        const response = await fetch("/api/preferences");
        const data = await response.json();
        if (!response.ok) {
            setMessage(data.error || "Unable to load recipe options.", "is-error");
            return;
        }

        populateOptions(dietaryGroup, data.dietaryOptions || [], "recipeDietaryOptions");
        populateOptions(allergyGroup, data.allergyOptions || [], "recipeAllergyOptions");
    } catch (error) {
        setMessage("Network error. Please try again.", "is-error");
    }
}

recipeForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
        creatorEmail: userEmail,
        title: document.getElementById("title").value.trim(),
        ingredients: document.getElementById("ingredients").value.trim(),
        instructions: document.getElementById("instructions").value.trim(),
        preparationTimeMinutes: Number(document.getElementById("preparationTimeMinutes").value),
        preparationSteps: Number(document.getElementById("preparationSteps").value),
        difficulty: Number(document.getElementById("difficulty").value),
        costLevel: Number(document.getElementById("costLevel").value),
        cuisine: document.getElementById("cuisine").value.trim(),
        dietaryOptionIds: getSelectedIds(dietaryGroup),
        allergyOptionIds: getSelectedIds(allergyGroup)
    };

    if (!payload.title || !payload.ingredients || !payload.instructions || !payload.cuisine) {
        setMessage("Please complete all required fields.", "is-error");
        return;
    }

    setMessage("Publishing recipe...", null);

    try {
        const response = await fetch("/api/recipes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) {
            setMessage(data.error || "Unable to publish recipe.", "is-error");
            return;
        }

        setMessage("Recipe published. Redirecting to My Recipes...", "is-success");
        recipeForm.reset();
        setTimeout(() => {
            window.location.href = "/recipes/mine";
        }, 700);
    } catch (error) {
        setMessage("Network error. Please try again.", "is-error");
    }
});

loadOptions();
