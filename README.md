# dg-plantuml

Render [PlantUML](https://plantuml.com/) diagrams in [Joplin](https://joplinapp.org/) notes, with the rendering engine bundled inside the plugin.

> **Bundled engine, no network access.**
> The PlantUML rendering engine is bundled inside this plugin.
> No external server (such as the public PlantUML server) is used, and the plugin
> makes no network requests. Your diagrams are rendered locally, and the plugin
> never sends your notes anywhere. It works fully offline.

This statement covers what the plugin itself does. Joplin's own features, such as synchronisation, are not part of the plugin.

[日本語の README](README.ja.md)

> **Status: early development (0.1.x).** The plugin is not yet available in the Joplin plugin repository. All features planned for version 1.0 are implemented; the first release is being prepared.

<!-- Screenshots (light and dark) will be added before the first release (docs/images/). -->

## Features

- Renders `plantuml` and `puml` code blocks in the note viewer and in the Rich Text editor, like Joplin's built-in Mermaid support.
- Uses the official PlantUML JavaScript engine ([`@plantuml/core`](https://www.npmjs.com/package/@plantuml/core)), bundled in the plugin. No Java, no Graphviz, no server.
- Follows Joplin's light and dark themes automatically.
- Shows syntax errors with the line number and the line in question.
- Keeps the diagram on screen while you type, and caches rendered diagrams.
- Works with Japanese, Chinese and Korean text.
- Settings for the diagram theme, styles (including built-in PlantUML themes), font size and more.
- The settings screen and messages follow Joplin's display language (11 languages).
- A toolbar on each diagram to copy it (SVG or PNG), save it as a file, or copy its source.
- Links in diagrams open Joplin notes or web pages.
- Syntax highlighting of PlantUML in the Markdown editor.

## Installation

Not yet published. When the first version is released, it can be installed from Joplin's plugin screen (Tools → Options → Plugins on Windows and Linux, Joplin → Settings → Plugins on macOS).

To try a development build, run `npm run dist` and install `publish/io.github.akiratamcat.dg-plantuml.jpl` with "Install from file" on the plugin screen.

Requirements: Joplin 3.1 or later, desktop. Tested with the latest stable version of Joplin.

## Usage

Write PlantUML in a fenced code block with the language `plantuml` or `puml`:

````markdown
```plantuml
Alice -> Bob : Hello
Bob --> Alice : Hi
```
````

- `@startuml` / `@enduml` can be omitted.
- Other diagram types work with their own start tag: `@startmindmap`, `@startgantt`, `@startjson`, `@startyaml`, `@startwbs`, `@startsalt` and so on.
- Fences of three or more backticks or tildes work. To put ```` ``` ```` inside a diagram, use a longer fence such as ````` ```` `````.

### Block options

Options can follow the language name:

````markdown
```plantuml theme=dark align=left
Alice -> Bob
```
````

| Option  | Values                      | Meaning                                                                 |
| ------- | --------------------------- | ----------------------------------------------------------------------- |
| `theme` | `light` / `dark` / `none`   | Style of this diagram. `none` adds no styling at all                    |
| `align` | `left` / `center` / `right` | Position of the diagram (default: `center`)                             |

Other Markdown tools ignore these options, so the notes stay portable.

## Limitations

- **Standard library**: `!include <...>` (C4, AWS icons and other libraries of the PlantUML standard library) is not available. It is shown as an error.
- **Files and URLs**: `!include` of local files and `!includeurl` are not available, because the plugin reads no files and makes no network requests.
- **Layout**: Graphviz is not bundled, because Joplin's viewer cannot run WebAssembly. Class, use case, state and component diagrams use PlantUML's built-in Smetana layout. They can look slightly different from diagrams made on plantuml.com.
- **Size**: diagrams larger than 8192 pixels in width or height are shown as an error by the engine.
- **One diagram per block**: only the first diagram of a block is shown.
- **Rich Text editor**: when you edit the source in Joplin's edit dialog and press OK, Joplin rewrites the fence with three backticks. A block whose source contains ```` ``` ```` can then break. This is how Joplin handles all code blocks, including Mermaid.
- **Mobile**: desktop only for now.

## Reporting problems

Please use the [Issues](https://github.com/akiratamcat/joplin-plugin-dg-plantuml/issues) page for bugs, questions and requests. For security problems, see [SECURITY.md](SECURITY.md).

## License

dg-plantuml is released under the [MIT License](LICENSE).

The plugin package also contains third-party software: the PlantUML engine (MIT), Twemoji graphics (CC-BY 4.0), Open Iconic (MIT) and DOMPurify (Apache-2.0). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Diagrams you make are yours. PlantUML's license says that generated images belong to the author of the diagram source.

## AI-assisted development

This plugin is developed with extensive use of generative AI (Anthropic's Claude).
A large share of the design documents, source code, tests, documentation, and
translations was produced with Claude. The maintainer reviews each output step by
step, decides what to adopt, and makes corrections as needed. The maintainer is
responsible for the final content. If you find a problem, please report it on the
Issues page.
