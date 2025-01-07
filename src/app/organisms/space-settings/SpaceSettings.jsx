import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './SpaceSettings.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';

import Text from '../../atoms/text/Text';
import { MenuHeader, MenuItem } from '../../atoms/context-menu/ContextMenu';
import PopupWindow from '../../molecules/popup-window/PopupWindow';
import RoomProfile from '../../molecules/room-profile/RoomProfile';
import RoomVisibility from '../../molecules/room-visibility/RoomVisibility';
import RoomAliases from '../../molecules/room-aliases/RoomAliases';
import RoomPermissions from '../../molecules/room-permissions/RoomPermissions';
import RoomMembers from '../../molecules/room-members/RoomMembers';
import RoomEmojis from '../../molecules/room-emojis/RoomEmojis';

import { confirmDialog } from '../../molecules/confirm-dialog/ConfirmDialog';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { getText, translate } from '../../../lang';
import { BackButtonHandler, useBackButton } from '../../hooks/useBackButton';
import { mdiAccount, mdiArrowLeft, mdiClose, mdiCog, mdiEmoticon, mdiShield } from '@mdi/js';
import { AppBar, Box, Dialog, DialogContent, DialogTitle, Divider, IconButton, ListItemButton, ListItemIcon, ListItemText, styled, Tab, Tabs, Toolbar, Typography, useTheme } from '@mui/material';
import { ArrowBack, Close, Edit, EmojiEmotionsOutlined, KeyOutlined, PersonAddOutlined, Share } from '@mui/icons-material';
import ProminientToolbar from '../../components/prominient-toolbar/ProminientToolbar';
import { ScreenSize, useScreenSize } from '../../hooks/useScreenSize';
import TransparentAppBar from '../../atoms/transparent-appbar/TransparentAppBar';
import LabelledIconButton from '../../atoms/labelled-icon-button/LabelledIconButton';
import { useClientConfig } from '../../hooks/useClientConfig';
import { useLocation } from 'react-router-dom';
import { getOriginBaseUrl, joinPathComponent, withOriginBaseUrl } from '../../pages/pathUtils';
import { copyToClipboard } from '../../../util/common';
import { LeaveSpacePrompt } from '../../components/leave-space-prompt';
import { RoomMembersItem } from '../room/RoomSettings';
import { UseStateProvider } from '../../components/UseStateProvider';
import { openInviteUser } from '../../../client/action/navigation';

const tabText = {
    GENERAL: getText('room_settings.general'),
    MEMBERS: getText('room_settings.members'),
    EMOJIS: getText('room_settings.emojis'),
    PERMISSIONS: getText('room_settings.permissions'),
};

const tabItems = [
    {
        iconSrc: mdiCog,
        text: tabText.GENERAL,
        disabled: false,
    },
    {
        iconSrc: mdiAccount,
        text: tabText.MEMBERS,
        disabled: false,
    },
    {
        iconSrc: mdiEmoticon,
        text: tabText.EMOJIS,
        disabled: false,
    },
    {
        iconSrc: mdiShield,
        text: tabText.PERMISSIONS,
        disabled: false,
    },
];

function GeneralSettings({ roomId }) {
    const roomName = initMatrix.matrixClient.getRoom(roomId)?.name;
    const mx = useMatrixClient();

    return (
        <div className='space-settings__card'>
            <ListSubheader sx={{ bgcolor: 'transparent' }}>{getText('room_visibility')}</ListSubheader>
            <RoomVisibility roomId={roomId} />
            <ListSubheader sx={{ bgcolor: 'transparent' }}>{getText('room_aliases')}</ListSubheader>
            <RoomAliases roomId={roomId} />
        </div>
    );
}

GeneralSettings.propTypes = {
    roomId: PropTypes.string.isRequired,
};

function useWindowToggle(setSelectedTab) {
    const [window, setWindow] = useState(null);

    useEffect(() => {
        const openSpaceSettings = (roomId, tab) => {
            setWindow({ roomId, tabText });
            const tabItem = tabItems.find((item) => item.text === tab);
            if (tabItem) setSelectedTab(tabItem);
        };
        navigation.on(cons.events.navigation.SPACE_SETTINGS_OPENED, openSpaceSettings);
        return () => {
            navigation.removeListener(cons.events.navigation.SPACE_SETTINGS_OPENED, openSpaceSettings);
        };
    }, []);

    const requestClose = () => setWindow(null);

    return [window, requestClose];
}

function allyProps(index) {
    return {
        id: `vertical-tab-${index}`,
        'aria-controls': `vertical-tabpanel-${index}`,
    };
}

