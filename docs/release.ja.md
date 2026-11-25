# リリース手順

設計書 21.4節の手順の詳細。GitHub のリポジトリ（2026-11-21）と npm の公開用アカウント `akiratamcat` はできている。v1.0.0 は 2026-11-22 に公開した。npm への最初の公開は手で行い、2回目の版から GitHub Actions で公開する（下の「3. 公開」）。

## 0. GitHub に push する前（毎回）

公開のリポジトリに push すると、そのブランチの全履歴が公開され、後から消すのは難しい。push の前に、毎回次を確かめる。

1. `npm run check:publish`（ブランチを指定するときは `npm run check:publish -- <ブランチ名>`）が `check:publish: OK` になる。このスクリプトは、push するブランチの全履歴について、次を調べる。
   - コミットの作者とコミッターのメールアドレスが、許可したもの（`akiratamcat@gmail.com`、Claude の共同作者の表記、GitHub の画面でのマージと Dependabot が使う GitHub の公開用のアドレス）だけであること。outlook.jp のアドレスは使わない（2026-11-19 に履歴も gmail に書き換え済み）。
   - 公開してはいけないファイル（`.env`、ログ、エディタの個人設定、`dist/`、`publish/`、`node_modules/`、試作の `spike/` など）が、最新の版に入っていないこと。過去のコミットにだけあるものは注意として表示されるので、中身に個人の情報がないことを確かめる。
   - ファイルの中身に、トークンや秘密鍵らしい文字列、PC のパス（`C:\Users\…` など）がないこと。
2. **push するのは `main` だけ**にする（`git push -u origin main`）。作業用のブランチを共有したいときだけ、そのブランチを名前を指定して push する。`git push --all` と `git push --mirror` は使わない。試作のブランチ（`spike/engine`、`spike/plugin`）は使い捨てなので、push しない（設計書 18章）。
3. 作者の gmail のアドレスは、コミットの情報として公開される（オーナーが gmail で公開すると決めた）。そのため、GitHub の「Block command line pushes that expose my email」は有効にしない（有効にすると push が止まる）。
4. 最初の push の後、GitHub のリポジトリの設定で次を有効にする。
   - Secret scanning と Push protection（公開リポジトリでは無料。秘密の情報を含む push を GitHub が止める）
   - Private vulnerability reporting（`SECURITY.md` の案内先。設計書 21.1節）
   - Dependabot alerts
   - `main` の保護（プルリクエストからだけマージでき、CI が通らないとマージできない）と「Automatically delete head branches」（設計書 21.2節のブランチの運用）

## 1. 準備

1. `main` が最新で、作業中のファイルがないことを確かめる。
2. `npm audit` を実行し、配布物に含まれる依存パッケージに脆弱性がないことを確かめる。
3. `CHANGELOG.md` と `CHANGELOG.ja.md` の `[Unreleased]` を `[X.Y.Z] - YYYY-MM-DD` に変える。利用者に影響する変更（設定、図の見た目、対応する図）を必ず書く。2つのファイルの内容をそろえる（リリースノートは、前半が `CHANGELOG.md`、後半が `CHANGELOG.ja.md` から作られる）。
4. 版数を上げる（設計書 21.2節）。`package.json` と `src/manifest.json` の `version` を同じ値にする。
5. エンジンを更新した場合は、`vendor/plantuml/SOURCE.md` の「Updating」の手順をすべて済ませたことを確かめる（ライセンス、版数を書く場所、内蔵テーマの一覧、テスト）。
6. エンジンや DOMPurify を更新した場合は、`src/thirdParty.ts`（設定画面に出す一覧）と、`README.md`・`README.ja.md` の同梱ソフトウェアの表の版数を直し、`npm run notices` で `THIRD_PARTY_NOTICES.md` と `THIRD_PARTY_NOTICES.ja.md` を作り直す。`npm run licenses:check`（`npm test` から自動で実行される）は、これらの直し忘れと、許可していないライセンスの依存パッケージを検出する。

## 2. 確認

1. `npm test`、`npm run typecheck`、`npm run lint` がすべて通る。
2. 設計書 16.3節の手動テストを、`tests/manual/release-manual-tests.ja.md` の手順で行う。`.jpl` は、Windows では `npm run dist` で作り、ほかの PC では GitHub Actions の CI の成果物（plugin-package）を使う。環境ごとの範囲は手順書のとおり。項目ごとの結果は手順書の「記録」に、まとめは下の「記録」に書く。
3. 外部通信なしの手動確認（設計書 16.4節の (4)）を行う。
4. 初回の公開（v1.0.0）では、設計書 21.6節の公開前チェックリストをすべて確かめる。

手動テストに合格するまで、タグを push しない。

## 3. 公開

1. `main` にマージし、タグ `vX.Y.Z` を作って push する。
2. リリース用のワークフロー（`.github/workflows/release.yml`）が、検査とビルドを行い、GitHub Releases にリリースを作る。`.jpl`、`LICENSE`、`THIRD_PARTY_NOTICES.md`、`THIRD_PARTY_NOTICES.ja.md` が添付され、リリースノートは英語と日本語の二部構成で、それぞれの先頭に「描画エンジン内蔵・外部通信なし」の定型文が入る。
3. リポジトリの変数 `NPM_PUBLISH` が `true` のとき、続けて同じワークフローが npm に公開する。認証には npm の Trusted Publishing（GitHub Actions の OIDC）を使うので、npm のトークンを GitHub に保存しない。`NPM_PUBLISH` が `true` でないときは npm には公開せず、下の「3.2 手で npm に公開する」で公開する。
4. 公開できたことを `npm view joplin-plugin-dg-plantuml version` で確かめる。

