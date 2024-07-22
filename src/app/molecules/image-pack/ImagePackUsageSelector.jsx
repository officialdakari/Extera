import React from 'react';
import PropTypes from 'prop-types';

import { MenuHeader, MenuItem } from '../../atoms/context-menu/ContextMenu';
import CheckIC from '../../../../public/res/ic/outlined/check.svg';
import { getText } from '../../../lang';

function ImagePackUsageSelector({ usage, onSelect }) {
    return (
        <div>
            <MenuHeader>{getText('image_pack.usage')}</MenuHeader>
            <MenuItem
                iconSrc={usage === 'emoticon' ? CheckIC : undefined}
                variant={usage === 'emoticon' ? 'positive' : 'surface'}
                onClick={() => onSelect('emoticon')}
            >
                {getText('image.usage.emoji')}
            </MenuItem>
            <MenuItem
                iconSrc={usage === 'sticker' ? CheckIC : undefined}
                variant={usage === 'sticker' ? 'positive' : 'surface'}
                onClick={() => onSelect('sticker')}
            >
                {getText('image.usage.sticker')}
            </MenuItem>
            <MenuItem
                iconSrc={usage === 'both' ? CheckIC : undefined}
                variant={usage === 'both' ? 'positive' : 'surface'}
                onClick={() => onSelect('both')}
            >
                {getText('image.usage.both')}
            </MenuItem>
        </div>
    );
}

ImagePackUsageSelector.propTypes = {
    usage: PropTypes.oneOf(['emoticon', 'sticker', 'both']).isRequired,
    onSelect: PropTypes.func.isRequired,
};

export default ImagePackUsageSelector;
