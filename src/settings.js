import apiFetch from '@wordpress/api-fetch';
import {
	Button,
	ColorPalette,
	Modal,
	Notice,
	ToggleControl,
} from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { PluginMoreMenuItem } from '@wordpress/editor';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { store } from './store';
import { createSettingsSaver, DEFAULT_COLOR } from './utils';

const saveSettings = createSettingsSaver( ( settings ) =>
	apiFetch( {
		path: '/od-block-css-indicator/v1/settings',
		method: 'POST',
		data: settings,
	} )
);

export default function SettingsPlugin() {
	const [ open, setOpen ] = useState( false );
	const [ status, setStatus ] = useState( 'saved' );
	const [ attempt, setAttempt ] = useState( 0 );
	const settings = useSelect(
		( select ) => select( store ).getSettings(),
		[]
	);
	const { updateSettings } = useDispatch( store );
	const initial = useRef( settings );
	const revision = useRef( 0 );

	useEffect( () => {
		if ( settings === initial.current && attempt === 0 ) {
			return;
		}
		const current = ++revision.current;
		setStatus( 'saving' );
		const timer = setTimeout( () => {
			saveSettings( settings ).then(
				() => {
					if ( current === revision.current ) {
						setStatus( 'saved' );
					}
				},
				() => {
					if ( current === revision.current ) {
						setStatus( 'error' );
						setOpen( true );
					}
				}
			);
		}, 250 );
		return () => clearTimeout( timer );
	}, [ settings, attempt ] );

	const colors = [
		{ name: __( 'Slate', 'od-block-css-indicator' ), color: DEFAULT_COLOR },
		{ name: __( 'Blue', 'od-block-css-indicator' ), color: '#3b82f6' },
		{ name: __( 'Teal', 'od-block-css-indicator' ), color: '#0d9488' },
		{ name: __( 'Amber', 'od-block-css-indicator' ), color: '#d97706' },
		{ name: __( 'Purple', 'od-block-css-indicator' ), color: '#8b5cf6' },
	];
	return (
		<>
			<PluginMoreMenuItem onClick={ () => setOpen( true ) }>
				{ __( 'Custom CSS visibility', 'od-block-css-indicator' ) }
			</PluginMoreMenuItem>
			{ open && (
				<Modal
					title={ __(
						'Custom CSS visibility',
						'od-block-css-indicator'
					) }
					onRequestClose={ () => setOpen( false ) }
				>
					<ToggleControl
						label={ __(
							'Highlight blocks with custom CSS',
							'od-block-css-indicator'
						) }
						checked={ settings.enabled }
						onChange={ ( enabled ) =>
							updateSettings( { enabled } )
						}
					/>
					<p>{ __( 'Key color', 'od-block-css-indicator' ) }</p>
					<ColorPalette
						aria-label={ __(
							'Key color',
							'od-block-css-indicator'
						) }
						colors={ colors }
						value={ settings.color }
						clearable={ false }
						enableAlpha={ false }
						onChange={ ( color ) => {
							if ( color ) {
								updateSettings( { color } );
							}
						} }
					/>
					<p
						className="od-block-css-indicator__preview"
						style={ {
							'--od-block-css-indicator-color': settings.color,
						} }
					>
						{ __( 'Outline preview', 'od-block-css-indicator' ) }{ ' ' }
						{ settings.color }
					</p>
					<Button
						variant="secondary"
						onClick={ () =>
							updateSettings( { color: DEFAULT_COLOR } )
						}
					>
						{ __( 'Reset color', 'od-block-css-indicator' ) }
					</Button>
					<p role="status">
						{ status === 'saving' &&
							__( 'Saving settings…', 'od-block-css-indicator' ) }
						{ status === 'saved' &&
							__(
								'Settings saved for your account.',
								'od-block-css-indicator'
							) }
					</p>
					{ status === 'error' && (
						<Notice status="error" isDismissible={ false }>
							{ __(
								'Could not save settings. Please try again.',
								'od-block-css-indicator'
							) }
							<Button
								variant="secondary"
								onClick={ () => setAttempt( attempt + 1 ) }
							>
								{ __( 'Retry', 'od-block-css-indicator' ) }
							</Button>
						</Notice>
					) }
				</Modal>
			) }
		</>
	);
}
