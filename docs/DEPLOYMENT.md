# Deployment — GitHub Pages

The repository ships with a workflow ([`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml))
that lints, tests, type-checks, builds and publishes on every push to `main`.

## One-time repository setup

1. Push this project to a GitHub repository.
2. In the repository: **Settings → Pages → Build and deployment → Source: GitHub
   Actions**.
3. *(Optional but recommended)* **Settings → Secrets and variables → Actions** — add:
   - `VITE_APPS_SCRIPT_URL` — the `/exec` URL from [SETUP.md](SETUP.md)
   - `VITE_GOOGLE_CLIENT_ID` — the OAuth client ID

   Without secrets the site still deploys; you then enter both values once on the
   app's Settings page (they persist per browser). Neither value is confidential — the
   client ID is public by design, and the script URL is useless without your Google
   identity — secrets are simply the tidier place for them.
4. Push to `main`. The site appears at
   `https://<username>.github.io/<repository-name>/`.

The workflow derives the base path from the repository name automatically
(`BASE_PATH=/<repo>/`), so renaming the repository just works on the next deploy.

## Custom domain

Point your domain at Pages as usual, then deploy with `BASE_PATH=/` (edit the env line
in the workflow) so assets resolve from the root.

## Local production check

```bash
npm run build
npm run preview     # serves dist/ locally
```

## After deploying

- Add the production origin (`https://<username>.github.io`) to the OAuth client's
  **Authorized JavaScript origins** — see [SETUP.md](SETUP.md) Part B.
- Visit the site once online; the service worker precaches the app and it will load
  offline from then on. When you ship a new version, users get a toast with a
  **Reload** action.
- Install it: browser menu → *Install app* (desktop/Android) or Share → *Add to Home
  Screen* (iOS).

## Routing note

The app uses hash-based routes (`/#/books/…`) because GitHub Pages cannot rewrite
arbitrary paths to `index.html`. Deep links, bookmarks and the installed PWA all work
without a 404 fallback hack.