### 3.1 Trusted Publishing の最初の設定（v1.0.0 の次の版で1回だけ）

v1.0.0 は手で公開した（3.2）。Trusted Publishing は、npm のパッケージの設定画面で登録するため、パッケージを一度公開してからでないと登録できない。また、**登録してから2日以内に1回も公開しないと、その設定は無効になり、編集もできなくなる**（2026-11-22 に npm の文書で確認）。そのため、次の版のタグを push する当日に、次の順で行う。

1. npmjs.com に `akiratamcat` でログインし、パッケージ `joplin-plugin-dg-plantuml` の Settings を開く。Trusted publishing（Trusted Publisher）で GitHub Actions を選び、次を入れる。大文字・小文字も区別される。保存の時点では npm は内容を確かめず、間違いは公開のときに初めて分かる。

   | 項目 | 値 |
   | ---- | -- |
   | Organization or user | `akiratamcat` |
   | Repository | `joplin-plugin-dg-plantuml` |
   | Workflow filename | `release.yml`（パスは書かない） |
   | Environment name | 空のまま |
   | 許可する操作 | `npm publish` も許可する（2026-09-03 より後に作った設定は、既定では `npm stage publish` だけが許可される） |

2. GitHub のリポジトリの Settings → Secrets and variables → Actions → Variables で、変数 `NPM_PUBLISH` を `true` にする（または `gh variable set NPM_PUBLISH --body true`）。
3. いつもどおりタグを push する（上の 1.）。リリース用のワークフローの `npm` のジョブが成功し、`npm view joplin-plugin-dg-plantuml version` が新しい版になることを確かめる。
4. 設定を間違えた場合や、2日を過ぎて無効になった場合は、その設定を削除して作り直す（npm の設定は編集できない）。

v1.0.1 に向けて、オーナーが 2026-11-25 に登録した（許可する操作は `npm publish` と `npm stage publish`。状態は「Pending validation」で、2026-11-27 05:08 UTC までに1回公開すると確定する）。その時刻までにタグを push できなかった場合は、上の 4. のとおり削除して、公開する日に作り直す。

ワークフローの `npm` のジョブの条件（npm の文書による。2026-11-22 時点）: `permissions` に `id-token: write`、npm の CLI 11.5.1 以降（ジョブの中で `npm install -g npm@latest` する）、Node.js 22.14.0 以降、`package.json` の `repository.url` が GitHub のリポジトリと一致すること。Trusted Publishing では provenance（どのソースとワークフローから作ったかの証明）が自動で付く。

### 3.2 手で npm に公開する

v1.0.0 の最初の公開で使った手順。`npm` のジョブが失敗したときも、この手順で公開する（タグは作り直さない）。npm のアカウントは2段階認証を「ログインと公開の両方」で有効にしているので、公開のときに認証を求められる。生成 AI からは認証の操作ができないため、オーナーが自分のターミナルで行う。

1. `npm whoami` が `akiratamcat` になる（ならなければ `npm login`）。
2. `git switch main`、`git pull` の後、`git describe --tags` が公開する版のタグ（例：`v1.0.0`）になる。作業中のファイルがない。
3. `npm ci`、`npm run dist` を実行する。`npm ci` で出る `npm warn deprecated` は、開発用の道具の古い部品についての注意で、公開する中身には関係しない。
4. `npm pack --dry-run` で、名前と版数（`joplin-plugin-dg-plantuml@X.Y.Z`）と、ファイルが8つ（`LICENSE`、`README.md`、`README.ja.md`、`THIRD_PARTY_NOTICES.md`、`THIRD_PARTY_NOTICES.ja.md`、`package.json`、`publish/` の `.jpl` と `.json`）であることを確かめる。
5. `npm publish --access public` を実行し、表示された URL をブラウザで開いて2段階認証を行う。**一度公開した版数は、取り消しても同じ番号では二度と公開できない。**
6. 数分後に `npm view joplin-plugin-dg-plantuml version` が新しい版になる。

v1.0.0 の公開のときに分かったこと（2026-11-22）:

- 新しい名前で初めて公開すると、npm は先に仮の版 `0.0.0-stage` を作り、約2分後に 1.0.0 が出た。`latest` は 1.0.0 になる。`0.0.0-stage` は残るが、Joplin のプラグイン一覧は `latest` を使うので問題はない。
- npm のアカウントのメールアドレス（gmail）は、パッケージの管理者の情報として公開される。
- `repository.url` の書き方を npm が自動で直した警告が出たので、`npm pkg fix` で `git+https://…` の形に直した。

## 4. 公開後

1. Joplin 公式プラグイン一覧に新しい版が出たことを確かめる（npm への公開から反映まで時間がかかる）。
2. Joplin のプラグインの画面から、新しい版に更新できることを確かめる。

## 記録

リリースごとに、手動テストの結果を残す。

| 版 | 日付 | 環境 | 範囲 | 結果 | メモ |
| -- | ---- | ---- | ---- | ---- | ---- |
| 1.0.0 | 2026-11-21 | Windows 11、Joplin 3.7.24 | フルテスト | OK | M-16：大きく下へスクロールすると一瞬止まるが、すぐ戻る |
| 1.0.0 | 2026-11-22 | macOS 27.2.1（Apple silicon）、Joplin 3.7.24 | フルテスト | OK | |
| 1.0.0 | 2026-11-22 | Debian 13.7（amd64）、Joplin 3.7.24 | スモークテスト | OK | |
| 1.0.0 | 2026-11-23 | Joplin のプラグインの画面 | 公開後の確認（4.） | OK | Joplin 公式プラグイン一覧への掲載（2026-11-22）と、プラグインの画面からのインストールと図の表示を確認 |
