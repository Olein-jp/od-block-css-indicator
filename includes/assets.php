<?php
/**
 * エディター専用アセット.
 *
 * @package OD_Block_CSS_Indicator
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * 投稿・サイトエディターの UI にスクリプトとスタイルを読み込む.
 *
 * @return void
 */
function od_block_css_indicator_enqueue_editor() {
	$asset_path = dirname( __DIR__ ) . '/build/index.asset.php';
	if ( ! od_block_css_indicator_can_use() || ! file_exists( $asset_path ) ) {
		return;
	}
	$asset = require $asset_path;
	wp_enqueue_script( 'od-block-css-indicator', plugins_url( 'build/index.js', dirname( __DIR__ ) . '/od-block-css-indicator.php' ), $asset['dependencies'], $asset['version'], true );
	wp_add_inline_script( 'od-block-css-indicator', 'window.odBlockCSSIndicator = ' . wp_json_encode( od_block_css_indicator_get_settings() ) . ';', 'before' );
	wp_set_script_translations( 'od-block-css-indicator', 'od-block-css-indicator', dirname( __DIR__ ) . '/languages' );
	od_block_css_indicator_enqueue_style();
}
add_action( 'enqueue_block_editor_assets', 'od_block_css_indicator_enqueue_editor' );

/**
 * Iframe 内と従来のキャンバス双方へスタイルを読み込む.
 * 公開ページでは一切読み込まない.
 *
 * @return void
 */
function od_block_css_indicator_enqueue_style() {
	$path = dirname( __DIR__ ) . '/build/style-index.css';
	if ( ! is_admin() || ! od_block_css_indicator_can_use() || ! file_exists( $path ) ) {
		return;
	}
	wp_enqueue_style( 'od-block-css-indicator', plugins_url( 'build/style-index.css', dirname( __DIR__ ) . '/od-block-css-indicator.php' ), array(), (string) filemtime( $path ) );
}
add_action( 'enqueue_block_assets', 'od_block_css_indicator_enqueue_style' );
