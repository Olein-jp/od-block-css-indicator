const { test, expect } = require( '@playwright/test' );

async function login( page ) {
	await page.goto( '/wp-login.php' );
	await page.getByLabel( 'Username or Email Address' ).fill( 'admin' );
	await page.getByLabel( 'Password', { exact: true } ).fill( 'password' );
	await page.getByRole( 'button', { name: 'Log In', exact: true } ).click();
}

async function ready( page ) {
	await page.waitForFunction( () => !! window.wp?.data?.select( 'od-block-css-indicator/settings' ) );
	await page.evaluate( () => {
		const preferences = wp.data.dispatch( 'core/preferences' );
		preferences.set( 'core', 'welcomeGuide', false );
		preferences.set( 'core/edit-post', 'welcomeGuide', false );
		preferences.set( 'core/edit-site', 'welcomeGuide', false );
	} );
	const close = page.getByRole( 'button', { name: 'Close', exact: true } );
	if ( await close.count() && await close.first().isVisible() ) {
		await close.first().click();
	}
}

async function openSettings( page ) {
	await page.getByRole( 'region', { name: 'Editor top bar' } ).getByRole( 'button', { name: 'Options', exact: true } ).click();
	await page.getByRole( 'menuitem', { name: 'Custom CSS visibility' } ).click();
	await expect( page.getByRole( 'dialog', { name: 'Custom CSS visibility' } ) ).toBeVisible();
}

test( '投稿エディター: 検知・ネスト・設定操作・保存・再読み込み', async ( { page } ) => {
	const errors = [];
	page.on( 'pageerror', ( error ) => errors.push( error.message ) );
	await login( page );
	await page.goto( '/wp-admin/post-new.php' );
	await ready( page );
	await page.evaluate( async () => {
		await wp.apiFetch( { path: '/od-block-css-indicator/v1/settings', method: 'POST', data: { enabled: false, color: '#64748b' } } );
	} );
	await page.reload();
	await ready( page );
	const ids = await page.evaluate( () => {
		const { createBlock } = wp.blocks;
		const css = { style: { css: 'color: rgb(100, 80, 90);' } };
		const child = createBlock( 'core/paragraph', { content: 'Nested CSS', ...css } );
		const group = createBlock( 'core/group', {}, [ child ] );
		const plain = createBlock( 'core/paragraph', { content: 'Plain block' } );
		wp.data.dispatch( 'core/block-editor' ).resetBlocks( [ plain, group ] );
		wp.data.dispatch( 'core/block-editor' ).selectBlock( plain.clientId );
		return { plain: plain.clientId, child: child.clientId, group: group.clientId };
	} );
	const badge = page.getByRole( 'img', { name: 'Custom CSS is set' } );
	await expect( badge ).toHaveCount( 0 );
	await page.evaluate( ( id ) => wp.data.dispatch( 'core/block-editor' ).updateBlockAttributes( id, { style: { css: 'color: red;' } } ), ids.plain );
	await expect( badge ).toBeVisible();
	await expect( page.locator( 'iframe[name="editor-canvas"]' ) ).toHaveCount( 1 );
	const canvas = page.frameLocator( 'iframe[name="editor-canvas"]' );
	await expect( canvas.locator( '.od-block-css-indicator--highlighted' ) ).toHaveCount( 0 );
	await openSettings( page );
	await page.getByRole( 'checkbox', { name: 'Highlight blocks with custom CSS' } ).check();
	await page.getByRole( 'option', { name: 'Blue', exact: true } ).click();
	await expect( page.getByRole( 'status' ).filter( { hasText: 'Settings saved for your account.' } ) ).toBeVisible();
	await page.getByRole( 'button', { name: 'Close', exact: true } ).click();
	await expect( canvas.locator( '.od-block-css-indicator--highlighted' ) ).toHaveCount( 2 );
	const nested = canvas.locator( `[data-block="${ ids.child }"]` );
	await expect( nested ).toHaveCSS( 'outline-style', 'dashed' );
	await expect( nested ).toHaveCSS( 'outline-color', 'rgb(59, 130, 246)' );
	await page.evaluate( ( id ) => wp.data.dispatch( 'core/block-editor' ).updateBlockAttributes( id, { style: { css: '\n ' } } ), ids.plain );
	await expect( badge ).toHaveCount( 0 );
	await expect( canvas.locator( '.od-block-css-indicator--highlighted' ) ).toHaveCount( 1 );
	await page.evaluate( ( id ) => {
		wp.data.dispatch( 'core/block-editor' ).duplicateBlocks( [ id ] );
	}, ids.group );
	await expect( canvas.locator( '.od-block-css-indicator--highlighted' ) ).toHaveCount( 2 );
	await page.evaluate( async () => {
		wp.data.dispatch( 'core/editor' ).editPost( { title: 'OD CSS MVP validation', status: 'draft' } );
		await wp.data.dispatch( 'core/editor' ).savePost();
	} );
	await page.reload();
	await ready( page );
	await expect( canvas.locator( '.od-block-css-indicator--highlighted' ) ).toHaveCount( 2 );
	const settings = await page.evaluate( () => wp.data.select( 'od-block-css-indicator/settings' ).getSettings() );
	expect( settings ).toEqual( { enabled: true, color: '#3b82f6' } );
	const cssValues = await page.evaluate( () => wp.data.select( 'core/block-editor' ).getBlocks().flatMap( ( block ) => block.innerBlocks.map( ( child ) => child.attributes.style?.css ) ) );
	expect( cssValues ).toEqual( [ 'color: rgb(100, 80, 90);', 'color: rgb(100, 80, 90);' ] );
	await openSettings( page );
	await page.getByRole( 'button', { name: 'Reset color', exact: true } ).click();
	await page.getByRole( 'checkbox', { name: 'Highlight blocks with custom CSS' } ).uncheck();
	await expect( page.getByRole( 'status' ).filter( { hasText: 'Settings saved for your account.' } ) ).toBeVisible();
	await page.getByRole( 'button', { name: 'Close', exact: true } ).click();
	await expect( canvas.locator( '.od-block-css-indicator--highlighted' ) ).toHaveCount( 0 );
	expect( errors ).toEqual( [] );
} );

