import React, { useState, useEffect, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';

import initMatrix from '../../../client/initMatrix';
import colorMXID from '../../../util/colorMXID';

import Text from '../../atoms/text/Text';
import ImageUpload from '../../molecules/image-upload/ImageUpload';

import { confirmDialog } from '../../molecules/confirm-dialog/ConfirmDialog';

import './ProfileEditor.scss';
import { getText } from '../../../lang';
import { mdiPencil } from '@mdi/js';
import { Button, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, ListSubheader, Snackbar, TextField } from '@mui/material';
import { Close, Edit, Save } from '@mui/icons-material';
import { Box } from 'folds';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useAccountData } from '../../hooks/useAccountData';
import { copyToClipboard } from '../../../util/common';
import { mxcUrlToHttp } from '../../utils/matrix';

function ProfileEditor({ userId }) {
    const [isEditing, setIsEditing] = useState(false);
    const mx = useMatrixClient();
    const user = mx.getUser(mx.getUserId());

    const displayNameRef = useRef(null);
    const [avatarSrc, setAvatarSrc] = useState(
        user.avatarUrl ? mxcUrlToHttp(mx, user.avatarUrl, 80, 80, 'crop') : null
    );
    const [username, setUsername] = useState(user.displayName);
    const [disabled, setDisabled] = useState(true);

    useEffect(() => {
        let isMounted = true;
        mx.getProfileInfo(mx.getUserId()).then((info) => {
            if (!isMounted) return;
            setAvatarSrc(info.avatar_url ? mxcUrlToHttp(mx, info.avatar_url, 80, 80, 'crop') : null);
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
        setAvatarSrc(mxcUrlToHttp(mx, url, 80, 80, 'crop'));
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
                variant='filled'
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
            <Text variant="b2">{mx.getUser(userId).presence}</Text>
        </div>
    );

    const exteraProfileEvent = useAccountData('ru.officialdakari.extera_profile');
    const [bannerSrc, setBannerSrc] = useState('');

    useEffect(() => {
        const exteraProfile = exteraProfileEvent ? exteraProfileEvent.getContent() : {};
        console.log(exteraProfile);
        if (typeof exteraProfile.banner_url === 'string') {
            console.log(exteraProfile.banner_url);
            setBannerSrc(exteraProfile.banner_url);
        }
    }, [mx, exteraProfileEvent]);

    const handleBannerChange = async (src) => {
        try {
            await mx.setAccountData('ru.officialdakari.extera_profile', {
                banner_url: src
            });
            setBannerSrc(src);
        } catch (error) {
            console.error(error);
            alert(error.message); // TODO Better error handling
        }
    };

    const uploadImageRef = useRef(null);
    const [uploadPromise, setUploadPromise] = useState(null);

    async function uploadImage(e) {
        const file = e.target.files.item(0);
        if (file === null) return;
        try {
            const uPromise = mx.uploadContent(file);
            setUploadPromise(uPromise);

            const res = await uPromise;
            if (typeof res?.content_uri === 'string') handleBannerChange(res.content_uri);
            setUploadPromise(null);
        } catch {
            setUploadPromise(null);
        }
        uploadImageRef.current.value = null;
    }

    function handleClick() {
        if (uploadPromise !== null) return;
        uploadImageRef.current?.click();
    };

    const handleBannerRemove = async () => {
        try {
            if (await confirmDialog(getText('remove_banner.title'), getText('remove_banner.desc'), getText('btn.remove_banner.confirm'), 'error')) {
                await mx.setAccountData('ru.officialdakari.extera_profile', {
                    banner_url: null
                });
                setBannerSrc(null);
            }
        } catch (error) {
            alert(error.message); // TODO Better error handling
        }
    };

    const bannerUrl = useMemo(() => {
        return mxcUrlToHttp(mx, bannerSrc);
    }, [mx, bannerSrc]);

    const [snackbarOpen, setSnackbar] = useState(false);

    const handleCopyMxId = () => {
        copyToClipboard(`https://matrix.to/#/${userId}`);
        setSnackbar(true);
    };

    return (
        <List sx={{ p: 0 }}>
            <input type='file' accept='image/*' onChange={uploadImage} ref={uploadImageRef} style={{ display: 'none' }} />
            <div className="profile-editor" style={bannerUrl ? { background: `url(${bannerUrl}), #00000075` } : {}}>
                <ImageUpload
                    text={username ?? userId}
                    bgColor={colorMXID(userId)}
                    imageSrc={avatarSrc}
                    onUpload={handleAvatarUpload}
                    onRequestRemove={() => handleAvatarUpload(null)}
                />
                {isEditing ? renderForm() : renderInfo()}
            </div>
            <ListSubheader sx={{ bgcolor: 'transparent' }}>
                {getText('tab.profile')}
            </ListSubheader>
            <ListItemButton onClick={handleCopyMxId}>
                <ListItemText primary={userId} secondary={getText('matrix_id')} />
            </ListItemButton>
            <ListItem
                disablePadding
                secondaryAction={
                    bannerUrl && (
                        <IconButton onClick={handleBannerRemove}>
                            <Close />
                        </IconButton>
                    )
                }
            >
                <ListItemButton role={undefined} onClick={handleClick} dense>
                    <ListItemText primary={getText('btn.banner')} secondary={getText('btn.banner.2')} />
                </ListItemButton>
            </ListItem>
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={() => setSnackbar(false)}
                message={getText('matrix_id.link_copied')}
                anchorOrigin={{
                    horizontal: 'center',
                    vertical: 'bottom'
                }}
            />
        </List>
    );
}

ProfileEditor.defaultProps = {
    userId: null,
};

ProfileEditor.propTypes = {
    userId: PropTypes.string,
};

export default ProfileEditor;
