# アーキテクチャ

## 構成

- `od-block-css-indicator.php`: 初期化、翻訳、既存の GitHub 更新処理。
- `includes/assets.php`: 編集画面だけへの JS／CSS 読み込み。
- `includes/settings.php`: User Meta、REST ルート、権限・値検証。
- `src/utils.js`: CSS 検知、色・設定の正規化、ラッパー属性の合成、保存の直列化。
- `src/store.js`: 独立した `@wordpress/data` ストア。
- `src/index.js`: ツールバーとブロックラッパーの公開フィルター。
- `src/settings.js`: 両エディター共通の設定モーダルと永続化。
- `src/style.scss`: エディター専用表示。

## 公開 API と検知

`editor.BlockEdit`、`BlockControls`、`ToolbarGroup`、`Tooltip` で、選択中かつ `hasCustomCSS(attributes)` が真のブロックに状態表示を加える。インジケーターは操作のない `span role="img"` とし、読み上げラベル、CSS の文字、コード記号を持つ。不要な操作ボタンやタブ停止位置は追加しない。

`hasCustomCSS` は文字列の `attributes.style.css` を trim して判定する純粋関数。CSS の正当性は判定しない。ブロック名の固定リストは使わず、コアと同じ `hasBlockSupport(name, 'customCSS', true)` で明示的な非対応ブロックを除外する。未保存の属性変更も即時反映する。

`editor.BlockListBlock` で対象ラッパーにクラスと CSS カスタムプロパティを追加する。既存の `className`、`wrapperProps`、その `style` を合成する。保存フィルターや属性変更処理は登録しない。各ブロックを個別判定するためネストに対応し、子孫から親への通知は行わない。

`PluginMoreMenuItem` を `@wordpress/editor` から使用し、投稿・固定ページ・サイトエディターで同じ設定モーダルを開く。UI は `Modal`、`ToggleControl`、`ColorPalette`、`Button`、`Notice`。非公開 API、DOM 検索、MutationObserver は使わない。

## iframe と標準操作

`enqueue_block_editor_assets` でエディター UI、`enqueue_block_assets` の管理画面条件下でキャンバス用 CSS を読み込む。後者は iframe 内にも配信される。JS はキャンバスで二重実行しない。

`outline` は 1px の破線で背景やレイアウトを変更しない。選択・複数選択・ホバー・ドラッグ中は独自アウトラインを抑制する。選択中の代替表示はツールバーの CSS 表示。`--od-block-css-indicator-color` は対象ラッパーへ直接渡すため、iframe 境界をまたぐ変数継承に依存しない。

## ユーザー設定の保存

User Meta `_od_block_css_indicator_settings` に `{enabled: boolean, color: '#rrggbb'}` を保存する。コア Preferences の永続化構成はエディターごとに異なるため、本人の DB 保存を明示できるこの方式を採用した。コアの Preferences ストアや永続化アダプターは変更しない。

`/od-block-css-indicator/v1/settings` は GET／POST。対象ユーザーは常に `get_current_user_id()` で、他人の ID を指定する入力は使用しない。`edit_posts`、`edit_pages`、`edit_theme_options` のいずれかを要求する。ブラウザからは標準 `apiFetch` の Cookie／REST nonce 認証を利用する。未認証・権限不足・不正な型や色は拒否する。CSS 編集権限は与えない。

色は 7 文字の HEX のみ受け付け、小文字に正規化する。読み込み時にも値と真偽値の型を検証し、不正な保存値は初期値へ戻す。設定変更は即時プレビューし、250ms の待機後に保存する。リクエストを直列化し、古い保存による上書きを防ぐ。完了表示と失敗時の再試行を提供する。保存完了前のページ離脱は未保存となり得る。複数タブから同時更新した場合は最後に保存した値を採用する。

## 互換性・無効化

WordPress 7.0 以上、PHP 7.4 以上。表示の追加処理だけを分離し、ブロック登録・保存 HTML・投稿本文・style.css・theme.json・コア CSS 生成処理を変更しない。無効化後も User Meta は保持し、再有効化で復元する。公開画面には JS／CSS を登録しない。

`edit_css` のないユーザーにも読み取り補助として可視化を提供する。WordPress が保存時に CSS を除去する場合、その標準処理を回避しない。

## 調査した一次資料

- [WordPress 7.0 向け custom-css 実装](https://github.com/WordPress/gutenberg/blob/wp/7.0/packages/block-editor/src/hooks/custom-css.js): style.css、customCSS の既定対応、canEditCSS の権限制御を照合。
- [Block Filters](https://developer.wordpress.org/block-editor/reference-guides/filters/block-filters/): BlockEdit／BlockListBlock と属性の合成。
- [editor パッケージ](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-editor/): 共通 PluginMoreMenuItem。
- [iframe 内外へのアセット追加](https://developer.wordpress.org/block-editor/how-to-guides/enqueueing-assets-in-the-editor/): エディター UI とキャンバスの読み込み。

JavaScript の依存はビルド時の asset.php から取得し、実行時は WordPress 同梱パッケージを使う。配布 ZIP に node_modules や開発依存は含めない。
