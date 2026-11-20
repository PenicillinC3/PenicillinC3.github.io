# Whole-Site Loading and Theme

## Loader

- [x] Generate `dist/site-preload.json` in the Astro build hook. Include emitted page HTML, CSS, JavaScript, and font files. Exclude images and the unused Helvetica loader font.
- [x] In development, enumerate content routes and local fonts in `src/lib/prefetch-manifest.ts`. Discover styles and scripts referenced by the rendered pages. Accept the expected HTML 404 response from `/404.html`.
- [x] Show resource completion in four stages. Keep the loader visible for at least 5 seconds and while eligible requests are pending. Retry failed requests once, cap each request at 60 seconds, and display failed counts without marking those resources loaded.
- [x] Use the local Anthropic Sans Text Regular and Display Bold for every visible loader character. Apply a white canvas in light mode and a black canvas in dark mode.
- [x] Preserve typed log lines and the bracket exit. Character animals stay visible after appearing and move out with the loader panels. The site entry animation plays on the first full homepage visit in a tab. The development-only `/loader-preview/` loops through simulated resource counts.

## Theme

- [x] Set `html[data-theme]` in the document head from system preference or a saved manual selection. Keep it in sync during Astro navigation.
- [x] Add a navigation button that toggles the theme and saves the choice to `localStorage`.
- [x] Apply semantic color tokens throughout the site. Keep the photography darkroom styling within the media stage.

## Verification

- Run `npm.cmd run build`, then `node --test --test-isolation=none tests/site-preload.test.mjs` and `git diff --check`.
- Verify both Anthropic Sans faces, exact loader background colors, and responsive layout in Edge.
- Hold a built detail-page response past 5 seconds and confirm the loader remains until the response arrives. Confirm no image is requested by the preload manifest.
- Check theme selection, persistence, and mobile navigation after a client-side route change.
