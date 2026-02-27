const path = require("path");
const express = require("express");

const app = express();
const port = process.env.PORT || 3000;
const frontendDir = path.join(__dirname, "..", "frontend");
const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

app.use(express.json());
app.use(express.static(frontendDir));

function normalizeEmail(rawEmail) {
    return (rawEmail || "").toString().trim().toLowerCase();
}

function toInt(rawValue) {
    const parsed = Number(rawValue);
    if (!Number.isInteger(parsed)) {
        return null;
    }
    return parsed;
}

function toIdArray(values) {
    if (!Array.isArray(values)) {
        return [];
    }
    const ids = values
        .map((value) => toInt(value))
        .filter((value) => value && value > 0);
    return [...new Set(ids)];
}

function parseRecipePayload(body) {
    const payload = body || {};
    const title = (payload.title || "").toString().trim();
    const ingredients = (payload.ingredients || "").toString().trim();
    const instructions = (payload.instructions || "").toString().trim();
    const cuisine = (payload.cuisine || "").toString().trim();
    const preparationTimeMinutes = toInt(payload.preparationTimeMinutes);
    const preparationSteps = toInt(payload.preparationSteps);
    const difficulty = toInt(payload.difficulty);
    const costLevel = toInt(payload.costLevel);
    const dietaryOptionIds = toIdArray(payload.dietaryOptionIds);
    const allergyOptionIds = toIdArray(payload.allergyOptionIds);

    if (!title || !ingredients || !instructions || !cuisine) {
        return { error: "Title, ingredients, instructions, and cuisine are required." };
    }
    if (!preparationTimeMinutes || preparationTimeMinutes < 1 || preparationTimeMinutes > 1440) {
        return { error: "Preparation time must be between 1 and 1440 minutes." };
    }
    if (!preparationSteps || preparationSteps < 1 || preparationSteps > 100) {
        return { error: "Preparation steps must be between 1 and 100." };
    }
    if (!difficulty || difficulty < 1 || difficulty > 5) {
        return { error: "Difficulty must be a value between 1 and 5." };
    }
    if (!costLevel || costLevel < 1 || costLevel > 5) {
        return { error: "Cost must be a value between 1 and 5." };
    }

    return {
        title,
        ingredients,
        instructions,
        cuisine,
        preparationTimeMinutes,
        preparationSteps,
        difficulty,
        costLevel,
        dietaryOptionIds,
        allergyOptionIds
    };
}

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

app.get("/recipes/new", (req, res) => {
    res.sendFile(path.join(frontendDir, "new-recipe.html"));
});

app.get("/recipes/mine", (req, res) => {
    res.sendFile(path.join(frontendDir, "my-recipes.html"));
});

app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