test( 'サイトエディター: 共通設定と iframe 内の可視化', async ( { page } ) => {
	await login( page );
	await page.goto( '/wp-admin/site-editor.php?postId=twentytwentyfive%2F%2Fhome&postType=wp_template&canvas=edit' );
	await ready( page );
	await page.waitForFunction( () => wp.data.select( 'core/block-editor' ).getBlocks().length > 0 );
	await page.evaluate( () => {
		const block = wp.blocks.createBlock( 'core/paragraph', { content: 'Site CSS', style: { css: 'color: blue;' } } );
		wp.data.dispatch( 'core/block-editor' ).insertBlocks( block );
		wp.data.dispatch( 'core/block-editor' ).selectBlock( block.clientId );
	} );
	await expect( page.getByRole( 'img', { name: 'Custom CSS is set' } ) ).toBeVisible();
	await openSettings( page );
	await page.getByRole( 'checkbox', { name: 'Highlight blocks with custom CSS' } ).check();
	await expect( page.getByRole( 'status' ).filter( { hasText: 'Settings saved for your account.' } ) ).toBeVisible();
	await page.getByRole( 'button', { name: 'Close', exact: true } ).click();
	const canvas = page.frameLocator( 'iframe[name="editor-canvas"]' );
	await expect( canvas.locator( '.od-block-css-indicator--highlighted' ) ).toHaveCount( 1 );
	await page.screenshot( { path: 'test-results/site-editor.png', fullPage: true } );
	// サイトのテンプレート自体は保存しない。
} );

test( '主要ブロック・カスタムブロック・選択と移動', async ( { page } ) => {
	await login( page );
	await page.goto( '/wp-admin/post-new.php?post_type=page' );
	await ready( page );
	const ids = await page.evaluate( () => {
		const { createBlock, registerBlockType } = wp.blocks;
		const { createElement } = wp.element;
		for ( const enabled of [ true, false ] ) {
			registerBlockType( `od-test/custom-${ enabled }`, {
				apiVersion: 3, title: `CSS support ${ enabled }`, category: 'text',
				attributes: { style: { type: 'object' } }, supports: { customCSS: enabled },
				edit: () => createElement( 'div', wp.blockEditor.useBlockProps(), 'Custom CSS block' ),
				save: () => null,
			} );
		}
		const css = { style: { css: 'color: #123456;' } };
		const blocks = [
			createBlock( 'core/paragraph', { content: 'Paragraph', ...css } ),
			createBlock( 'core/heading', { content: 'Heading', ...css } ),
			createBlock( 'core/group', css, [ createBlock( 'core/paragraph', { content: 'Group child' } ) ] ),
			createBlock( 'core/columns', css, [ createBlock( 'core/column', {}, [ createBlock( 'core/paragraph', { content: 'Column' } ) ] ) ] ),
			createBlock( 'core/cover', { ...css, dimRatio: 50 }, [ createBlock( 'core/paragraph', { content: 'Cover child' } ) ] ),
			createBlock( 'core/buttons', {}, [ createBlock( 'core/button', { text: 'Button', ...css } ) ] ),
			createBlock( 'core/group', {}, [ createBlock( 'core/group', css, [ createBlock( 'core/paragraph', { content: 'Nested group' } ) ] ) ] ),
			createBlock( 'od-test/custom-true', css ),
			createBlock( 'od-test/custom-false', css ),
		];
		wp.data.dispatch( 'core/block-editor' ).resetBlocks( blocks );
		wp.data.dispatch( 'od-block-css-indicator/settings' ).updateSettings( { enabled: true, color: '#0d9488' } );
		wp.data.dispatch( 'core/block-editor' ).clearSelectedBlock();
		return blocks.map( ( block ) => block.clientId );
	} );
	const canvas = page.frameLocator( 'iframe[name="editor-canvas"]' );
	await expect( canvas.locator( '.od-block-css-indicator--highlighted' ) ).toHaveCount( 8 );
	for ( const id of [ ids[ 0 ], ids[ 1 ], ids[ 2 ], ids[ 3 ], ids[ 4 ], ids[ 7 ] ] ) {
		await page.evaluate( ( clientId ) => wp.data.dispatch( 'core/block-editor' ).selectBlock( clientId ), id );
		await expect( page.getByRole( 'img', { name: 'Custom CSS is set' } ) ).toBeVisible();
	}
	await page.evaluate( ( id ) => wp.data.dispatch( 'core/block-editor' ).selectBlock( id ), ids[ 8 ] );
	await expect( page.getByRole( 'img', { name: 'Custom CSS is set' } ) ).toHaveCount( 0 );
	await page.evaluate( ( id ) => {
		wp.data.dispatch( 'core/block-editor' ).moveBlocksToPosition( [ id ], '', '', 1 );
		wp.data.dispatch( 'core/block-editor' ).selectBlock( id );
	}, ids[ 0 ] );
	const paragraph = canvas.locator( `[data-block="${ ids[ 0 ] }"]` );
	await paragraph.click();
	await paragraph.press( 'End' );
	await paragraph.pressSequentially( ' edited' );
	await expect( paragraph ).toContainText( 'edited' );
	await expect( paragraph ).not.toHaveCSS( 'outline-style', 'dashed' );
	await expect( canvas.locator( '.od-block-css-indicator--highlighted' ) ).toHaveCount( 8 );
} );

