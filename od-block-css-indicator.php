<?php
/**
 * Plugin Name: OD Block CSS Indicator
 * Plugin URI: https://github.com/Olein-jp/od-block-css-indicator
 * Description: Visualize per-block custom CSS in the block editor without changing content.
 * Version: 0.1.1
 * Requires at least: 7.0
 * Requires PHP: 7.4
 * Author: Koji Kuno
 * Author URI: https://olein-design.com
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: od-block-css-indicator
 * Domain Path: /languages
 * Update URI: https://github.com/Olein-jp/od-block-css-indicator
 *
 * @package OD_Block_CSS_Indicator
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/includes/settings.php';
require_once __DIR__ . '/includes/assets.php';

/**
 * 翻訳と GitHub からの更新を初期化する.
 *
 * @return void
 */
function od_block_css_indicator_init() {
	load_plugin_textdomain( 'od-block-css-indicator', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );

	$autoload = __DIR__ . '/vendor/autoload.php';
	if ( ! file_exists( $autoload ) ) {
		add_action( 'admin_notices', 'od_block_css_indicator_missing_dependencies_notice' );
		return;
	}

	require_once $autoload;

	// 配布用の依存ライブラリを含む Releases の ZIP を取得する.
	// phpcs:ignore WordPress.NamingConventions.ValidHookName.UseUnderscores -- ライブラリ固有のフック名.
	add_filter( 'inc2734_github_plugin_updater_zip_url_Olein-jp/od-block-css-indicator', 'od_block_css_indicator_update_package_url', 10, 4 );

	new \Inc2734\WP_GitHub_Plugin_Updater\Bootstrap(
		plugin_basename( __FILE__ ),
		'Olein-jp',
		'od-block-css-indicator'
	);
}
add_action( 'init', 'od_block_css_indicator_init' );

/**
 * 配布 ZIP の URL を返す.
 *
 * @param string $url 元の URL.
 * @param string $user_name GitHub ユーザー名.
 * @param string $repository リポジトリ名.
 * @param string $tag_name バージョンタグ.
 * @return string
 */
function od_block_css_indicator_update_package_url( $url, $user_name, $repository, $tag_name ) {
	return 'https://github.com/Olein-jp/od-block-css-indicator/releases/download/' . rawurlencode( $tag_name ) . '/od-block-css-indicator.zip';
}

/**
 * 開発用チェックアウトで依存が未導入の場合に通知する.
 *
 * @return void
 */
function od_block_css_indicator_missing_dependencies_notice() {
	if ( ! current_user_can( 'activate_plugins' ) ) {
		return;
	}
	printf(
		'<div class="notice notice-error"><p>%s</p></div>',
		esc_html__( 'OD Block CSS Indicator: dependencies are missing. Run composer install or install the ZIP from GitHub Releases.', 'od-block-css-indicator' )
	);
}
