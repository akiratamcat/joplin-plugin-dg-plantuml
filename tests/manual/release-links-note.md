# dg-plantuml release test note: toolbar and links

For the manual tests M-10 (diagram toolbar) and M-11 (links in diagrams), design 16.3. See release-manual-tests.ja.md.

Before you start: in block 2, replace `0123456789abcdef0123456789abcdef` with the ID of another note in Joplin (right-click a note → "Copy Markdown link" gives `[title](:/ID)`; use the 32 characters after `:/`).

## 1. Toolbar (copy and save)

```plantuml
actor User
participant "Joplin" as J
User -> J : open a note
J --> User : diagram
note right of J : Copy me as SVG or PNG
```

## 2. Links: a Joplin note and a web page

```plantuml
class "Another note" [[:/0123456789abcdef0123456789abcdef]]
class "PlantUML website" [[https://plantuml.com/]]
"Another note" --> "PlantUML website"
```

## 3. A link that must not open (file: is refused)

```plantuml
class "Local file" [[file:///C:/Windows/win.ini]]
```

## 4. Dark diagram (the PNG gets a dark background)

```plantuml theme=dark
Alice -> Bob : hello
Bob --> Alice : hi
```