test( '任意色・保存失敗の通知・再試行・閉じる操作', async ( { page } ) => {
	await login( page );
	await page.goto( '/wp-admin/post-new.php' );
	await ready( page );
	await openSettings( page );
	await page.getByRole( 'button', { name: /Custom color picker/ } ).click();
	const hex = page.locator( 'input.components-input-control__input[maxlength="7"]' );
	await hex.fill( '123456' );
	await hex.press( 'Tab' );
	await expect.poll( () => page.evaluate( () => wp.data.select( 'od-block-css-indicator/settings' ).getSettings().color ) ).toBe( '#123456' );
	await page.keyboard.press( 'Escape' );
	await expect( page.getByRole( 'status' ).filter( { hasText: 'Settings saved for your account.' } ) ).toBeVisible();
	let failed = false;
	await page.route( /od-block-css-indicator.*settings/, async ( route ) => {
		if ( route.request().method() === 'POST' && ! failed ) {
			failed = true;
			await route.fulfill( { status: 500, contentType: 'application/json', body: '{"message":"test failure"}' } );
		} else {
			await route.continue();
		}
	} );
	await page.getByRole( 'button', { name: 'Reset color', exact: true } ).click();
	await expect( page.getByRole( 'dialog', { name: 'Custom CSS visibility' } ).getByText( 'Could not save settings. Please try again.' ) ).toBeVisible();
	await page.getByRole( 'button', { name: 'Retry', exact: true } ).click();
	await expect( page.getByRole( 'status' ).filter( { hasText: 'Settings saved for your account.' } ) ).toBeVisible();
	await page.getByRole( 'button', { name: 'Close', exact: true } ).click();
	await expect( page.getByRole( 'dialog', { name: 'Custom CSS visibility' } ) ).toHaveCount( 0 );
} );

test( '200ブロックでも可視化と編集が動作し、nonceなしの更新は拒否する', async ( { page } ) => {
	await login( page );
	await page.goto( '/wp-admin/post-new.php' );
	await ready( page );
	const id = await page.evaluate( () => {
		const blocks = Array.from( { length: 200 }, ( _, index ) => wp.blocks.createBlock( 'core/paragraph', {
			content: `Block ${ index }`,
			...( index % 2 === 0 ? { style: { css: 'color: blue;' } } : {} ),
		} ) );
		wp.data.dispatch( 'core/block-editor' ).resetBlocks( blocks );
		wp.data.dispatch( 'od-block-css-indicator/settings' ).updateSettings( { enabled: true } );
		return blocks[ 0 ].clientId;
	} );
	const canvas = page.frameLocator( 'iframe[name="editor-canvas"]' );
	await expect( canvas.locator( '.od-block-css-indicator--highlighted' ) ).toHaveCount( 100 );
	const block = canvas.locator( `[data-block="${ id }"]` );
	await block.click();
	await block.press( 'End' );
	await block.pressSequentially( ' edited' );
	await expect( block ).toContainText( 'edited' );
	const url = await page.evaluate( () => `${ wpApiSettings.root }od-block-css-indicator/v1/settings` );
	const response = await page.request.post( url, { data: { enabled: false, color: '#000000' } } );
	expect( response.status() ).toBe( 401 );
} );
