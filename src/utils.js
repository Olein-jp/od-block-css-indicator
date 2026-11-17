export const DEFAULT_COLOR = '#64748b';
export const DEFAULT_SETTINGS = { enabled: false, color: DEFAULT_COLOR };

export function hasCustomCSS( attributes ) {
	const css = attributes?.style?.css;
	return typeof css === 'string' && css.trim().length > 0;
}

export function normalizeColor( color ) {
	return typeof color === 'string' &&
		color.length === 7 &&
		/^#[\da-f]{6}$/i.test( color )
		? color.toLowerCase()
		: DEFAULT_COLOR;
}

export function normalizeSettings( settings ) {
	return {
		enabled: settings?.enabled === true,
		color: normalizeColor( settings?.color ),
	};
}

export function highlightProps( props, settings ) {
	return {
		...props,
		className: [ props.className, 'od-block-css-indicator--highlighted' ]
			.filter( Boolean )
			.join( ' ' ),
		wrapperProps: {
			...props.wrapperProps,
			style: {
				...props.wrapperProps?.style,
				'--od-block-css-indicator-color': normalizeColor(
					settings.color
				),
			},
		},
	};
}

// 連続変更でも古いリクエストが新しい設定を上書きしないよう直列化する.
export function createSettingsSaver( save ) {
	let pending = Promise.resolve();
	return ( settings ) => {
		pending = pending.catch( () => {} ).then( () => save( settings ) );
		return pending;
	};
}
