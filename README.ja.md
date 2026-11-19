# dg-plantuml

[Joplin](https://joplinapp.org/) のノートで [PlantUML](https://plantuml.com/) の図を表示するプラグインです。描画エンジンをプラグインに内蔵しています。

> **描画エンジン内蔵・外部通信なし**
> PlantUML の描画エンジンをプラグインに内蔵しています。
> PlantUML の公開サーバーなどの外部サーバーは使わず、プラグインはネットワーク通信を一切行いません。
> 図は手元で描画され、ノートの内容が本プラグインによって外部に送られることはありません。オフラインでも動作します。

これは本プラグイン自身の動作についての説明です。Joplin 本体の同期などの機能は含みません。

[English README](README.md)

> **状態：開発の初期段階（0.1.x）です。** Joplin のプラグイン一覧にはまだ公開していません。設定画面、翻訳、図のツールバーは未実装です。

<!-- 最初のリリースまでに、スクリーンショット（Light と Dark）を docs/images/ に追加する。 -->

## 機能

- `plantuml` と `puml` のコードブロックを、ノートビューアとリッチテキストエディタで図として表示します。Joplin 本体の Mermaid と同じ扱いです。
- PlantUML 公式の JavaScript 版のエンジン（[`@plantuml/core`](https://www.npmjs.com/package/@plantuml/core)）をプラグインに内蔵しています。Java、Graphviz、サーバーは不要です。
- Joplin の Light / Dark のテーマに自動で合わせます。
- 構文エラーは、行番号と該当する行を表示します。
- 入力中も図を表示したままにし、描画した図をキャッシュします。
- 日本語・中国語・韓国語の文字を含む図も表示できます。

## インストール

まだ公開していません。最初の版を公開したら、Joplin のプラグインの画面（Windows と Linux はツール → オプション → プラグイン、macOS は Joplin → 設定 → プラグイン）からインストールできるようになります。

開発中の版を試す場合は、`npm run dist` を実行し、プラグインの画面の「ファイルからインストール」で `publish/io.github.akiratamcat.dg-plantuml.jpl` を選びます。

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

不具合、質問、要望は [Issues](https://github.com/akiratamcat/joplin-plugin-dg-plantuml/issues) でお知らせください。セキュリティの問題は [SECURITY.md](SECURITY.md) をご覧ください。

## ライセンス

dg-plantuml は [MIT ライセンス](LICENSE) で公開しています。

プラグインのパッケージには、外部のソフトウェアも含まれています。PlantUML のエンジン（MIT）、Twemoji の画像（CC-BY 4.0）、Open Iconic（MIT）、DOMPurify（Apache-2.0）です。詳しくは [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) をご覧ください。

作成した図は作者のものです。PlantUML のライセンスでは、生成された画像は図のソースの作者に属するとされています。

## 生成 AI の利用について

本プラグインは、生成 AI（Anthropic の Claude）を全面的に用いて開発しています。
設計書、ソースコード、テスト、ドキュメント、翻訳のかなりの部分を Claude で作成しました。
作者が Claude の出力を逐次確認し、採用するかどうかの判断と修正を行っており、
最終的な内容の責任は作者が負います。問題を見つけた場合は Issue でお知らせください。
