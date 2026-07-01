# NOODS Landing Page

## Cursor Cloud specific instructions

This is a fully static site (plain HTML/CSS/JS) with **no build step, no package manager, and no dependencies**. There is nothing to install.

- Run it with a static file server from the repo root: `python3 -m http.server 8080`, then open http://localhost:8080.
- Entry point is `index.html`; styles in `css/styles.css`; behavior in `js/main.js` (signup modal open/close, form validation, hero video autoplay, sticky header on scroll).
- There is no lint, test, or build tooling configured. "Building/running" means serving the static files.
- To verify core functionality: click the CTA button to open the signup modal, submit the form with a valid name + email, and confirm the success message appears.
