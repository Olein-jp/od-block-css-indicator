# OD Block CSS Indicator

WordPress 標準のブロック追加 CSS を可視化する軽量プラグインです。CSS があるブロックを選択するとツールバーに「CSS」を表示し、強調表示を ON にすると対象ブロックを破線で囲みます。投稿本文・追加 CSS・公開ページの出力は変更しません。

## 使い方

1. 配布 ZIP をインストールして有効化します。
2. 投稿・固定ページまたはサイトエディターを開きます。
3. ブロックの「高度な設定」で標準の追加 CSS を設定すると、選択時のツールバーにインジケーターが現れます。
4. 画面右上の「オプション」→「追加CSSの可視化」で、強調表示とキーカラーを変更できます。プリセット・任意の不透明色・初期色へのリセットに対応します。
5. 「アカウントに設定を保存しました。」の表示後は、再読み込みや別セッションでも本人の色と表示状態を復元します。保存失敗時は再試行できます。

初期設定は強調表示 OFF、色 `#64748b`、1px の破線です。選択・ホバー・ドラッグ中は標準表示を優先し、選択中はツールバーで CSS の存在を示します。CSS の構文チェックは行いません。

可視化は投稿・固定ページ編集権限またはテーマ編集権限のあるユーザーに提供します。`edit_css` 権限のないユーザーが CSS を含む投稿を保存した場合の扱いは WordPress 標準の権限制御に従います。

## 開発環境

実行環境は WordPress 7.0 以上、PHP 7.4 以上です。開発には Docker、Node.js 24.18 以上、npm 11.16 以上 が必要です。ローカルで ZIP を作成する場合は PHP、Composer 2、Python 3 も必要です。

```sh
nvm use
npm ci
npm run build
npm run env:start
npm run composer -- install
npm run lint:php
```

開発用 PHP は 8.3 です。プラグインの最低対応 PHP は 7.4 のままです。

WordPress は http://localhost:8888 で開きます（初期ユーザー `admin`、初期パスワード `password`）。終了は `npm run env:stop` です。ポートが使用中の場合は `npm run env:start -- --auto-port` で空きポートを選択でき、`npm run env:status` で URL を確認できます。ローカル設定は Git 管理外の `.wp-env.override.json` に記載してください。

ホスト側に PHP と Composer がある場合は `composer install`、`composer lint` も使えます。

## 翻訳

表示文字列は英語を原文とし、`od-block-css-indicator` テキストドメインを使用します。`languages/` に POT と日本語 PO／MO を同梱します。

```sh
npm run i18n:pot
# PO エディターなどで各言語の PO を更新する
npm run i18n:mo
```

PHP の文字列には `__()`、`esc_html__()` などを使用してください。JavaScript は `@wordpress/i18n` と `wp_set_script_translations()` を使用します。POT／PO 更新後は `npm run i18n:json` で JSON カタログも生成します。配布する翻訳 JSON は `build/index.js` のパスに対応させてください。

## ビルドと検証

```sh
npm run build
npm run start          # 変更を監視
npm run lint:js
npm run lint:css
npm run lint:php
npm run test:unit -- --watch=false
npm run test:integration
npm run test:non-interference
WP_BASE_URL=http://localhost:8892 npm run test:e2e
```

E2E は Chromium と初期管理者 `admin` / `password` を使用します。必要なら `npx playwright install chromium` を実行してください。検証用下書きを作成します。サイトエディター検証は Twenty Twenty-Five を前提とし、テンプレート自体は保存しません。実際のポートを `WP_BASE_URL` に指定してください。

最低対応版を分離して起動する場合は `npx wp-env start --config=.wp-env.wp70.json` を使用します。CLI操作にも同じ `--config=.wp-env.wp70.json` を付け、E2E は `WP_BASE_URL=http://localhost:8894 npm run test:e2e` で実行します。ポート競合時は起動結果のURLを指定してください。

構成は [docs/architecture.md](docs/architecture.md)、実施済み検証と制限は [docs/validation.md](docs/validation.md) に記録します。

## 配布と更新

```sh
npm run build
npm run package
```

`dist/od-block-css-indicator.zip` を生成します。本番用 Composer 依存を同梱し、開発ツールやローカル設定は含めません。インストールには GitHub の自動生成ソース ZIP ではなく、Releases の添付 ZIP を使ってください。

`inc2734/wp-github-plugin-updater` により、このリポジトリの新しい公開 Release を WordPress の更新画面から取得します。公開リポジトリを前提とし、プライベートリポジトリ用の認証設定は含めていません。

プラグインヘッダーと `package.json` のバージョンを一致させ、コミット・プッシュ後に数値 3 桁のタグをプッシュすると、GitHub Actions が検証し、本番依存を含む ZIP を作成して Release に添付します。タグとバージョンが不一致なら公開を中止します。

```sh
# 初回リリースの例
git tag 0.1.0
git push origin 0.1.0
```

GitHub Actions の実行と `GITHUB_TOKEN` の contents:write 権限が必要です。

## 開発依存の監査

2026年11月17日の導入時 `npm audit` では、開発ツールを含む依存に40件（high 7件、moderate 33件）の指摘がありました。npm 依存は開発専用で、配布 ZIP には含まれません。上流の更新時に再確認してください。
