# SOEN-341
For the project of soen 341

## Run the project

### Backend (Express + Nodemon)
From the repo root:
```bash
npm install
npm run dev
```

The server runs at `http://localhost:3000` and serves the frontend from `Sprint 1/frontend`.

### Frontend
The frontend is static files in:
- `Sprint 1/frontend/index.html`

## Database (MySQL)

### 1) Create the database and tables
Make sure MySQL is running, then run:
```bash
mysql -u root -p < "Sprint 1/backend/db/schema.sql"
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
