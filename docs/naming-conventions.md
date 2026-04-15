# Naming Conventions

## Client-Side File and Folder Names

- Use **kebab-case** for all client-side files and folders.
- Use clear, descriptive names that reflect purpose.
- Group scripts by responsibility under `public/js`:
  - `pages/` for page-specific behavior (`*-page.js`)
  - `components/` for reusable UI behavior (`*-component.js`)
  - `utils/` for shared helpers (`*-utils.js`)
  - `legacy/` for non-runtime historical scripts

## Client-Side Style Files

- Keep shared runtime styles in `public/css/base`.
- Use descriptive kebab-case names (for example `app-shell.css`).
- Keep non-runtime or historical styles under `public/css/legacy`.