function SpaceSettings() {
    const [selectedTab, setSelectedTab] = useState(0);
    const [window, requestClose] = useWindowToggle(setSelectedTab);
    const isOpen = window !== null;
    const roomId = window?.roomId;
    const screenSize = useScreenSize();
    const [isEditing, setEditing] = useState(false);

    const mx = initMatrix.matrixClient;
    const room = mx.getRoom(roomId);

    const { hashRouter } = useClientConfig();
    const location = useLocation();
    const currentPath = joinPathComponent(location);

    if (!room) return null;

    const handleClose = () => {
        if (selectedTab === 0) requestClose();
        else setSelectedTab(0);
    };

    return (
        <Dialog
            open={isOpen}
            onClose={requestClose}
            scroll='body'
            fullScreen={screenSize === ScreenSize.Mobile}
            fullWidth
            maxWidth='md'
        >
            {isOpen && <BackButtonHandler callback={requestClose} id='space-settings' />}
            <TransparentAppBar sx={{ position: 'relative' }}>
                <Toolbar>
                    <IconButton
                        size='large'
                        edge='start'
                        onClick={handleClose}
                    >
                        <ArrowBack />
                    </IconButton>
                    <Typography
                        variant='h6'
                        component='div'
                        flexGrow={1}
                    >
                        {selectedTab === 1 && getText('room_settings.members')}
                        {selectedTab === 2 && getText('room_settings.emojis')}
                        {selectedTab === 4 && getText('room_settings.security')}
                        {selectedTab === 3 && getText('room_settings.permissions')}
                    </Typography>
                    {selectedTab === 0 && (
                        <IconButton
                            size='large'
                            edge='end'
                            onClick={() => setEditing(true)}
                        >
                            <Edit />
                        </IconButton>
                    )}
                </Toolbar>
            </TransparentAppBar>
            {isOpen && (
                <>
                    {selectedTab === 0 && <RoomProfile roomId={roomId} isEditing={isEditing} setIsEditing={setEditing} />}
                    {selectedTab === 0 && !isEditing && (
                        <>
                            <div className='space-settings__actions'>
                                <LabelledIconButton onClick={() => openInviteUser(roomId)} startIcon={<PersonAddOutlined />}>
                                    {getText('btn.invite')}
                                </LabelledIconButton>
                                <LabelledIconButton onClick={() => copyToClipboard(withOriginBaseUrl(getOriginBaseUrl(hashRouter), currentPath))} startIcon={<Share />}>
                                    {getText('share')}
                                </LabelledIconButton>
                            </div>
                            <RoomMembersItem room={room} onClick={() => setSelectedTab(1)} />
                            <ListItemButton onClick={() => setSelectedTab(2)}>
                                <ListItemIcon>
                                    <EmojiEmotionsOutlined />
                                </ListItemIcon>
                                <ListItemText>
                                    {getText('room_settings.emojis')}
                                </ListItemText>
                            </ListItemButton>
                            <ListItemButton onClick={() => setSelectedTab(3)}>
                                <ListItemIcon>
                                    <KeyOutlined />
                                </ListItemIcon>
                                <ListItemText>
                                    {getText('room_settings.permissions')}
                                </ListItemText>
                            </ListItemButton>
                            <Divider />
                            <UseStateProvider initial={false}>
                                {(promptLeave, setPromptLeave) => (
                                    <>
                                        <ListItemButton
                                            onClick={() => setPromptLeave(true)}
                                            aria-pressed={promptLeave}
                                        >
                                            <ListItemIcon>
                                                <ArrowBack color='error' />
                                            </ListItemIcon>
                                            <ListItemText sx={{ color: 'error.main' }}>
                                                {getText('room_header.leave')}
                                            </ListItemText>
                                        </ListItemButton>
                                        {promptLeave && (
                                            <LeaveSpacePrompt
                                                roomId={room.roomId}
                                                onDone={requestClose}
                                                onCancel={() => setPromptLeave(false)}
                                            />
                                        )}
                                    </>
                                )}
                            </UseStateProvider>
                        </>
                    )}
                    {selectedTab > 0 && <BackButtonHandler id='space-settings-tab' callback={() => setSelectedTab(0)} />}
                    {selectedTab === 1 && <RoomMembers roomId={roomId} />}
                    {selectedTab === 2 && <RoomEmojis roomId={roomId} />}
                    {selectedTab === 3 && <RoomPermissions roomId={roomId} />}
                </>
            )}
        </Dialog>
    );
}

export default SpaceSettings;
