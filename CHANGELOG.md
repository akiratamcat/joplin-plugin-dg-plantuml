# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/).

Changes that users notice (settings, the look of diagrams, supported diagrams)
are always listed.

## [Unreleased]

### Added

- Rendering of `plantuml` and `puml` code blocks in the note viewer and the Rich Text editor, with the bundled PlantUML engine (`@plantuml/core` 1.2026.10). No network access.
- Fences of three or more backticks or tildes. `@startuml` / `@enduml` can be omitted.
- Block options `theme=light|dark|none` and `align=left|center|right`.
- Automatic light / dark style that follows Joplin's theme. A backdrop is added when a diagram's style differs from the page (for example `theme=dark` on a light theme).
- Error box with the line number and the line in question.
- Cache, debounce and display of the previous diagram while typing.
- Smetana layout for all diagrams (Graphviz cannot run in Joplin's viewer).
