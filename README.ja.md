# dg-plantuml

[Joplin](https://joplinapp.org/) のノートで [PlantUML](https://plantuml.com/) の図を表示するプラグインです。描画エンジンをプラグインに内蔵しています。

> **描画エンジン内蔵・外部通信なし**
> PlantUML の描画エンジンをプラグインに内蔵しています。
> PlantUML の公開サーバーなどの外部サーバーは使わず、プラグインはネットワーク通信を一切行いません。
> 図は手元で描画され、ノートの内容が本プラグインによって外部に送られることはありません。オフラインでも動作します。

これは本プラグイン自身の動作についての説明です。Joplin 本体の同期などの機能は含みません。

[English README](README.md)

<!-- 最初のリリースまでに、スクリーンショット（Light と Dark）を docs/images/ に追加する。 -->

## 機能

- `plantuml` と `puml` のコードブロックを、ノートビューアとリッチテキストエディタで図として表示します。Joplin 本体の Mermaid と同じ扱いです。
- PlantUML 公式の JavaScript 版のエンジン（[`@plantuml/core`](https://www.npmjs.com/package/@plantuml/core)）をプラグインに内蔵しています。Java、Graphviz、サーバーは不要です。
- Joplin の Light / Dark のテーマに自動で合わせます。
- 構文エラーは、行番号と該当する行を表示します。
- 入力中も図を表示したままにし、描画した図をキャッシュします。
- 日本語・中国語・韓国語の文字を含む図も表示できます。
- 図のテーマ、スタイル（PlantUML の内蔵テーマを含む）、文字サイズなどを設定できます。
- 画面の文字（設定画面、メッセージ、ツールバーなど）は gettext の仕組みで翻訳しており、主要な言語に翻訳済みです。Joplin の表示言語に合わせて切り替わります。対応している言語は、英語、日本語、中国語（簡体字・繁体字）、韓国語、ドイツ語、フランス語、スペイン語、イタリア語、ポルトガル語（ブラジル）、ロシア語の11言語です。
- 図ごとのツールバーで、図のコピー（SVG・PNG）、ファイルへの保存、ソースのコピーができます。
- 図の中のリンクから、Joplin のノートやウェブページを開けます。
- Markdown エディターで、PlantUML のコードを色分けして表示します。

## インストール

Joplin のプラグインの画面（Windows と Linux はツール → オプション → プラグイン、macOS は Joplin → 設定 → プラグイン）で **dg-plantuml** を検索して、インストールします。

[GitHub Releases](https://github.com/akiratamcat/joplin-plugin-dg-plantuml/releases) から `.jpl` のファイルをダウンロードし、プラグインの画面の「ファイルからインストール」でインストールすることもできます。プラグインを自分でビルドする場合は、[CONTRIBUTING.ja.md](CONTRIBUTING.ja.md) をご覧ください。

動作環境：Joplin 3.1 以降のデスクトップ版。動作確認は Joplin の最新の安定版で行っています。

## 使い方

言語名を `plantuml` または `puml` にしたコードブロックに、PlantUML を書きます。

````markdown
```plantuml
Alice -> Bob : Hello
Bob --> Alice : Hi
```
````

- `@startuml` / `@enduml` は省略できます。
- ほかの種類の図は、それぞれの開始タグで書けます（`@startmindmap`、`@startgantt`、`@startjson`、`@startyaml`、`@startwbs`、`@startsalt` など）。
- フェンスは、バッククォートまたはチルダの3文字以上が使えます。図の中に ```` ``` ```` を書きたいときは、````` ```` ````` のような長いフェンスで囲みます。

### ブロックのオプション

言語名の後ろにオプションを書けます。

````markdown
```plantuml theme=dark align=left
Alice -> Bob
```
````

| オプション | 値                          | 意味                                                         |
| ---------- | --------------------------- | ------------------------------------------------------------ |
| `theme`    | `light` / `dark` / `none`   | この図のスタイル。`none` はスタイルの指定を一切加えない      |
| `align`    | `left` / `center` / `right` | 図の配置（既定は `center`）                                  |

ほかの Markdown のツールはこれらのオプションを無視するので、ノートの互換性は保たれます。

## 制限事項

- **標準ライブラリ**：`!include <...>`（C4、AWS のアイコンなど、PlantUML の標準ライブラリ）は使えません。エラーとして表示します。
- **ファイルと URL**：ローカルのファイルの `!include` と `!includeurl` は使えません。本プラグインはファイルを読まず、ネットワーク通信も行わないためです。
- **レイアウト**：Joplin のビューアでは WebAssembly が動かないため、Graphviz は同梱していません。クラス図、ユースケース図、状態図、コンポーネント図は、PlantUML 内蔵の Smetana レイアウトで描きます。plantuml.com で作った図と少し見た目が違うことがあります。
- **大きさ**：幅か高さが 8192 ピクセルを超える図は、エンジンがエラーとして表示します。
- **1ブロックに1つの図**：ブロックの中の最初の図だけを表示します。
- **リッチテキストエディタ**：Joplin の編集画面でソースを編集して OK を押すと、Joplin がフェンスを3文字のバッククォートに書き直します。ソースに ```` ``` ```` を含むブロックは、壊れることがあります。Mermaid を含め、Joplin のすべてのコードブロックで同じです。
- **モバイル**：今のところデスクトップ版だけに対応しています。

## 問題の報告

不具合、質問、要望は [Issues](https://github.com/akiratamcat/joplin-plugin-dg-plantuml/issues) でお知らせください。セキュリティの問題は [SECURITY.ja.md](SECURITY.ja.md) をご覧ください。プラグインのビルドや開発への参加については [CONTRIBUTING.ja.md](CONTRIBUTING.ja.md) をご覧ください。

## ライセンス

dg-plantuml は [MIT ライセンス](LICENSE) で公開しています。

プラグインのパッケージには、次の外部のソフトウェアも含まれています。ライセンスの全文は [THIRD_PARTY_NOTICES.ja.md](THIRD_PARTY_NOTICES.ja.md)（英語版は [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)）にあり、プラグインのパッケージにも同梱しています。同じ一覧は、Joplin の本プラグインの設定画面にも表示されます。

| 名称 | バージョン | ライセンス | 公式サイト |
| ---- | ---------- | ---------- | ---------- |
| PlantUML（`@plantuml/core`）。描画エンジン | 1.2026.10 | MIT | <https://plantuml.com/> |
| Twemoji の画像（絵文字。エンジンに含まれる） | PlantUML 1.2026.10 に含まれるもの | CC-BY 4.0 | <https://github.com/twitter/twemoji> |
| Open Iconic（アイコン。エンジンに含まれる） | PlantUML 1.2026.10 に含まれるもの | MIT | <https://github.com/iconic/open-iconic> |
| DOMPurify（SVG の出力の無害化） | 3.4.17 | Apache-2.0（Apache-2.0 と MPL-2.0 のデュアルライセンス） | <https://github.com/cure53/DOMPurify> |
| regenerator-runtime（DOMPurify に含まれる） | DOMPurify 3.4.17 に含まれるもの | MIT | <https://github.com/facebook/regenerator> |

`LICENSE` は法的な文面のため、英語の原文だけを置いています。

作成した図は作者のものです。PlantUML のライセンスでは、生成された画像は図のソースの作者に属するとされています。

## 生成 AI の利用について

本プラグインは、生成 AI（Anthropic の Claude）を全面的に用いて開発しています。
設計書、ソースコード、テスト、ドキュメント、翻訳のかなりの部分を Claude で作成しました。
作者が Claude の出力を逐次確認し、採用するかどうかの判断と修正を行っており、
最終的な内容の責任は作者が負います。問題を見つけた場合は Issue でお知らせください。
