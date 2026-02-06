const path = require("path");
const express = require("express");

const app = express();
const port = process.env.PORT || 3000;
const frontendDir = path.join(__dirname, "..", "frontend");

app.use(express.json());
app.use(express.static(frontendDir));

app.get("/", (req, res) => {
    res.sendFile(path.join(frontendDir, "index.html"));
});

app.get("/signup", (req, res) => {
    res.sendFile(path.join(frontendDir, "sign-up.html"));
});

app.get("/signin", (req, res) => {
    res.sendFile(path.join(frontendDir, "sign-in.html"));
});

app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

app.post("/api/signup", async (req, res) => {
    const { firstName, lastName, email, password } = req.body || {};
    if (!email) {
        return res.status(400).json({ error: "Email is required." });
    }
    const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailPattern.test(email)) {
        return res.status(400).json({ error: "Email is invalid." });
    }
    if (!firstName || !lastName || !password) {
        return res.status(400).json({ error: "All fields are required." });
    }

    try {
        const bcrypt = require("bcryptjs");
        const pool = require("./db/connection");
        const passwordHash = await bcrypt.hash(password, 10);

        await pool.execute(
            "INSERT INTO users (first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?)",
            [firstName.trim(), lastName.trim(), email.trim().toLowerCase(), passwordHash]
        );

        return res.status(201).json({ message: "User created." });
    } catch (error) {
        if (error && error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ error: "Email already exists." });
        }
        console.error(error);
        return res.status(500).json({ error: "Server error." });
    }
});

app.post("/api/signin", async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
    }
    const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailPattern.test(email)) {
        return res.status(400).json({ error: "Email is invalid." });
    }

    try {
        const bcrypt = require("bcryptjs");
        const pool = require("./db/connection");
        const [rows] = await pool.execute(
            "SELECT password_hash FROM users WHERE email = ? LIMIT 1",
            [email.trim().toLowerCase()]
        );

        if (!rows || rows.length === 0) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        const match = await bcrypt.compare(password, rows[0].password_hash);
        if (!match) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        return res.json({ message: "Signed in." });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Server error." });
    }
});

app.listen(port, () => {
    console.log(`MealMajor server running on http://localhost:${port}`);
});
