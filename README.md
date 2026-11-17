# OD Block CSS Indicator

WordPress プラグインの開発用ひな形です。ブロックの CSS 表示機能はまだ実装していません。

## 開発環境

実行環境は WordPress 5.9 以上、PHP 7.4 以上です。開発には Docker、Node.js 24.18 以上、npm 11.16 以上 が必要です。ローカルで ZIP を作成する場合は PHP、Composer 2、Python 3 も必要です。

```sh
nvm use
npm ci
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

PHP の文字列には `__()`、`esc_html__()` などを使用してください。JavaScript の翻訳・ビルドは JavaScript を追加する際に導入します。

## 配布と更新

```sh
npm run package
```

`dist/od-block-css-indicator.zip` を生成します。本番用 Composer 依存を同梱し、開発ツールやローカル設定は含めません。インストールには GitHub の自動生成ソース ZIP ではなく、Releases の添付 ZIP を使ってください。

`inc2734/wp-github-plugin-updater` により、このリポジトリの新しい公開 Release を WordPress の更新画面から取得します。公開リポジトリを前提とし、プライベートリポジトリ用の認証設定は含めていません。

プラグインヘッダーと `package.json` のバージョンを一致させ、コミット・プッシュ後に数値 3 桁のタグをプッシュすると、GitHub Actions が検証し、本番依存を含む ZIP を作成して Release に添付します。タグとバージョンが不一致なら公開を中止します。

```sh
# 初回リリースの例
git tag 0.0.0
git push origin 0.0.0
```

GitHub Actions の実行と `GITHUB_TOKEN` の contents:write 権限が必要です。

## 開発依存の監査

2026年11月17日の `npm audit` では、wp-env の間接依存に11件（high 1件、moderate 10件）の指摘が残っています。npm 依存は開発専用で、配布 ZIP には含まれません。上流の更新時に再確認してください。
