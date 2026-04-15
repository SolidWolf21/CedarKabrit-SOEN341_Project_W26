# Project Structure

## Runtime Structure

```text
/public
  /css
    /base
      app-shell.css
    /legacy
  /js
    /components
      site-navigation-component.js
    /pages
      *-page.js
    /utils
      auth-session-utils.js
    /legacy
  /images
  /favicons
/src
  /controllers
  /models
    /db
  /views
  server.js
/database
  schema.sql
  /seeds
/scripts
  seed-default-recipes.js
/docs
  /archive
    /legacy-sprints
/tests
```

## Notes

- `src/server.js` is the application entry point.
- `src/controllers/serverController.js` contains route handlers and request logic.
- `src/models/db/connection.js` contains database connectivity.
- Static assets are served from `public`.
- Client-side runtime code is organized by type under `public/js` (`pages`, `components`, `utils`).
- Runtime client-side names use kebab-case and descriptive suffixes (`-page.js`, `-component.js`, `-utils.js`).
- SQL and seed data are in `database`.
- Utility scripts are in `scripts`.
- Historical sprint files are archived in `docs/archive/legacy-sprints` and are not part of the runtime source of truth.
