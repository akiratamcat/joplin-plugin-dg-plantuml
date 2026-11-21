# Changelog

[日本語](CHANGELOG.ja.md)

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/).

Changes that users notice (settings, the look of diagrams, supported diagrams)
are always listed. The Japanese version (`CHANGELOG.ja.md`) has the same content.

## [Unreleased]

### Added

- Rendering of `plantuml` and `puml` code blocks in the note viewer and the Rich Text editor, with the bundled PlantUML engine (`@plantuml/core` 1.2026.10). No network access.
- Fences of three or more backticks or tildes. `@startuml` / `@enduml` can be omitted.
- Block options `theme=light|dark|none` and `align=left|center|right`.
- Automatic light / dark style that follows Joplin's theme. A backdrop is added when a diagram's style differs from the page (for example `theme=dark` on a light theme).
- Error box with the line number and the line in question.
- Cache, debounce and display of the previous diagram while typing.
- Smetana layout for all diagrams (Graphviz cannot run in Joplin's viewer).
- Settings screen (Tools → Options → Plugins → dg-plantuml): diagram theme (Auto / Light / Dark), style for the light and the dark theme, transparent background, font size, minimum font size, custom preamble, diagram font, extra language names, time limit, maximum source length, cache size. Changes apply when you return to the note.
- Styles: PlantUML standard, PlantUML dark, Joplin light, a custom preamble, and the built-in PlantUML themes that are readable on a light or a dark page.
- The base font size of diagrams follows the note text. Wide diagrams are scaled down to the pane, but not below the minimum font size (11 px by default); then they scroll sideways.
- Theme, style and font settings also apply to mind maps, WBS, Gantt charts, JSON, YAML, EBNF and regex diagrams.
- Translations: the settings screen and the messages in the note viewer follow Joplin's display language. Japanese, Chinese (Simplified and Traditional), Korean, German, French, Spanish, Portuguese (Brazil), Italian and Russian. The translations were made with generative AI (the Japanese one was checked by the maintainer); corrections are welcome. Error messages from the PlantUML engine itself stay in English.
- Diagram toolbar: copy the diagram as SVG or PNG, save it as an SVG or PNG file in a folder you choose, or copy its PlantUML source. Shown on mouse-over, on keyboard focus or after a tap; it can be turned off.
- Links in diagrams (`[[link]]`): links to Joplin notes open the note, web links open in the browser. Other kinds of links are not opened.
- Syntax highlighting of PlantUML code blocks in the Markdown editor, with the colours of the editor's theme; it can be turned off. The line shown in an error box is coloured too.
- The settings screen lists the bundled third-party software (name, version, license, website). The plugin package also contains the license notices in Japanese (`THIRD_PARTY_NOTICES.ja.md`).
