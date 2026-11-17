import { BlockControls } from '@wordpress/block-editor';
import { hasBlockSupport } from '@wordpress/blocks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { ToolbarGroup, Tooltip } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';
import { registerPlugin } from '@wordpress/plugins';
import { store } from './store';
import { hasCustomCSS, highlightProps } from './utils';
import SettingsPlugin from './settings';
import './style.scss';

function Indicator() {
	const color = useSelect(
		( select ) => select( store ).getSettings().color,
		[]
	);
	return (
		<BlockControls group="other">
			<ToolbarGroup>
				<Tooltip
					text={ __( 'Custom CSS is set', 'od-block-css-indicator' ) }
				>
					<span
						className="od-block-css-indicator__badge"
						role="img"
						aria-label={ __(
							'Custom CSS is set',
							'od-block-css-indicator'
						) }
						style={ {
							'--od-block-css-indicator-color': color,
						} }
					>
						<span aria-hidden="true">{ '{ }' }</span>
						<span aria-hidden="true">CSS</span>
					</span>
				</Tooltip>
			</ToolbarGroup>
		</BlockControls>
	);
}

const withIndicator = createHigherOrderComponent(
	( BlockEdit ) => ( props ) => {
		return (
			<>
				<BlockEdit { ...props } />
				{ props.isSelected &&
					hasBlockSupport( props.name, 'customCSS', true ) &&
					hasCustomCSS( props.attributes ) && <Indicator /> }
			</>
		);
	},
	'withODCSSIndicator'
);

const withHighlight = createHigherOrderComponent(
	( BlockListBlock ) => ( props ) => {
		const eligible =
			hasBlockSupport( props.name, 'customCSS', true ) &&
			hasCustomCSS( props.attributes );
		const settings = useSelect(
			( select ) => ( eligible ? select( store ).getSettings() : null ),
			[ eligible ]
		);
		const highlighted = settings?.enabled;
		return (
			<BlockListBlock
				{ ...( highlighted
					? highlightProps( props, settings )
					: props ) }
			/>
		);
	},
	'withODCSSHighlight'
);

addFilter(
	'editor.BlockEdit',
	'od-block-css-indicator/toolbar',
	withIndicator
);
addFilter(
	'editor.BlockListBlock',
	'od-block-css-indicator/highlight',
	withHighlight
);
registerPlugin( 'od-block-css-indicator', { render: SettingsPlugin } );
