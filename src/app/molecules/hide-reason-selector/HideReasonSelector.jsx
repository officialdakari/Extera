import React from 'react';
import './HideReasonSelector.scss';

import PropTypes from 'prop-types';
import { MenuItem } from '../../atoms/context-menu/ContextMenu';

import { getText } from '../../../lang';

function HideReasonSelector({
	value, onSelect,
}) {
	const tags = [
		'space.0x1a8510f2.msc3368.spoiler',
		'space.0x1a8510f2.msc3368.nsfw',
		'space.0x1a8510f2.msc3368.health_risk',
		'space.0x1a8510f2.msc3368.health_risk.flashing',
		'space.0x1a8510f2.msc3368.graphic',
		'space.0x1a8510f2.msc3368.hidden'
	];
	return (
		<div className="hide-reason-selector">
			{tags.map(
				tag => (
					<MenuItem variant={value === tag ? 'positive' : 'surface'} onClick={() => onSelect(tag)}>{getText(tag)}</MenuItem>
				)
			)}
			<MenuItem variant={!value ? 'positive' : 'surface'} onClick={() => onSelect(null)}>{getText('hide_reason.none')}</MenuItem>
		</div>
	);
}
HideReasonSelector.propTypes = {
	value: PropTypes.string.isRequired,
	onSelect: PropTypes.func.isRequired,
};

export default HideReasonSelector;
