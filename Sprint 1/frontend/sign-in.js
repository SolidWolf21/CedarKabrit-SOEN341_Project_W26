const form = document.getElementById("signinForm");
const message = document.getElementById("formMessage");
const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function setMessage(text, type) {
    message.textContent = text;
    message.classList.remove("is-error", "is-success");
    if (type) {
        message.classList.add(type);
    }
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email) {
        setMessage("Please enter an email address.", "is-error");
        document.getElementById("email").focus();
        return;
    }

    if (!emailPattern.test(email)) {
        setMessage("Please enter a valid email address.", "is-error");
        document.getElementById("email").focus();
        return;
    }

    if (!password) {
        setMessage("Please enter your password.", "is-error");
        return;
    }

    setMessage("Signing in...", null);

    try {
        const response = await fetch("/api/signin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (!response.ok) {
            setMessage(data.error || "Sign in failed.", "is-error");
            return;
        }

        localStorage.setItem("userEmail", email);
        window.location.href = "/";
    } catch (error) {
        setMessage("Network error. Please try again.", "is-error");
    }
});
