# MealMajor (SOEN 341)

MealMajor is a web application that helps students plan weekly meals, manage dietary preferences/allergies, and browse or publish recipes.

## Team Members

| Name | Student ID | Role |
|---|---:|---|
| Raphael Hadgu | 40285317 | Documentation Specialist |
| Paul Haydn Louisma | 40285518 | Full Stack Developer |
| Emile Ghattas | 40282552 | Full Stack Developer |
| Mia Haidar | 40280890 | Documentation Specialist |
| Elfrid Jeffrey Kamdem Sindjoun | 40315383 | Backend Developer |

## Tech Stack

- Backend: Node.js, Express
- Frontend: HTML, CSS, Vanilla JavaScript
- Database: MySQL (`mysql2/promise`)
- Authentication/Security: `bcryptjs`
- Testing: Playwright
- CI: GitHub Actions
- Static analysis: Qodana

## Quick Start

### 1. Prerequisites

- Node.js 20+ (CI uses Node 20)
- npm
- MySQL

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the repo root:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=12345678
DB_NAME=MealMajors
PORT=3000
```

### 4. Create database schema

```bash
mysql -u root -p < database/schema.sql
```

### 5. (Optional) Seed default recipes

```bash
npm run seed:defaults
```

### 6. Run the app

Development mode (auto-restart):

```bash
npm run dev
```

Production-style start:

```bash
npm run start
```

Application URL: `http://localhost:3000`

## Available Scripts

- `npm run start`: start server from `src/server.js`
- `npm run dev`: start server with nodemon
- `npm run seed:defaults`: insert/update default recipes from `database/seeds/default-recipes.json`
- `npm run test:acceptance`: run Playwright acceptance tests
- `npm test`: alias for `npm run test:acceptance`

## Testing

Playwright tests are in `tests/`.

Run locally (same behavior as CI, where the server must be running):

Terminal 1:

```bash
npm run start
```

Terminal 2:

```bash
npm run test:acceptance
```

## Continuous Integration

CI is configured with GitHub Actions:

- Acceptance tests workflow: `.github/workflows/ci.yml`
- Qodana static analysis workflow: `.github/workflows/qodana_code_quality.yml`

What CI runs:

1. Checkout repository
2. Setup Node 20
3. Install dependencies
4. Install Playwright browsers
5. Start server
6. Wait for `http://localhost:3000`
7. Run acceptance tests

## Static Analysis

Static analysis runs with Qodana via GitHub Actions:

- Config: `qodana.yaml`
- Workflow: `.github/workflows/qodana_code_quality.yml`

## Project Structure

```text
public/
  css/
    base/
      app-shell.css
    legacy/
  js/
    components/
      site-navigation-component.js
    pages/
      *-page.js
    utils/
      auth-session-utils.js
    legacy/
  images/
  favicons/
src/
  controllers/
    serverController.js
  models/
    db/
      connection.js
  views/
  server.js
database/
  schema.sql
  seeds/
scripts/
  seed-default-recipes.js
tests/
docs/
  project-structure.md
  naming-conventions.md
  archive/
```

## Architecture Notes

- `src/server.js` is the entrypoint.
- `src/controllers/serverController.js` contains Express routes, request validation, and API logic.
- `src/models/db/connection.js` manages the MySQL connection pool.
- `src/views/` contains HTML pages served by Express.
- Static assets are served from `public/`.

## Naming Conventions

Naming conventions are documented in `docs/naming-conventions.md`.

Highlights:

- Use `kebab-case` for client-side file/folder names.
- `*-page.js` for page scripts.
- `*-component.js` for reusable UI scripts.
- `*-utils.js` for shared helper scripts.

## Key Files (Top 5)

- `src/controllers/serverController.js`: core routing and API logic.
- `src/server.js`: server startup.
- `src/models/db/connection.js`: DB connection pool.
- `database/schema.sql`: relational schema.
- `public/js/pages/weekly-planner-page.js`: weekly planner client logic.

## Prototype / Stub Areas

- `public/js/legacy/local-storage-auth-demo-page.js` is a legacy prototype script and not part of the runtime source of truth.
- `docs/archive/legacy-sprints/` contains historical sprint artifacts.
- `src/routes/`, `src/config/`, and `src/utils/` are currently placeholder directories.

## Troubleshooting

- `ER_ACCESS_DENIED_ERROR` or DB connection errors: verify `.env` credentials and that MySQL is running.
- `ECONNREFUSED` during tests: start the server before running Playwright tests locally.
- Empty browse/planner data: run `npm run seed:defaults` and ensure schema is applied.
