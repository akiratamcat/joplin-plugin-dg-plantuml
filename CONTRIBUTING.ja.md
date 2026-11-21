# dg-plantuml への貢献

[English](CONTRIBUTING.md)

関心を持っていただき、ありがとうございます。不具合の報告、アイデア、翻訳、プルリクエストを歓迎します。

## 始める前に

- 不具合や要望は、まず [Issue](https://github.com/akiratamcat/joplin-plugin-dg-plantuml/issues) を作ってください。
- セキュリティの問題は、公開の Issue にしないでください。[SECURITY.ja.md](SECURITY.ja.md) をご覧ください。
- 設計は [docs/design.ja.md](docs/design.ja.md) に書いています。`docs/` の文書は日本語版だけです（`*.ja.md`）。
  - `design.ja.md`：設計書（要件、構成、テスト、リリース）
  - `lessons-learned.ja.md`：調査やテストで判明し、設計やコードを変えた事柄（エンジンの癖、Joplin の動作）
  - `release.ja.md`：リリースの手順と、GitHub に push する前の確認
  - `owner-decisions.ja.md`：作者（オーナー）が決めた事項

## 開発環境

- Node.js 22 以降と npm（CI は Node.js 22 を使います）
- Google Chrome（描画テストで使います。ブラウザーのダウンロードは不要です）
- 動作を試すための Joplin デスクトップ版 3.1 以降

```sh
npm ci
npm run dist        # publish/io.github.akiratamcat.dg-plantuml.jpl を作る
```

作った `.jpl` を、Joplin のプラグインの画面（ツール → オプション → プラグイン。macOS は Joplin → 設定 → プラグイン）の「ファイルからインストール」でインストールし、Joplin を再起動します。

## ファイルの構成

| 場所 | 内容 |
| ---- | ---- |
| `src/index.ts` | プラグインのメインスクリプト（設定、コンテンツスクリプトの登録、ビューアからのメッセージ） |
| `src/contentScript/` | Markdown-it プラグイン、ビューアスクリプト（描画、キャッシュ、ツールバー）、エンジンの読み込み、CodeMirror プラグイン |
| `src/shared/` | 両方で使うコード（フェンスの解析、トークナイザー、メッセージ） |
| `src/i18n/` | gettext の実装。`catalog/catalogs.json` は `npm run i18n:compile` が生成する |
| `src/presets/` | 同梱のスタイルと、PlantUML のテーマの一覧 |
| `vendor/plantuml/` | PlantUML のエンジン。変更せずにコピーしたもの（`SOURCE.md` を参照） |
| `locales/` | 翻訳（gettext の PO ファイル） |
| `scripts/` | 翻訳、ライセンス、公開前の確認のスクリプト |
| `tests/` | 単体テスト。`tests/render/` は描画テスト。`tests/manual/` は手動テストの手順と記録（`*.ja.md`。日本語）と、Joplin に貼り付けるテスト用のノート（`*.md`。英語） |

## コマンド

| コマンド | 内容 |
| -------- | ---- |
| `npm run dist` | プラグインのパッケージ（`publish/*.jpl`）を作る |
| `npm test` | 単体テストの後に描画テストを行う |
| `npm run test:unit` | 翻訳のコンパイルと検査、ライセンスの検査の後に、単体テストと外部通信なしの静的検査を行う（ビルド不要） |
| `npm run test:render` | プラグインをビルドし、ネットワークを遮断したヘッドレスの Chrome で図を描画して確かめる |
| `npm run typecheck` | TypeScript の型チェック |
| `npm run lint` | ESLint |
| `npm run i18n:extract` | ソースコードから `locales/plantuml.pot` とすべての PO ファイルを更新する |
| `npm run i18n:check` | PO ファイルを検査する（プレースホルダー、複数形、fuzzy） |
| `npm run i18n:compile` | PO ファイルから `src/i18n/catalog/catalogs.json` を作る（`dist`、`test:unit`、`typecheck` から自動で実行される） |
| `npm run notices` | `THIRD_PARTY_NOTICES.md` と `THIRD_PARTY_NOTICES.ja.md` を作り直す |
| `npm run licenses:check` | 同梱するパッケージのライセンスと、ライセンス表示・版数の一覧が最新かを検査する |
| `npm run check:publish` | GitHub に push する前に、ブランチの履歴を検査する（メールアドレス、公開してはいけないファイル、秘密の情報）。作者用。`docs/release.ja.md` を参照 |

プルリクエストを作る前に、`npm test`、`npm run typecheck`、`npm run lint` を実行してください。
描画テストで別の Chromium を使うときは、環境変数 `DG_CHROME_PATH` にその実行ファイルを指定します。

## ブランチとプルリクエスト

GitHub Flow で運用します。

- 長く続くブランチは `main` だけで、いつでもリリースできる状態に保ちます。リリースは `main` に付けるタグ `vX.Y.Z` です。
- `main` からブランチを切り、接頭辞を付けます。`feature/…`（機能の追加・変更）、`fix/…`（不具合の修正）、`docs/…`（文書だけの変更）。
- `main` へのプルリクエストを作ります。CI（lint、型チェック、Windows・macOS・Linux でのテスト）が通るとマージできます。作者自身の変更もプルリクエストを通します。
- マージはマージコミットで行います（スカッシュやリベースによるマージは使いません）。作業の区切りが履歴に残るようにするためです。
- マージしたブランチは消します（GitHub が自動で消します）。コミットは `main` に残ります。
- 公開済みの版の修正は、`main` から切った `fix/…` ブランチで行い、新しい PATCH の版として公開します。古い版には修正を出しません。
- `spike/…` のブランチは使い捨ての試作です。マージも push もしません。

## 規則

- **外部通信なし。** プラグインはネットワーク通信をしてはいけません（README を参照）。通信するコードや依存パッケージを加えないでください。静的検査（`tests/network.test.ts`）は、通信するコードが増えると失敗します。
- **PlantUML のエンジン**（`vendor/plantuml/`）は変更しません。更新はセキュリティの修正か、必要な不具合の修正のときだけです。更新の手順は `vendor/plantuml/SOURCE.md` にあります。
- **依存パッケージ**は版数を固定します。プラグインに入るパッケージは、`scripts/check-licenses.mjs` の許可リストにあるライセンスでなければならず、`scripts/notices.mjs` と `src/thirdParty.ts` への追加も必要です。
- **PlantUML 本体（Java 版）のコードを写さないでください。** 一部が GPL で、本プラグインは MIT です。
- **文書**：リポジトリの直下の文書には、英語版と日本語版（`*.ja.md`）があります。両方を更新するか、翻訳が必要な方をプルリクエストに書いてください。

## 翻訳

翻訳は `locales/` の gettext の PO ファイル（`ja.po`、`de.po` など）です。Poedit やテキストエディターで編集できます。今の翻訳は生成 AI で作ったものなので、ネイティブの方の修正を特に歓迎します。

- 翻訳を直すときは、`locales/<locale>.po` の `msgstr` を編集し、`npm run i18n:check` を実行します。
- `{line}`、`{name}` などのプレースホルダーはそのまま残します。PlantUML、Joplin、`@startuml`、`\n` などは翻訳しません。翻訳者への注記は `#.` のコメントです。
- ソースコードの文言を変えたら、`npm run i18n:extract` で `locales/plantuml.pot` とすべての PO ファイルを更新します。
- 新しい言語を加えるには、`scripts/i18n-common.mjs` と `src/i18n/gettext.ts`（複数形の規則）への追加が必要です。

翻訳されていない文言は英語で表示されます。

## 貢献のライセンス

dg-plantuml は MIT ライセンスで公開しています。貢献（コード、翻訳、文書）を送ることで、それを MIT ライセンスで提供することに同意したものとします。

## 生成 AI

本プロジェクトは生成 AI（Anthropic の Claude）を全面的に用いて開発しており、すべての変更を作者が確認しています。
作業に生成 AI は必要ありません。上の文書とコマンドだけで作業できます。
貢献に生成 AI を使ってもかまいませんが、次をお願いします。

- 送る前に、結果を自分で確認し、テストすること
- 生成 AI を使ったことと、その用途をプルリクエストに書くこと
