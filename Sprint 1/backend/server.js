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

app.get("/profile", (req, res) => {
    res.sendFile(path.join(frontendDir, "profile.html"));
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

app.get("/api/profile", async (req, res) => {
    const email = (req.query.email || "").toString().trim().toLowerCase();
    const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!email || !emailPattern.test(email)) {
        return res.status(400).json({ error: "Valid email is required." });
    }

    try {
        const pool = require("./db/connection");
        const [rows] = await pool.execute(
            "SELECT first_name, last_name, email FROM users WHERE email = ? LIMIT 1",
            [email]
        );

        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: "User not found." });
        }

        return res.json({
            firstName: rows[0].first_name,
            lastName: rows[0].last_name,
            email: rows[0].email
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Server error." });
    }
});

app.put("/api/profile", async (req, res) => {
    const { currentEmail, firstName, lastName, email, password } = req.body || {};
    const normalizedCurrentEmail = (currentEmail || "").toString().trim().toLowerCase();
    const normalizedEmail = (email || "").toString().trim().toLowerCase();
    const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

    if (!normalizedCurrentEmail || !emailPattern.test(normalizedCurrentEmail)) {
        return res.status(400).json({ error: "Valid current email is required." });
    }
    if (!firstName || !lastName || !normalizedEmail || !emailPattern.test(normalizedEmail)) {
        return res.status(400).json({ error: "All fields must be valid." });
    }

    try {
        const pool = require("./db/connection");
        const [dupes] = await pool.execute(
            "SELECT id FROM users WHERE email = ? AND email <> ? LIMIT 1",
            [normalizedEmail, normalizedCurrentEmail]
        );

        if (dupes && dupes.length > 0) {
            return res.status(409).json({ error: "Email already exists." });
        }

        if (password) {
            const bcrypt = require("bcryptjs");
            const passwordHash = await bcrypt.hash(password, 10);
            await pool.execute(
                "UPDATE users SET first_name = ?, last_name = ?, email = ?, password_hash = ? WHERE email = ?",
                [firstName.trim(), lastName.trim(), normalizedEmail, passwordHash, normalizedCurrentEmail]
            );
        } else {
            await pool.execute(
                "UPDATE users SET first_name = ?, last_name = ?, email = ? WHERE email = ?",
                [firstName.trim(), lastName.trim(), normalizedEmail, normalizedCurrentEmail]
            );
        }

        return res.json({ message: "Profile updated." });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Server error." });
    }
});

app.get("/api/preferences", async (req, res) => {
    try {
        const pool = require("./db/connection");
        const [dietaryRows] = await pool.execute("SELECT id, name FROM dietary_options ORDER BY name");
        const [allergyRows] = await pool.execute("SELECT id, name FROM allergy_options ORDER BY name");
        return res.json({ dietaryOptions: dietaryRows, allergyOptions: allergyRows });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Server error." });
    }
});

app.get("/api/profile/preferences", async (req, res) => {
    const email = (req.query.email || "").toString().trim().toLowerCase();
    const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!email || !emailPattern.test(email)) {
        return res.status(400).json({ error: "Valid email is required." });
    }

    try {
        const pool = require("./db/connection");
        const [users] = await pool.execute("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
        if (!users || users.length === 0) {
            return res.status(404).json({ error: "User not found." });
        }

        const userId = users[0].id;
        const [dietaryRows] = await pool.execute(
            "SELECT dietary_option_id AS id FROM user_dietary_preferences WHERE user_id = ?",
            [userId]
        );
        const [allergyRows] = await pool.execute(
            "SELECT allergy_option_id AS id FROM user_allergies WHERE user_id = ?",
            [userId]
        );

        return res.json({
            dietaryOptionIds: dietaryRows.map((row) => row.id),
            allergyOptionIds: allergyRows.map((row) => row.id)
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Server error." });
    }
});

app.put("/api/profile/preferences", async (req, res) => {
    const { currentEmail, dietaryOptionIds, allergyOptionIds } = req.body || {};
    const normalizedEmail = (currentEmail || "").toString().trim().toLowerCase();
    const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!normalizedEmail || !emailPattern.test(normalizedEmail)) {
        return res.status(400).json({ error: "Valid email is required." });
    }

    const dietaryIds = Array.isArray(dietaryOptionIds) ? dietaryOptionIds : [];
    const allergyIds = Array.isArray(allergyOptionIds) ? allergyOptionIds : [];

    try {
        const pool = require("./db/connection");
        const [users] = await pool.execute("SELECT id FROM users WHERE email = ? LIMIT 1", [normalizedEmail]);
        if (!users || users.length === 0) {
            return res.status(404).json({ error: "User not found." });
        }

        const userId = users[0].id;
        await pool.execute("DELETE FROM user_dietary_preferences WHERE user_id = ?", [userId]);
        await pool.execute("DELETE FROM user_allergies WHERE user_id = ?", [userId]);

        if (dietaryIds.length > 0) {
            const dietaryValues = dietaryIds.map((id) => [userId, id]);
            await pool.query(
                "INSERT INTO user_dietary_preferences (user_id, dietary_option_id) VALUES ?",
                [dietaryValues]
            );
        }

        if (allergyIds.length > 0) {
            const allergyValues = allergyIds.map((id) => [userId, id]);
            await pool.query(
                "INSERT INTO user_allergies (user_id, allergy_option_id) VALUES ?",
                [allergyValues]
            );
        }

        return res.json({ message: "Preferences updated." });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Server error." });
    }
});

app.listen(port, () => {
    console.log(`MealMajor server running on http://localhost:${port}`);
});
