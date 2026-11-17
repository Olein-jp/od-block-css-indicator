import {
	createSettingsSaver,
	DEFAULT_COLOR,
	DEFAULT_SETTINGS,
	hasCustomCSS,
	highlightProps,
	normalizeColor,
	normalizeSettings,
} from './utils';

describe( '追加CSSの検知', () => {
	test.each( [ undefined, null, {}, { style: {} }, { style: null } ] )(
		'未定義の属性 %p は検知しない',
		( attributes ) => expect( hasCustomCSS( attributes ) ).toBe( false )
	);
	test.each( [ '', '   ', '\n\r\t', 42, {}, [], null, false ] )(
		'空または想定外の値 %p は検知しない',
		( css ) => expect( hasCustomCSS( { style: { css } } ) ).toBe( false )
	);
	test.each( [ 'color:red;', '\n color: blue;\n', 'invalid CSS' ] )(
		'構文によらず内容のある文字列 %p を検知する',
		( css ) => expect( hasCustomCSS( { style: { css } } ) ).toBe( true )
	);
} );

describe( '設定の検証', () => {
	test.each( [ '#64748b', '#ABCDEF', '#000000', '#ffffff' ] )(
		'有効な色 %p を正規化する',
		( color ) =>
			expect( normalizeColor( color ) ).toBe( color.toLowerCase() )
	);
	test.each( [
		undefined,
		null,
		1,
		'#fff',
		'red',
		'#123456\n',
		'#123456; color:red',
		'url(evil)',
	] )( '不正な色 %p は初期値へ戻す', ( color ) =>
		expect( normalizeColor( color ) ).toBe( DEFAULT_COLOR )
	);
	test( '設定初期化と厳密な型検証', () => {
		expect( normalizeSettings() ).toEqual( DEFAULT_SETTINGS );
		expect(
			normalizeSettings( { enabled: 'true', color: 'red' } )
		).toEqual( DEFAULT_SETTINGS );
		expect(
			normalizeSettings( { enabled: true, color: '#ABCDEF' } )
		).toEqual( { enabled: true, color: '#abcdef' } );
	} );
} );

test( 'ラッパーの既存スタイル・属性・クラスを保持し、入力を変更しない', () => {
	const props = Object.freeze( {
		className: 'existing',
		attributes: Object.freeze( { style: { css: 'color:red;' } } ),
		wrapperProps: Object.freeze( {
			'data-test': 'retained',
			style: { width: '50%' },
		} ),
	} );
	const result = highlightProps( props, { color: '#ABCDEF' } );
	expect( result.className ).toBe(
		'existing od-block-css-indicator--highlighted'
	);
	expect( result.wrapperProps ).toEqual( {
		'data-test': 'retained',
		style: { width: '50%', '--od-block-css-indicator-color': '#abcdef' },
	} );
	expect( result.attributes ).toBe( props.attributes );
	expect( props.wrapperProps.style ).toEqual( { width: '50%' } );
} );

test( '連続する保存は直列化し、失敗しても次の保存を実行する', async () => {
	let release;
	const save = jest
		.fn()
		.mockImplementationOnce(
			() =>
				new Promise( ( resolve ) => {
					release = resolve;
				} )
		)
		.mockRejectedValueOnce( new Error( 'network' ) )
		.mockResolvedValueOnce( 'latest' );
	const persist = createSettingsSaver( save );
	const first = persist( { color: '#000000' } );
	const second = persist( { color: '#111111' } ).catch( () => {} );
	const third = persist( { color: '#222222' } );
	await Promise.resolve();
	await Promise.resolve();
	expect( save ).toHaveBeenCalledTimes( 1 );
	release();
	await Promise.all( [ first, second, third ] );
	expect( save.mock.calls.map( ( [ settings ] ) => settings.color ) ).toEqual(
		[ '#000000', '#111111', '#222222' ]
	);
} );
