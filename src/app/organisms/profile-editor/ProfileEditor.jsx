import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

import initMatrix from '../../../client/initMatrix';
import colorMXID from '../../../util/colorMXID';

import Text from '../../atoms/text/Text';
import ImageUpload from '../../molecules/image-upload/ImageUpload';

import { confirmDialog } from '../../molecules/confirm-dialog/ConfirmDialog';

import './ProfileEditor.scss';
import { getText } from '../../../lang';
import { mdiPencil } from '@mdi/js';
import { Button, IconButton, TextField } from '@mui/material';
import { Close, Edit, Save } from '@mui/icons-material';
import { Box } from 'folds';
import { useMatrixClient } from '../../hooks/useMatrixClient';

function ProfileEditor({ userId }) {
    const [isEditing, setIsEditing] = useState(false);
    const mx = useMatrixClient();
    const user = mx.getUser(mx.getUserId());

    const displayNameRef = useRef(null);
    const [avatarSrc, setAvatarSrc] = useState(
        user.avatarUrl ? mx.mxcUrlToHttp(user.avatarUrl, 80, 80, 'crop') : null
    );
    const [username, setUsername] = useState(user.displayName);
    const [disabled, setDisabled] = useState(true);

    useEffect(() => {
        let isMounted = true;
        mx.getProfileInfo(mx.getUserId()).then((info) => {
            if (!isMounted) return;
            setAvatarSrc(info.avatar_url ? mx.mxcUrlToHttp(info.avatar_url, 80, 80, 'crop') : null);
            setUsername(info.displayname);
        });
        return () => {
            isMounted = false;
        };
    }, [userId]);

    const handleAvatarUpload = async (url) => {
        if (url === null) {
            const isConfirmed = await confirmDialog(
                getText('profile_editor.remove_avatar.title'),
                getText('profile_editor.remove_avatar.desc'),
                getText('btn.profile_editor.remove_avatar'),
                'caution'
            );
            if (isConfirmed) {
                mx.setAvatarUrl('');
                setAvatarSrc(null);
            }
            return;
        }
        mx.setAvatarUrl(url);
        setAvatarSrc(mx.mxcUrlToHttp(url, 80, 80, 'crop'));
    };

    const saveDisplayName = () => {
        const newDisplayName = displayNameRef.current.value;
        if (newDisplayName !== null && newDisplayName !== username) {
            mx.setDisplayName(newDisplayName);
            setUsername(newDisplayName);
            setDisabled(true);
            setIsEditing(false);
        }
    };

    const onDisplayNameInputChange = () => {
        setDisabled(username === displayNameRef.current.value || displayNameRef.current.value == null);
    };
    const cancelDisplayNameChanges = () => {
        displayNameRef.current.value = username;
        onDisplayNameInputChange();
        setIsEditing(false);
    };

    const renderForm = () => (
        <form
            className="profile-editor__form"
            style={{ marginBottom: avatarSrc ? '24px' : '0' }}
            onSubmit={(e) => {
                e.preventDefault();
                saveDisplayName();
            }}
        >
            <TextField
                label={getText('profile_editor.displayname')}
                onChange={onDisplayNameInputChange}
                defaultValue={mx.getUser(mx.getUserId()).displayName}
                inputRef={displayNameRef}
                size='small'
                variant='standard'
            />
            <Box grow='Yes'>
                <IconButton color="primary" type="submit" disabled={disabled}>
                    <Save />
                </IconButton>
                <IconButton onClick={cancelDisplayNameChanges}>
                    <Close />
                </IconButton>
            </Box>
        </form>
    );

    const renderInfo = () => (
        <div className="profile-editor__info" style={{ marginBottom: avatarSrc ? '24px' : '0' }}>
            <div>
                <Text variant="h2" primary weight="medium">
                    {username ?? userId}
                </Text>
                <IconButton
                    onClick={() => setIsEditing(true)}
                >
                    <Edit />
                </IconButton>
            </div>
            <Text variant="b2">{mx.getUserId()}</Text>
        </div>
    );

    return (
        <div className="profile-editor">
            <ImageUpload
                text={username ?? userId}
                bgColor={colorMXID(userId)}
                imageSrc={avatarSrc}
                onUpload={handleAvatarUpload}
                onRequestRemove={() => handleAvatarUpload(null)}
            />
            {isEditing ? renderForm() : renderInfo()}
        </div>
    );
}

ProfileEditor.defaultProps = {
    userId: null,
};

ProfileEditor.propTypes = {
    userId: PropTypes.string,
};

export default ProfileEditor;
