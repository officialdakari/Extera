import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './ImagePackProfile.scss';

import { openReusableContextMenu } from '../../../client/action/navigation';
import { getEventCords } from '../../../util/common';

import Text from '../../atoms/text/Text';
import Avatar from '../../atoms/avatar/Avatar';
import ImageUpload from '../image-upload/ImageUpload';
import ImagePackUsageSelector from './ImagePackUsageSelector';

import { getText } from '../../../lang';
import { mdiChevronDown, mdiPencil } from '@mdi/js';
import { Button, IconButton, TextField } from '@mui/material';
import { Edit, KeyboardArrowDown } from '@mui/icons-material';

function ImagePackProfile({
    avatarUrl, displayName, attribution, usage,
    onUsageChange, onAvatarChange, onEditProfile,
}) {
    const [isEdit, setIsEdit] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();

        const { nameInput, attributionInput } = e.target;
        const name = nameInput.value.trim() || undefined;
        const att = attributionInput.value.trim() || undefined;

        onEditProfile(name, att);
        setIsEdit(false);
    };

    const handleUsageSelect = (event) => {
        openReusableContextMenu(
            'bottom',
            getEventCords(event, '.btn-surface'),
            (closeMenu) => (
                <ImagePackUsageSelector
                    usage={usage}
                    onSelect={(newUsage) => {
                        onUsageChange(newUsage);
                        closeMenu();
                    }}
                />
            ),
        );
    };

    return (
        <div className="image-pack-profile">
            {
                onAvatarChange
                    ? (
                        <ImageUpload
                            bgColor="#555"
                            text={displayName}
                            imageSrc={avatarUrl}
                            size="normal"
                            onUpload={onAvatarChange}
                            onRequestRemove={() => onAvatarChange(undefined)}
                        />
                    )
                    : <Avatar bgColor="#555" text={displayName} imageSrc={avatarUrl} size="normal" />
            }
            <div className="image-pack-profile__content">
                {
                    isEdit
                        ? (
                            <form onSubmit={handleSubmit}>
                                <TextField name="nameInput" label={getText('label.name')} defaultValue={displayName} required />
                                <TextField name="attributionInput" label={getText('label.attribution')} defaultValue={attribution} multiline />
                                <div>
                                    <Button variant="contained" type="submit">{getText('btn.save')}</Button>
                                    <Button onClick={() => setIsEdit(false)}>{getText('btn.cancel')}</Button>
                                </div>
                            </form>
                        ) : (
                            <>
                                <div>
                                    <Text>{displayName}</Text>
                                    {onEditProfile && <IconButton onClick={() => setIsEdit(true)}><Edit /></IconButton>}
                                </div>
                                {attribution && <Text variant="b3">{attribution}</Text>}
                            </>
                        )
                }
            </div>
            <div className="image-pack-profile__usage">
                <Text variant="b3">{getText('image_pack.pack_usage')}</Text>
                <Button
                    onClick={onUsageChange ? handleUsageSelect : undefined}
                    endIcon={onUsageChange && <KeyboardArrowDown />}
                    color='inherit'
                >
                    {usage === 'emoticon' && getText('image.usage.emoji')}
                    {usage === 'sticker' && getText('image.usage.sticker')}
                    {usage === 'both' && getText('image.usage.both')}
                </Button>
            </div>
        </div>
    );
}

ImagePackProfile.defaultProps = {
    avatarUrl: null,
    attribution: null,
    onUsageChange: null,
    onAvatarChange: null,
    onEditProfile: null,
};
ImagePackProfile.propTypes = {
    avatarUrl: PropTypes.string,
    displayName: PropTypes.string.isRequired,
    attribution: PropTypes.string,
    usage: PropTypes.oneOf(['emoticon', 'sticker', 'both']).isRequired,
    onUsageChange: PropTypes.func,
    onAvatarChange: PropTypes.func,
    onEditProfile: PropTypes.func,
};

export default ImagePackProfile;
