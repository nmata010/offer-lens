# OfferLens Release Notes

This document captures operational release details for the project maintainer.
It is intentionally more practical than public-facing.

## Deploy

This repo includes a GitHub Pages workflow at `.github/workflows/deploy-pages.yml`.

To publish it:

1. Push the repo to GitHub.
2. In the repository settings, open **Pages**.
3. Set **Build and deployment** to **GitHub Actions**.
4. Push to `staging`, push to `main`, or run the workflow manually.

Both `staging` and `main` can deploy. GitHub Pages serves the most recent
successful deployment, so pushing to `staging` previews staged work and merging
to `main` publishes the stable version.

The Vite base path is detected from `GITHUB_REPOSITORY`, so project pages like
`https://<user>.github.io/offerlens/` work without changing local dev.

## Pre-Release Check

Before release, run:

```bash
npm run lint
npm run build
npm test -- --run
```

Also check that `public/screenshot.png` reflects the current UI if the benefits
chart, layout, or primary controls have changed.

