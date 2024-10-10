import React from 'react';
import PropTypes from 'prop-types';
import './ImagePackItem.scss';

import { openReusableContextMenu } from '../../../client/action/navigation';
import { getEventCords } from '../../../util/common';

import Avatar from '../../atoms/avatar/Avatar';
import Text from '../../atoms/text/Text';
import ImagePackUsageSelector from './ImagePackUsageSelector';

import { getText } from '../../../lang';
import { mdiChevronDown, mdiDelete, mdiPencil } from '@mdi/js';
import Icon from '@mdi/react';
import { Button, IconButton } from '@mui/material';
import { DeleteOutline, Edit, KeyboardArrowDown } from '@mui/icons-material';

function ImagePackItem({
    url, shortcode, usage, onUsageChange, onDelete, onRename,
}) {
    const handleUsageSelect = (event) => {
        openReusableContextMenu(
            'bottom',
            getEventCords(event, '.btn-surface'),
            (closeMenu) => (
                <ImagePackUsageSelector
                    usage={usage}
                    onSelect={(newUsage) => {
                        onUsageChange(shortcode, newUsage);
                        closeMenu();
                    }}
                />
            ),
        );
    };

    return (
        <div className="image-pack-item">
            <Avatar imageSrc={url} size="extra-small" text={shortcode} bgColor="black" />
            <div className="image-pack-item__content">
                <Text>{shortcode}</Text>
            </div>
            <div className="image-pack-item__usage">
                <div className="image-pack-item__btn">
                    {onRename && <IconButton onClick={() => onRename(shortcode)}><Edit /></IconButton>}
                    {onDelete && <IconButton color='error' onClick={() => onDelete(shortcode)}><DeleteOutline /></IconButton>}
                </div>
                <Button onClick={onUsageChange ? handleUsageSelect : undefined} color='inherit' endIcon={onUsageChange && <KeyboardArrowDown />}>
                    {usage === 'emoticon' && getText('image.usage.emoji')}
                    {usage === 'sticker' && getText('image.usage.sticker')}
                    {usage === 'both' && getText('image.usage.both')}
                </Button>
            </div>
        </div>
    );
}

ImagePackItem.defaultProps = {
    onUsageChange: null,
    onDelete: null,
    onRename: null,
};
ImagePackItem.propTypes = {
    url: PropTypes.string.isRequired,
    shortcode: PropTypes.string.isRequired,
    usage: PropTypes.oneOf(['emoticon', 'sticker', 'both']).isRequired,
    onUsageChange: PropTypes.func,
    onDelete: PropTypes.func,
    onRename: PropTypes.func,
};

export default ImagePackItem;
