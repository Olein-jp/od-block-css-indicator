import { createReduxStore, register } from '@wordpress/data';
import { normalizeSettings } from './utils';

export const store = createReduxStore( 'od-block-css-indicator/settings', {
	reducer( state = normalizeSettings( window.odBlockCSSIndicator ), action ) {
		return action.type === 'UPDATE'
			? normalizeSettings( { ...state, ...action.settings } )
			: state;
	},
	actions: {
		updateSettings( settings ) {
			return { type: 'UPDATE', settings };
		},
	},
	selectors: {
		getSettings: ( state ) => state,
	},
} );
register( store );
