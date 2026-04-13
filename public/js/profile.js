const form = document.getElementById("profileForm");
const message = document.getElementById("formMessage");
const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const dietaryGroup = document.getElementById("dietaryOptions");
const allergyGroup = document.getElementById("allergyOptions");

function setMessage(text, type) {
    message.textContent = text;
    message.classList.remove("is-error", "is-success");
    if (type) {
        message.classList.add(type);
    }
}

let storedEmail = localStorage.getItem("userEmail");
if (!storedEmail) {
    window.location.href = "/signin";
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

function getSelectedOptions(groupEl) {
    return Array.from(groupEl.querySelectorAll("input[type='checkbox']:checked")).map((input) =>
        Number(input.value)
    );
}

async function loadProfile() {
    try {
        const [profileResponse, optionsResponse, prefsResponse] = await Promise.all([
            fetch(`/api/profile?email=${encodeURIComponent(storedEmail)}`),
            fetch("/api/preferences"),
            fetch(`/api/profile/preferences?email=${encodeURIComponent(storedEmail)}`)
        ]);

        const profileData = await profileResponse.json();
        const optionsData = await optionsResponse.json();
        const prefsData = await prefsResponse.json();

        if (!profileResponse.ok) {
            setMessage(profileData.error || "Unable to load profile.", "is-error");
            return;
        }
        if (!optionsResponse.ok) {
            setMessage(optionsData.error || "Unable to load preferences.", "is-error");
            return;
        }
        if (!prefsResponse.ok) {
            setMessage(prefsData.error || "Unable to load preferences.", "is-error");
            return;
        }

        document.getElementById("firstName").value = profileData.firstName || "";
        document.getElementById("lastName").value = profileData.lastName || "";
        document.getElementById("email").value = profileData.email || "";

        populateOptions(dietaryGroup, optionsData.dietaryOptions || [], "dietaryOptions");
        populateOptions(allergyGroup, optionsData.allergyOptions || [], "allergyOptions");
        setSelectedOptions(dietaryGroup, prefsData.dietaryOptionIds || []);
        setSelectedOptions(allergyGroup, prefsData.allergyOptionIds || []);
    } catch (error) {
        setMessage("Network error. Please try again.", "is-error");
    }
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!firstName || !lastName || !email) {
        setMessage("Please fill out all required fields.", "is-error");
        return;
    }

    if (!emailPattern.test(email)) {
        setMessage("Please enter a valid email address.", "is-error");
        return;
    }

    const dietaryOptionIds = getSelectedOptions(dietaryGroup);
    const allergyOptionIds = getSelectedOptions(allergyGroup);

    setMessage("Saving...", null);

    try {
        const response = await fetch("/api/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                currentEmail: storedEmail,
                firstName,
                lastName,
                email,
                password: password || undefined
            })
        });

        const data = await response.json();
        if (!response.ok) {
            setMessage(data.error || "Update failed.", "is-error");
            return;
        }

        const prefsResponse = await fetch("/api/profile/preferences", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                currentEmail: email,
                dietaryOptionIds,
                allergyOptionIds
            })
        });

        const prefsData = await prefsResponse.json();
        if (!prefsResponse.ok) {
            setMessage(prefsData.error || "Preferences update failed.", "is-error");
            return;
        }

        localStorage.setItem("userEmail", email);
        storedEmail = email;
        document.getElementById("password").value = "";
        setMessage("Profile updated successfully.", "is-success");
    } catch (error) {
        setMessage("Network error. Please try again.", "is-error");
    }
});

loadProfile();
