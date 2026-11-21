# PlantUML engine (vendored)

These files are copied unchanged from the npm package `@plantuml/core`.
Do not edit them. To update the engine, follow the steps below.

| Item | Value |
| ---- | ----- |
| Package | `@plantuml/core` |
| Version | 1.2026.10 |
| Tarball | https://registry.npmjs.org/@plantuml/core/-/core-1.2026.10.tgz |
| npm integrity | `sha512-m67zsiUiJGAUfrk7xM2i3b9Y8HPefXder+v7STblGZgW96GUOnJTCBfJAX1d9ElDzV9d7zrEJO9S7/FHfkaGMg==` |
| License | MIT (see `LICENSE`; versions 1.2026.6 and later are MIT) |
| Retrieved | 2026-11-19 |

## Files

| File | SHA-256 | Use |
| ---- | ------- | --- |
| `plantuml.js` | `c6664799aaa464319b5e1070a69850b93a7ea23ee41a23e920a8f2086e7da21c` | Engine (ES module) |
| `themes.js` | `6b6d2ef1590a29dfc24c1462b56dfd3b31757724da3627af5ea15dc1e991bb6d` | `!theme` definitions |
| `emoji.js` | `e3b97a103b48bb00a6d77cf0667f3a0fda0a3799cfbc5e22494fcde024a18e49` | Emoji data, loaded only when a diagram uses emoji |
| `openiconic.js` | `b34a6d7c0315ad4c1d780bcfe92e7bfa89abbd4fa20ae419e3409f1cc4f56c52` | Open Iconic data, loaded only when a diagram uses icons |
| `LICENSE` | `b0475db7325c48eede0eee5e44aea92dad28c755aed4484a6cdde99cedea9446` | PlantUML license (MIT) |

Not included: `viz-global.js` (Graphviz needs WebAssembly, which the Joplin
note viewer does not allow; the plugin uses the Smetana layout instead) and
the demo pages of the package. See `docs/design.ja.md` (4.2, 8.5).

## Updating

Update the engine only for security fixes or necessary bug fixes
(`docs/design.ja.md`, D-10).

1. `npm pack @plantuml/core@<version>` and check that the tarball's sha512
   matches `npm view @plantuml/core@<version> dist.integrity`.
2. Check that the license is still MIT, and whether the package bundles any
   new third-party data (like the Twemoji and Open Iconic data today).
3. Copy the files listed above (byte for byte; `.gitattributes` keeps Git from
   changing their line endings) and update this file: version, tarball,
   integrity, SHA-256, retrieval date.
4. Update the version in the other places. `npm run licenses:check` fails
   until all of them match this file:
   - `ENGINE_VERSION` in `src/contentScript/engine.ts` (part of the cache key),
   - the versions in `src/thirdParty.ts` (shown on the settings screen),
   - the component tables in `README.md` and `README.ja.md`,
   - then run `npm run notices` to rebuild `THIRD_PARTY_NOTICES.md` and
     `THIRD_PARTY_NOTICES.ja.md`.
5. If `themes.js` changed, regenerate `BUILTIN_THEMES` in
   `src/presets/builtinThemes.ts` (`tests/presets.test.ts` shows the
   difference). For a new theme, check its readability in the theme gallery
   (`tests/render/themeGallery.probe.ts`), record it in
   `tests/manual/theme-review.md`, and update `LIGHT_THEMES` / `DARK_THEMES`.
6. Run `npm test`. The saved engine output in `tests/fixtures/engine` (error
   and crash SVGs) may need to be saved again from the new engine if its
   error format changed. The rendering tests "the sequence diagram after
   class-like diagrams is a sequence diagram" and "no engine state leaks"
   show whether the `RESET_LINES` workaround in `engine.ts` still works (see
   `docs/lessons-learned.ja.md`).
7. Try the plugin in Joplin (the manual tests of design 16.3), and write the
   change in `CHANGELOG.md` / `CHANGELOG.ja.md`. If diagrams look different,
   release as a MINOR version (design 21.2).
