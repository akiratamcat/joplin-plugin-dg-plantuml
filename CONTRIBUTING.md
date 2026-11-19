# Contributing to dg-plantuml

Thank you for your interest. Bug reports, ideas, translations and pull requests are welcome.

## Before you start

- For bugs and requests, please open an [issue](https://github.com/akiratamcat/joplin-plugin-dg-plantuml/issues) first.
- For security problems, do not open a public issue. See [SECURITY.md](SECURITY.md).
- The design is described in [docs/design.md](docs/design.md) (in Japanese).

## Development environment

- Node.js 22 or later and npm
- Google Chrome (used by the rendering tests; no browser download is needed)
- Joplin desktop, to try the plugin

```sh
npm ci
npm run dist        # builds publish/io.github.akiratamcat.dg-plantuml.jpl
```

Install the `.jpl` with "Install from file" on Joplin's plugin screen.

## Checks

| Command | What it does |
| ------- | ------------ |
| `npm test` | Unit tests, then the rendering tests |
| `npm run test:unit` | Unit tests and the static network check (no build needed) |
| `npm run test:render` | Builds the plugin, then renders diagrams in headless Chrome with the network blocked |
| `npm run typecheck` | TypeScript type check |
| `npm run lint` | ESLint |

Please run `npm test`, `npm run typecheck` and `npm run lint` before you open a pull request.
To use another Chromium build for the rendering tests, set `DG_CHROME_PATH` to its executable.

## Rules

- **No network access.** The plugin must not make network requests (see the README). Do not add code or dependencies that do. The static check (`tests/network.test.ts`) fails on new network code.
- **The PlantUML engine** in `vendor/plantuml/` is kept unchanged. It is updated only for security fixes or needed bug fixes. See `vendor/plantuml/SOURCE.md`.
- **Dependencies** are pinned to exact versions.
- **Do not copy code from PlantUML itself** (the Java project). Parts of it are GPL, and this plugin is MIT.

## Translations

Translations will use gettext PO files in `locales/` (planned). The current translations are made with generative AI, so corrections by native speakers are very welcome.

## License of contributions

dg-plantuml is released under the MIT License. By submitting a contribution (code, translations, documentation), you agree that it is provided under the MIT License.

## Generative AI

This project is developed with extensive use of generative AI (Anthropic's Claude), and the maintainer reviews every change.
You may use generative AI for your contribution, but please:

- review and test the result yourself before you submit it, and
- say in the pull request that you used generative AI, and for what.
