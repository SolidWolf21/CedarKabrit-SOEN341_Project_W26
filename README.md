# SOEN-341
For the project of soen 341

# Project Description
MealMajor is a web application designed to help students efficiently plan their weekly meals, track groceries, and discover easy recipes tailored to their dietary preferences and budget constraints. The platform provides an intuitive interface for managing personalized meal schedules, searching and filtering recipes by various criteria, and maintaining dietary profiles that accommodate allergies and nutritional requirements.


# Team Members

| Name | Student ID | Roles |
|------|------------|-------|
| Raphael Hadgu | 40285317 | Documentation specialist |
| Paul Haydn Louisma  | 40285518 | Full Stack Developer |
| Emile Ghattas | 40282552 | Full Stack Developer |
| Mia Haidar | 40280890  | Documentation Specialist   |
| Elfrid Jeffrey Kamdem Sindjoun  | 40315383  |  Backend Developer  |


## Run the project

### Backend (Express + Nodemon)
From the repo root:
```bash
npm install
npm run dev
```

The server runs at `http://localhost:3000`.

### Frontend
The frontend runtime files are now organized as:
- `src/views` for HTML views
- `public/css` for styles
- `public/js` for client-side scripts
- `public/images` and `public/favicons` for static assets

### Backend structure
Server-side runtime files are now organized as:
- `src/server.js` for app startup
- `src/controllers/serverController.js` for route and controller logic
- `src/models/db/connection.js` for database connection

### Legacy sprint artifacts
Historical sprint artifacts were moved out of the runtime tree and archived under:
- `docs/archive/legacy-sprints`

## Database (MySQL)

### 1) Create the database and tables
Make sure MySQL is running, then run:
```bash
mysql -u root -p < "database/schema.sql"
```
(Enter password `12345678` when prompted.)

### 2) Environment variables
The backend reads DB credentials from:
- `.env`

Default values:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=12345678
DB_NAME=MealMajors
```

### 3) IntelliJ IDEA database setup
1. Open **View > Tool Windows > Database**.
2. Click **+ > Data Source > MySQL**.
3. Use:
   - Host: `localhost`
   - User: `root`
   - Password: `12345678`
   - Database: `MealMajors`
4. **Test Connection** and **OK**.
5. If tables don’t appear, open the **Schemas** tab, check `MealMajors`, then **Synchronize**.

### Seed app default recipes
To insert built-in recipes that appear in **Browse Recipes**:
```bash
npm run seed:defaults
```

CI rerun
