<?php
/**
 * wp eval-file で実行する REST・永続化・非干渉の統合検証.
 * テスト用ユーザーは終了時に削除する.
 *
 * @package OD_Block_CSS_Indicator
 */

require_once ABSPATH . 'wp-admin/includes/user.php';
$od_block_css_indicator_users = array();
$GLOBALS['od_block_css_indicator_checks'] = 0;

function od_block_css_indicator_assert( $condition, $message ) {
	if ( ! $condition ) {
		throw new RuntimeException( $message );
	}
	++$GLOBALS['od_block_css_indicator_checks'];
	WP_CLI::log( '成功: ' . $message );
}

function od_block_css_indicator_request( $method, $data = array() ) {
	$request = new WP_REST_Request( $method, '/od-block-css-indicator/v1/settings' );
	$request->set_body_params( $data );
	return rest_do_request( $request );
}

try {
	foreach ( array( 'administrator', 'author', 'subscriber' ) as $role ) {
		$id = wp_insert_user( array( 'user_login' => 'od-ci-' . wp_generate_uuid4(), 'user_pass' => wp_generate_password(), 'role' => $role ) );
		if ( is_wp_error( $id ) ) {
			throw new RuntimeException( $id->get_error_message() );
		}
		$od_block_css_indicator_users[] = $id;
	}
	list( $a, $b, $subscriber ) = $od_block_css_indicator_users;
	wp_set_current_user( 0 );
	od_block_css_indicator_assert( 401 === od_block_css_indicator_request( 'GET' )->get_status(), '未認証は拒否する' );
	wp_set_current_user( $subscriber );
	od_block_css_indicator_assert( 403 === od_block_css_indicator_request( 'POST', array( 'enabled' => true, 'color' => '#000000' ) )->get_status(), '購読者は更新できない' );
	wp_set_current_user( $a );
	$defaults = array( 'enabled' => false, 'color' => '#64748b' );
	od_block_css_indicator_assert( $defaults === od_block_css_indicator_request( 'GET' )->get_data(), '初期設定を返す' );
	foreach ( array( 'red', '#fff', '#123456; color:red', "#123456\n" ) as $invalid ) {
		od_block_css_indicator_assert( 400 === od_block_css_indicator_request( 'POST', array( 'enabled' => true, 'color' => $invalid ) )->get_status(), '不正な色を拒否する' );
	}
	od_block_css_indicator_assert( 400 === od_block_css_indicator_request( 'POST', array( 'enabled' => 'garbage', 'color' => '#123456' ) )->get_status(), '不正な表示状態を拒否する' );
	$settings = array( 'enabled' => true, 'color' => '#abcdef' );
	$response = od_block_css_indicator_request( 'POST', array( 'enabled' => true, 'color' => '#ABCDEF', 'user_id' => $b ) );
	od_block_css_indicator_assert( $settings === $response->get_data(), '色を正規化して保存する' );
	wp_cache_delete( $a, 'user_meta' );
	od_block_css_indicator_assert( $settings === od_block_css_indicator_request( 'GET' )->get_data(), 'キャッシュ破棄後も DB から復元する' );
	wp_set_current_user( $b );
	od_block_css_indicator_assert( $defaults === od_block_css_indicator_request( 'GET' )->get_data(), '他人の ID を指定しても書き換えられない' );
	od_block_css_indicator_assert( ! current_user_can( 'edit_css' ) && od_block_css_indicator_can_use(), 'CSS 編集権限がなくても可視化設定は使える' );
	od_block_css_indicator_request( 'POST', array( 'enabled' => false, 'color' => '#3b82f6' ) );
	wp_set_current_user( $a );
	od_block_css_indicator_assert( $settings === od_block_css_indicator_request( 'GET' )->get_data(), 'ユーザー間で設定が混在しない' );
	update_user_meta( $a, '_od_block_css_indicator_settings', array( 'enabled' => 'true', 'color' => 'url(evil)' ) );
	od_block_css_indicator_assert( $defaults === od_block_css_indicator_get_settings(), '破損した保存値は安全な初期値に戻る' );
	$content = '<!-- wp:paragraph {"style":{"css":"color:red;"}} --><p class="has-custom-css">保持テスト</p><!-- /wp:paragraph -->';
	$before = do_blocks( $content );
	remove_action( 'enqueue_block_assets', 'od_block_css_indicator_enqueue_style' );
	remove_action( 'enqueue_block_editor_assets', 'od_block_css_indicator_enqueue_editor' );
	od_block_css_indicator_assert( $before === do_blocks( $content ), '表示処理を停止しても公開 HTML は同一' );
	od_block_css_indicator_assert( false === strpos( $before, 'od-block-css-indicator' ), '公開 HTML に独自クラスを出さない' );
	od_block_css_indicator_assert( ! wp_style_is( 'od-block-css-indicator', 'enqueued' ) && ! wp_script_is( 'od-block-css-indicator', 'enqueued' ), '公開処理に独自アセットを追加しない' );
	WP_CLI::success( $GLOBALS['od_block_css_indicator_checks'] . ' 件の検証に成功' );
} finally {
	wp_set_current_user( 0 );
	foreach ( $od_block_css_indicator_users as $id ) {
		wp_delete_user( $id );
	}
}
