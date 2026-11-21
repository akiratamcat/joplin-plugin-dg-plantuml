# リリース手順

設計書 21.4節の手順の詳細。GitHub のリポジトリと npm の公開用アカウントができるまでは、この手順はまだ使えない（設計書 18章の段階0.5）。

## 0. GitHub に push する前（毎回）

公開のリポジトリに push すると、そのブランチの全履歴が公開され、後から消すのは難しい。push の前に、毎回次を確かめる。

1. `npm run check:publish`（ブランチを指定するときは `npm run check:publish -- <ブランチ名>`）が `check:publish: OK` になる。このスクリプトは、push するブランチの全履歴について、次を調べる。
   - コミットの作者とコミッターのメールアドレスが、許可したもの（`akiratamcat@gmail.com`）だけであること。outlook.jp のアドレスは使わない（2026-11-19 に履歴も gmail に書き換え済み）。
   - 公開してはいけないファイル（`.env`、ログ、エディタの個人設定、`dist/`、`publish/`、`node_modules/`、試作の `spike/` など）が、最新の版に入っていないこと。過去のコミットにだけあるものは注意として表示されるので、中身に個人の情報がないことを確かめる。
   - ファイルの中身に、トークンや秘密鍵らしい文字列、PC のパス（`C:\Users\…` など）がないこと。
2. **push するのは `main` だけ**にする（`git push -u origin main`）。作業用のブランチを共有したいときだけ、そのブランチを名前を指定して push する。`git push --all` と `git push --mirror` は使わない。試作のブランチ（`spike/engine`、`spike/plugin`）は使い捨てなので、push しない（設計書 18章）。
3. 作者の gmail のアドレスは、コミットの情報として公開される（オーナーが gmail で公開すると決めた）。そのため、GitHub の「Block command line pushes that expose my email」は有効にしない（有効にすると push が止まる）。
4. 最初の push の後、GitHub のリポジトリの設定で次を有効にする。
   - Secret scanning と Push protection（公開リポジトリでは無料。秘密の情報を含む push を GitHub が止める）
   - Private vulnerability reporting（`SECURITY.md` の案内先。設計書 21.1節）
   - Dependabot alerts

## 1. 準備

1. `main` が最新で、作業中のファイルがないことを確かめる。
2. `npm audit` を実行し、配布物に含まれる依存パッケージに脆弱性がないことを確かめる。
3. `CHANGELOG.md` と `CHANGELOG.ja.md` の `[Unreleased]` を `[X.Y.Z] - YYYY-MM-DD` に変える。利用者に影響する変更（設定、図の見た目、対応する図）を必ず書く。2つのファイルの内容をそろえる（リリースノートには英語版の `CHANGELOG.md` が使われる）。
4. 版数を上げる（設計書 21.2節）。`package.json` と `src/manifest.json` の `version` を同じ値にする。
5. エンジンを更新した場合は、`vendor/plantuml/SOURCE.md` の「Updating」の手順をすべて済ませたことを確かめる（ライセンス、版数を書く場所、内蔵テーマの一覧、テスト）。
6. エンジンや DOMPurify を更新した場合は、`src/thirdParty.ts`（設定画面に出す一覧）と、`README.md`・`README.ja.md` の同梱ソフトウェアの表の版数を直し、`npm run notices` で `THIRD_PARTY_NOTICES.md` と `THIRD_PARTY_NOTICES.ja.md` を作り直す。`npm run licenses:check`（`npm test` から自動で実行される）は、これらの直し忘れと、許可していないライセンスの依存パッケージを検出する。

## 2. 確認

1. `npm test`、`npm run typecheck`、`npm run lint` がすべて通る。
2. `npm run dist` で作った `.jpl` を手元の Joplin にインストールし、設計書 16.3節の手動テストを行う。環境ごとの範囲は 16.3節のとおり。結果を下の「記録」に書く。
3. 外部通信なしの手動確認（設計書 16.4節の (4)）を行う。
4. 初回の公開（v1.0.0）では、設計書 21.6節の公開前チェックリストをすべて確かめる。

手動テストに合格するまで、タグを push しない。

## 3. 公開

1. `main` にマージし、タグ `vX.Y.Z` を作って push する。
2. リリース用のワークフロー（`.github/workflows/release.yml`）が、検査とビルドを行い、GitHub Releases にリリースを作る。`.jpl`、`LICENSE`、`THIRD_PARTY_NOTICES.md`、`THIRD_PARTY_NOTICES.ja.md` が添付され、リリースノートの先頭に「描画エンジン内蔵・外部通信なし」の定型文が入る。
3. npm への公開は、公開用のアカウントと Trusted Publishing の設定ができてから有効にする（リポジトリの変数 `NPM_PUBLISH` を `true` にする）。

## 4. 公開後

1. Joplin 公式プラグイン一覧に新しい版が出たことを確かめる（npm への公開から反映まで時間がかかる）。
2. Joplin のプラグインの画面から、新しい版に更新できることを確かめる。

## 記録

リリースごとに、手動テストの結果を残す。

| 版 | 日付 | 環境 | 範囲 | 結果 | メモ |
| -- | ---- | ---- | ---- | ---- | ---- |
| | | | | | |
