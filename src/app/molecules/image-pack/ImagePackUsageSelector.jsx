import React from 'react';
import PropTypes from 'prop-types';

import { MenuItem, Paper } from '@mui/material';
import { getText } from '../../../lang';

function ImagePackUsageSelector({ usage, onSelect }) {
	return (
		<Paper>
			<MenuItem
				selected={usage === 'emoticon'}
				onClick={() => onSelect('emoticon')}
			>
				{getText('image.usage.emoji')}
			</MenuItem>
			<MenuItem
				selected={usage === 'sticker'}
				onClick={() => onSelect('sticker')}
			>
				{getText('image.usage.sticker')}
			</MenuItem>
			<MenuItem
				selected={usage === 'both'}
				onClick={() => onSelect('both')}
			>
				{getText('image.usage.both')}
			</MenuItem>
		</Paper>
	);
}

ImagePackUsageSelector.propTypes = {
	usage: PropTypes.oneOf(['emoticon', 'sticker', 'both']).isRequired,
	onSelect: PropTypes.func.isRequired,
};

export default ImagePackUsageSelector;
