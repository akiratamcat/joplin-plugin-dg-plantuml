# Security policy

## Reporting a vulnerability

Please do not report security problems in public issues.

Use GitHub's private vulnerability reporting instead:
open the repository's **Security** tab and choose **Report a vulnerability**
(https://github.com/akiratamcat/joplin-plugin-dg-plantuml/security/advisories/new).

Please include:

- the version of dg-plantuml and of Joplin, and your operating system,
- a PlantUML source or note that shows the problem, and
- what happens and what you expected.

The report is visible only to you and the maintainer. You will get an answer on GitHub.

## Scope

Examples of problems we want to hear about:

- a diagram that runs script in Joplin's note viewer,
- the plugin making a network request, or reading files,
- a diagram that makes Joplin stop responding.

Problems in Joplin itself should be reported to the [Joplin project](https://github.com/laurent22/joplin/security).
Problems in the PlantUML engine can be reported to the [PlantUML project](https://github.com/plantuml/plantuml); we will update the bundled engine when a fix is available.

## Supported versions

Only the latest released version receives security fixes.
