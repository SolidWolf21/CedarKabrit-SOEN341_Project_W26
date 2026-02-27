CREATE DATABASE IF NOT EXISTS MealMajors;

USE MealMajors;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dietary_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS allergy_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS user_dietary_preferences (
    user_id INT NOT NULL,
    dietary_option_id INT NOT NULL,
    PRIMARY KEY (user_id, dietary_option_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (dietary_option_id) REFERENCES dietary_options(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_allergies (
    user_id INT NOT NULL,
    allergy_option_id INT NOT NULL,
    PRIMARY KEY (user_id, allergy_option_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (allergy_option_id) REFERENCES allergy_options(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recipes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(180) NOT NULL,
    ingredients TEXT NOT NULL,
    instructions TEXT NOT NULL,
    preparation_time_minutes INT NOT NULL,
    preparation_steps INT NOT NULL,
    difficulty_rating TINYINT NOT NULL,
    cost_level TINYINT NOT NULL,
    cuisine VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recipe_dietary_options (
    recipe_id INT NOT NULL,
    dietary_option_id INT NOT NULL,
    PRIMARY KEY (recipe_id, dietary_option_id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (dietary_option_id) REFERENCES dietary_options(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recipe_allergy_options (
    recipe_id INT NOT NULL,
    allergy_option_id INT NOT NULL,
    PRIMARY KEY (recipe_id, allergy_option_id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (allergy_option_id) REFERENCES allergy_options(id) ON DELETE CASCADE
);

INSERT IGNORE INTO dietary_options (name) VALUES
    ('Vegetarian'),
    ('Vegan'),
    ('Pescatarian'),
    ('Gluten-Free'),
    ('Lactose-Free'),
    ('Keto'),
    ('Halal'),
    ('Kosher'),
    ('Low-Carb'),
    ('Low-Sodium'),
    ('Paleo'),
    ('Plant-Forward'),
    ('High-Protein'),
    ('Flexitarian');

INSERT IGNORE INTO allergy_options (name) VALUES
    ('Peanuts'),
    ('Tree Nuts'),
    ('Almonds'),
    ('Dairy'),
    ('Eggs'),
    ('Soy'),
    ('Wheat'),
    ('Fish'),
    ('Shellfish'),
    ('Sesame'),
    ('Gluten'),
    ('Corn');