app.post("/api/signup", async (req, res) => {
    const { firstName, lastName, email, password } = req.body || {};
    const normalizedEmail = normalizeEmail(email);
    if (!email) {
        return res.status(400).json({ error: "Email is required." });
    }
    if (!emailPattern.test(normalizedEmail)) {
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
            [firstName.trim(), lastName.trim(), normalizedEmail, passwordHash]
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
    const normalizedEmail = normalizeEmail(email);
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
    }
    if (!emailPattern.test(normalizedEmail)) {
        return res.status(400).json({ error: "Email is invalid." });
    }

    try {
        const bcrypt = require("bcryptjs");
        const pool = require("./db/connection");
        const [rows] = await pool.execute(
            "SELECT password_hash FROM users WHERE email = ? LIMIT 1",
            [normalizedEmail]
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
    const email = normalizeEmail(req.query.email);
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
    const normalizedCurrentEmail = normalizeEmail(currentEmail);
    const normalizedEmail = normalizeEmail(email);

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
    const email = normalizeEmail(req.query.email);
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
    const normalizedEmail = normalizeEmail(currentEmail);
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

app.post("/api/recipes", async (req, res) => {
    const creatorEmail = normalizeEmail(req.body && req.body.creatorEmail);
    if (!creatorEmail || !emailPattern.test(creatorEmail)) {
        return res.status(400).json({ error: "Valid creator email is required." });
    }

    const parsed = parseRecipePayload(req.body);
    if (parsed.error) {
        return res.status(400).json({ error: parsed.error });
    }

    let connection;
    try {
        const pool = require("./db/connection");
        const [users] = await pool.execute("SELECT id FROM users WHERE email = ? LIMIT 1", [creatorEmail]);
        if (!users || users.length === 0) {
            return res.status(404).json({ error: "User not found." });
        }

        const userId = users[0].id;
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [insertResult] = await connection.execute(
            `INSERT INTO recipes
                (user_id, title, ingredients, instructions, preparation_time_minutes, preparation_steps, difficulty_rating, cost_level, cuisine)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                parsed.title,
                parsed.ingredients,
                parsed.instructions,
                parsed.preparationTimeMinutes,
                parsed.preparationSteps,
                parsed.difficulty,
                parsed.costLevel,
                parsed.cuisine
            ]
        );

        const recipeId = insertResult.insertId;

        if (parsed.dietaryOptionIds.length > 0) {
            const dietaryValues = parsed.dietaryOptionIds.map((id) => [recipeId, id]);
            await connection.query(
                "INSERT INTO recipe_dietary_options (recipe_id, dietary_option_id) VALUES ?",
                [dietaryValues]
            );
        }

        if (parsed.allergyOptionIds.length > 0) {
            const allergyValues = parsed.allergyOptionIds.map((id) => [recipeId, id]);
            await connection.query(
                "INSERT INTO recipe_allergy_options (recipe_id, allergy_option_id) VALUES ?",
                [allergyValues]
            );
        }

        await connection.commit();
        return res.status(201).json({ message: "Recipe created.", recipeId });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error(error);
        return res.status(500).json({ error: "Server error." });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

app.get("/api/recipes", async (req, res) => {
    const email = normalizeEmail(req.query.email);
    if (!email || !emailPattern.test(email)) {
        return res.status(400).json({ error: "Valid email is required." });
    }

    try {
        const pool = require("./db/connection");
        const [rows] = await pool.execute(
            `SELECT r.id,
                    r.title,
                    r.cuisine,
                    r.preparation_time_minutes,
                    r.preparation_steps,
                    r.difficulty_rating,
                    r.cost_level,
                    r.updated_at
             FROM recipes r
             INNER JOIN users u ON u.id = r.user_id
             WHERE u.email = ?
             ORDER BY r.updated_at DESC`,
            [email]
        );

        return res.json({
            recipes: rows.map((row) => ({
                id: row.id,
                title: row.title,
                cuisine: row.cuisine,
                preparationTimeMinutes: row.preparation_time_minutes,
                preparationSteps: row.preparation_steps,
                difficulty: row.difficulty_rating,
                costLevel: row.cost_level,
                updatedAt: row.updated_at
            }))
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Server error." });
    }
});

app.get("/api/recipes/:id", async (req, res) => {
    const email = normalizeEmail(req.query.email);
    const recipeId = toInt(req.params.id);
    if (!email || !emailPattern.test(email)) {
        return res.status(400).json({ error: "Valid email is required." });
    }
    if (!recipeId || recipeId < 1) {
        return res.status(400).json({ error: "Valid recipe id is required." });
    }

    try {
        const pool = require("./db/connection");
        const [rows] = await pool.execute(
            `SELECT r.id,
                    r.title,
                    r.ingredients,
                    r.instructions,
                    r.preparation_time_minutes,
                    r.preparation_steps,
                    r.difficulty_rating,
                    r.cost_level,
                    r.cuisine,
                    r.created_at,
                    r.updated_at
             FROM recipes r
             INNER JOIN users u ON u.id = r.user_id
             WHERE r.id = ? AND u.email = ?
             LIMIT 1`,
            [recipeId, email]
        );

        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: "Recipe not found." });
        }

        const [dietaryRows] = await pool.execute(
            "SELECT dietary_option_id AS id FROM recipe_dietary_options WHERE recipe_id = ?",
            [recipeId]
        );
        const [allergyRows] = await pool.execute(
            "SELECT allergy_option_id AS id FROM recipe_allergy_options WHERE recipe_id = ?",
            [recipeId]
        );

        const row = rows[0];
        return res.json({
            id: row.id,
            title: row.title,
            ingredients: row.ingredients,
            instructions: row.instructions,
            preparationTimeMinutes: row.preparation_time_minutes,
            preparationSteps: row.preparation_steps,
            difficulty: row.difficulty_rating,
            costLevel: row.cost_level,
            cuisine: row.cuisine,
            dietaryOptionIds: dietaryRows.map((item) => item.id),
            allergyOptionIds: allergyRows.map((item) => item.id),
            createdAt: row.created_at,
            updatedAt: row.updated_at
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Server error." });
    }
});

app.put("/api/recipes/:id", async (req, res) => {
    const editorEmail = normalizeEmail(req.body && req.body.editorEmail);
    const recipeId = toInt(req.params.id);
    if (!editorEmail || !emailPattern.test(editorEmail)) {
        return res.status(400).json({ error: "Valid editor email is required." });
    }
    if (!recipeId || recipeId < 1) {
        return res.status(400).json({ error: "Valid recipe id is required." });
    }

    const parsed = parseRecipePayload(req.body);
    if (parsed.error) {
        return res.status(400).json({ error: parsed.error });
    }

    let connection;
    try {
        const pool = require("./db/connection");
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [ownedRows] = await connection.execute(
            `SELECT r.id
             FROM recipes r
             INNER JOIN users u ON u.id = r.user_id
             WHERE r.id = ? AND u.email = ?
             LIMIT 1`,
            [recipeId, editorEmail]
        );

        if (!ownedRows || ownedRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: "Recipe not found." });
        }

        await connection.execute(
            `UPDATE recipes
             SET title = ?,
                 ingredients = ?,
                 instructions = ?,
                 preparation_time_minutes = ?,
                 preparation_steps = ?,
                 difficulty_rating = ?,
                 cost_level = ?,
                 cuisine = ?
             WHERE id = ?`,
            [
                parsed.title,
                parsed.ingredients,
                parsed.instructions,
                parsed.preparationTimeMinutes,
                parsed.preparationSteps,
                parsed.difficulty,
                parsed.costLevel,
                parsed.cuisine,
                recipeId
            ]
        );

        await connection.execute("DELETE FROM recipe_dietary_options WHERE recipe_id = ?", [recipeId]);
        await connection.execute("DELETE FROM recipe_allergy_options WHERE recipe_id = ?", [recipeId]);

        if (parsed.dietaryOptionIds.length > 0) {
            const dietaryValues = parsed.dietaryOptionIds.map((id) => [recipeId, id]);
            await connection.query(
                "INSERT INTO recipe_dietary_options (recipe_id, dietary_option_id) VALUES ?",
                [dietaryValues]
            );
        }

        if (parsed.allergyOptionIds.length > 0) {
            const allergyValues = parsed.allergyOptionIds.map((id) => [recipeId, id]);
            await connection.query(
                "INSERT INTO recipe_allergy_options (recipe_id, allergy_option_id) VALUES ?",
                [allergyValues]
            );
        }

        await connection.commit();
        return res.json({ message: "Recipe updated." });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error(error);
        return res.status(500).json({ error: "Server error." });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

app.listen(port, () => {
    console.log(`MealMajor server running on http://localhost:${port}`);
});
