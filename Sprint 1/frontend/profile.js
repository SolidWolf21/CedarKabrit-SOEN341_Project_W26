const form = document.getElementById("profileForm");
const message = document.getElementById("formMessage");
const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const dietarySelect = document.getElementById("dietaryOptions");
const allergySelect = document.getElementById("allergyOptions");

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

function populateOptions(selectEl, options) {
    selectEl.innerHTML = "";
    options.forEach((option) => {
        const opt = document.createElement("option");
        opt.value = option.id;
        opt.textContent = option.name;
        selectEl.appendChild(opt);
    });
}

function setSelectedOptions(selectEl, selectedIds) {
    const selectedSet = new Set(selectedIds.map(String));
    Array.from(selectEl.options).forEach((option) => {
        option.selected = selectedSet.has(option.value);
    });
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

        populateOptions(dietarySelect, optionsData.dietaryOptions || []);
        populateOptions(allergySelect, optionsData.allergyOptions || []);
        setSelectedOptions(dietarySelect, prefsData.dietaryOptionIds || []);
        setSelectedOptions(allergySelect, prefsData.allergyOptionIds || []);
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

    const dietaryOptionIds = Array.from(dietarySelect.selectedOptions).map((opt) => Number(opt.value));
    const allergyOptionIds = Array.from(allergySelect.selectedOptions).map((opt) => Number(opt.value));

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
