# セキュリティポリシー

[English](SECURITY.md)

## 脆弱性の報告

セキュリティの問題は、公開の Issue で報告しないでください。

代わりに、GitHub の非公開の脆弱性報告を使ってください。
リポジトリの **Security** タブを開き、**Report a vulnerability** を選びます
（<https://github.com/akiratamcat/joplin-plugin-dg-plantuml/security/advisories/new>）。

次の情報を含めてください。

- dg-plantuml と Joplin の版数、OS
- 問題が起きる PlantUML のソースまたはノート
- 何が起きたか、本来はどうなるべきか

報告は、報告した人と作者だけが見られます。回答は GitHub で行います。英語でも日本語でもかまいません。

## 対象

報告していただきたい問題の例:

- Joplin のノートビューアでスクリプトを実行できてしまう図
- プラグインがネットワーク通信をする、またはファイルを読む
- Joplin が応答しなくなる図

Joplin 本体の問題は [Joplin のプロジェクト](https://github.com/laurent22/joplin/security) に報告してください。
PlantUML のエンジンの問題は [PlantUML のプロジェクト](https://github.com/plantuml/plantuml) に報告できます。修正が公開されたら、同梱のエンジンを更新します。

## サポートする版

セキュリティの修正は、最新の公開版だけに行います。
