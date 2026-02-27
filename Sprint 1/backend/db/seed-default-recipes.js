require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("./connection");
const defaultRecipes = require("./default-recipes.json");

const DEFAULT_USER = {
    firstName: "MealMajor",
    lastName: "Kitchen",
    email: "defaults@mealmajor.app"
};

const FALLBACK_PASSWORD = "MealMajor_Default_Recipes_Only";
const TABLES = {
    dietary: "dietary_options",
    allergy: "allergy_options"
};

function normalizeName(name) {
    return (name || "").toString().trim();
}

function parsePositiveInt(value, fallback = 1) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
        return fallback;
    }
    return parsed;
}

async function ensureDefaultUser(connection) {
    const [existing] = await connection.execute(
        "SELECT id FROM users WHERE email = ? LIMIT 1",
        [DEFAULT_USER.email]
    );
    if (existing.length > 0) {
        return existing[0].id;
    }

    const passwordHash = await bcrypt.hash(FALLBACK_PASSWORD, 10);
    const [insertResult] = await connection.execute(
        "INSERT INTO users (first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?)",
        [DEFAULT_USER.firstName, DEFAULT_USER.lastName, DEFAULT_USER.email, passwordHash]
    );
    return insertResult.insertId;
}

async function ensureOptionNames(connection, tableName, names) {
    const uniqueNames = [...new Set(names.map(normalizeName).filter(Boolean))];
    for (const name of uniqueNames) {
        await connection.execute(`INSERT IGNORE INTO ${tableName} (name) VALUES (?)`, [name]);
    }
}

async function fetchOptionMap(connection, tableName) {
    const [rows] = await connection.execute(`SELECT id, name FROM ${tableName}`);
    return new Map(
        rows
            .map((row) => [normalizeName(row.name), Number(row.id)])
            .filter(([name, id]) => Boolean(name) && Number.isInteger(id))
    );
}

function optionIdsForRecipe(recipeTitle, optionNames, optionMap, optionType) {
    const names = [...new Set((optionNames || []).map(normalizeName).filter(Boolean))];
    const ids = [];

    for (const name of names) {
        const id = optionMap.get(name);
        if (!id) {
            throw new Error(
                `Missing ${optionType} option "${name}" while processing recipe "${recipeTitle}".`
            );
        }
        ids.push(id);
    }

    return ids;
}

async function upsertRecipe(connection, userId, recipe, dietaryMap, allergyMap) {
    const title = normalizeName(recipe.title);
    const ingredients = (recipe.ingredients || "").toString().trim();
    const instructions = (recipe.instructions || "").toString().trim();
    const cuisine = normalizeName(recipe.cuisine);

    if (!title || !ingredients || !instructions || !cuisine) {
        throw new Error(`Recipe "${title || "(untitled)"}" has missing required fields.`);
    }

    const payload = {
        preparationTimeMinutes: parsePositiveInt(recipe.preparationTimeMinutes, 1),
        cookingTimeMinutes: parsePositiveInt(recipe.cookingTimeMinutes, 0),
        preparationSteps: parsePositiveInt(recipe.preparationSteps, 1),
        difficulty: Math.min(5, Math.max(1, parsePositiveInt(recipe.difficulty, 1))),
        costLevel: Math.min(5, Math.max(1, parsePositiveInt(recipe.costLevel, 1))),
        servings: Math.max(1, parsePositiveInt(recipe.servings, 1))
    };

    const [existingRows] = await connection.execute(
        `SELECT id
         FROM recipes
         WHERE user_id = ? AND title = ?
         ORDER BY id ASC`,
        [userId, title]
    );

    let recipeId;
    if (existingRows.length > 0) {
        recipeId = Number(existingRows[0].id);
        await connection.execute(
            `UPDATE recipes
             SET ingredients = ?,
                 instructions = ?,
                 preparation_time_minutes = ?,
                 cooking_time_minutes = ?,
                 preparation_steps = ?,
                 difficulty_rating = ?,
                 cost_level = ?,
                 servings = ?,
                 cuisine = ?
             WHERE id = ?`,
            [
                ingredients,
                instructions,
                payload.preparationTimeMinutes,
                payload.cookingTimeMinutes,
                payload.preparationSteps,
                payload.difficulty,
                payload.costLevel,
                payload.servings,
                cuisine,
                recipeId
            ]
        );

        if (existingRows.length > 1) {
            const staleIds = existingRows.slice(1).map((row) => Number(row.id));
            if (staleIds.length > 0) {
                await connection.query("DELETE FROM recipes WHERE id IN (?)", [staleIds]);
            }
        }
    } else {
        const [insertResult] = await connection.execute(
            `INSERT INTO recipes (
                user_id,
                title,
                ingredients,
                instructions,
                preparation_time_minutes,
                cooking_time_minutes,
                preparation_steps,
                difficulty_rating,
                cost_level,
                servings,
                cuisine
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                title,
                ingredients,
                instructions,
                payload.preparationTimeMinutes,
                payload.cookingTimeMinutes,
                payload.preparationSteps,
                payload.difficulty,
                payload.costLevel,
                payload.servings,
                cuisine
            ]
        );
        recipeId = insertResult.insertId;
    }

    const dietaryIds = optionIdsForRecipe(title, recipe.dietaryOptions, dietaryMap, "dietary");
    const allergyIds = optionIdsForRecipe(title, recipe.allergyOptions, allergyMap, "allergy");

    await connection.execute("DELETE FROM recipe_dietary_options WHERE recipe_id = ?", [recipeId]);
    await connection.execute("DELETE FROM recipe_allergy_options WHERE recipe_id = ?", [recipeId]);

    if (dietaryIds.length > 0) {
        const rows = dietaryIds.map((id) => [recipeId, id]);
        await connection.query(
            "INSERT INTO recipe_dietary_options (recipe_id, dietary_option_id) VALUES ?",
            [rows]
        );
    }

    if (allergyIds.length > 0) {
        const rows = allergyIds.map((id) => [recipeId, id]);
        await connection.query(
            "INSERT INTO recipe_allergy_options (recipe_id, allergy_option_id) VALUES ?",
            [rows]
        );
    }
}

async function seedDefaultRecipes() {
    if (!Array.isArray(defaultRecipes) || defaultRecipes.length === 0) {
        throw new Error("No default recipes found in default-recipes.json");
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const userId = await ensureDefaultUser(connection);

        const dietaryNames = defaultRecipes.flatMap((recipe) => recipe.dietaryOptions || []);
        const allergyNames = defaultRecipes.flatMap((recipe) => recipe.allergyOptions || []);
        await ensureOptionNames(connection, TABLES.dietary, dietaryNames);
        await ensureOptionNames(connection, TABLES.allergy, allergyNames);

        const dietaryMap = await fetchOptionMap(connection, TABLES.dietary);
        const allergyMap = await fetchOptionMap(connection, TABLES.allergy);

        for (const recipe of defaultRecipes) {
            await upsertRecipe(connection, userId, recipe, dietaryMap, allergyMap);
        }

        await connection.commit();
        console.log(`Seeded ${defaultRecipes.length} default recipes for ${DEFAULT_USER.email}`);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
        await pool.end();
    }
}

seedDefaultRecipes().catch((error) => {
    console.error("Failed to seed default recipes:", error.message);
    process.exitCode = 1;
});
