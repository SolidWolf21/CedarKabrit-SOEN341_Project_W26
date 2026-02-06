const form = document.getElementById("profileForm");
const message = document.getElementById("formMessage");
const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function setMessage(text, type) {
    message.textContent = text;
    message.classList.remove("is-error", "is-success");
    if (type) {
        message.classList.add(type);
    }
}

const storedEmail = localStorage.getItem("userEmail");
if (!storedEmail) {
    window.location.href = "/signin";
}

async function loadProfile() {
    try {
        const response = await fetch(`/api/profile?email=${encodeURIComponent(storedEmail)}`);
        const data = await response.json();
        if (!response.ok) {
            setMessage(data.error || "Unable to load profile.", "is-error");
            return;
        }

        document.getElementById("firstName").value = data.firstName || "";
        document.getElementById("lastName").value = data.lastName || "";
        document.getElementById("email").value = data.email || "";
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

        localStorage.setItem("userEmail", email);
        document.getElementById("password").value = "";
        setMessage("Profile updated successfully.", "is-success");
    } catch (error) {
        setMessage("Network error. Please try again.", "is-error");
    }
});

loadProfile();
