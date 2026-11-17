<?php
/**
 * 本人だけが読み書きできるユーザー設定.
 *
 * @package OD_Block_CSS_Indicator
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * 読み込み時にも保存値を検証する.
 *
 * @param mixed $value 保存された設定.
 * @return array
 */
function od_block_css_indicator_normalize_settings( $value ) {
	$value = is_array( $value ) ? $value : array();
	$color = isset( $value['color'] ) && is_string( $value['color'] ) && preg_match( '/^#[0-9a-fA-F]{6}$/D', $value['color'] )
		? strtolower( $value['color'] ) : '#64748b';
	return array(
		'enabled' => isset( $value['enabled'] ) && true === $value['enabled'],
		'color'   => $color,
	);
}

/**
 * 現在のユーザーの設定を取得する.
 *
 * @return array
 */
function od_block_css_indicator_get_settings() {
	return od_block_css_indicator_normalize_settings( get_user_meta( get_current_user_id(), '_od_block_css_indicator_settings', true ) );
}

/**
 * 可視化は CSS 編集権限とは独立した読み取り補助として提供する.
 *
 * @return bool
 */
function od_block_css_indicator_can_use() {
	return current_user_can( 'edit_posts' ) || current_user_can( 'edit_pages' ) || current_user_can( 'edit_theme_options' );
}

/**
 * 自分の設定だけを扱い、任意のユーザー ID は受け付けない.
 * Cookie 認証の nonce は WordPress REST API が検証する.
 *
 * @return void
 */
function od_block_css_indicator_register_routes() {
	register_rest_route(
		'od-block-css-indicator/v1',
		'/settings',
		array(
			array(
				'methods'             => WP_REST_Server::READABLE,
				'permission_callback' => 'od_block_css_indicator_can_use',
				'callback'            => 'od_block_css_indicator_get_settings',
			),
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'permission_callback' => 'od_block_css_indicator_can_use',
				'callback'            => 'od_block_css_indicator_save_settings',
				'args'                => array(
					'enabled' => array(
						'type'     => 'boolean',
						'required' => true,
					),
					'color'   => array(
						'type'      => 'string',
						'pattern'   => '^#[0-9a-fA-F]{6}$',
						'minLength' => 7,
						'maxLength' => 7,
						'required'  => true,
					),
				),
			),
		)
	);
}
add_action( 'rest_api_init', 'od_block_css_indicator_register_routes' );

/**
 * 検証済みの設定を User Meta に保存する.
 *
 * @param WP_REST_Request $request リクエスト.
 * @return array|WP_Error
 */
function od_block_css_indicator_save_settings( $request ) {
	$settings = od_block_css_indicator_normalize_settings( $request->get_params() );
	$user_id  = get_current_user_id();
	$previous = get_user_meta( $user_id, '_od_block_css_indicator_settings', true );
	if ( $previous !== $settings && ! update_user_meta( $user_id, '_od_block_css_indicator_settings', $settings ) ) {
		return new WP_Error( 'od_block_css_indicator_save_failed', __( 'Could not save settings. Please try again.', 'od-block-css-indicator' ), array( 'status' => 500 ) );
	}
	return $settings;
}
