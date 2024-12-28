import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import './RoomSettings.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';

import Text from '../../atoms/text/Text';
import RoomProfile from '../../molecules/room-profile/RoomProfile';
import RoomNotification, { useNotifications } from '../../molecules/room-notification/RoomNotification';
import RoomVisibility from '../../molecules/room-visibility/RoomVisibility';
import RoomAliases from '../../molecules/room-aliases/RoomAliases';
import RoomHistoryVisibility from '../../molecules/room-history-visibility/RoomHistoryVisibility';
import RoomEncryption from '../../molecules/room-encryption/RoomEncryption';
import RoomPermissions from '../../molecules/room-permissions/RoomPermissions';
import RoomMembers from '../../molecules/room-members/RoomMembers';
import RoomEmojis from '../../molecules/room-emojis/RoomEmojis';
import { getText } from '../../../lang';
import { BackButtonHandler } from '../../hooks/useBackButton';
import { mdiAccount, mdiBell, mdiBellAlert, mdiBellOff, mdiBellRing, mdiCog, mdiEmoticon, mdiLock, mdiShield } from '@mdi/js';
import Icon from '@mdi/react';
import { AppBar, Box, Button, Dialog, Divider, IconButton, List, ListItemButton, ListItemIcon, ListItemText, ListSubheader, Tab, Tabs, Toolbar, Typography, useTheme } from '@mui/material';
import { Add, ArrowBack, Edit, EmojiEmotionsOutlined, KeyOutlined, People, PersonAddOutlined, SecurityOutlined, Share } from '@mui/icons-material';
import { ScreenSize, useScreenSize } from '../../hooks/useScreenSize';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useRoomTopic } from '../../hooks/useRoomMeta';
import { millify } from '../../plugins/millify';
import Linkify from 'linkify-react';
import { LINKIFY_OPTS } from '../../plugins/react-custom-html-parser';
import LabelledIconButton from '../../atoms/labelled-icon-button/LabelledIconButton';
import { copyToClipboard } from '../../../util/common';
import { getOriginBaseUrl, joinPathComponent, withOriginBaseUrl } from '../../pages/pathUtils';
import { useClientConfig } from '../../hooks/useClientConfig';
import { useLocation } from 'react-router-dom';
import { UseStateProvider } from '../../components/UseStateProvider';
import TransparentAppBar from '../../atoms/transparent-appbar/TransparentAppBar';
import { StateEvent } from '../../../types/matrix/room';
import { openInviteUser } from '../../../client/action/navigation';

const tabText = {
    GENERAL: getText('room_settings.general'),
    MEMBERS: getText('room_settings.members'),
    EMOJIS: getText('room_settings.emojis'),
    PERMISSIONS: getText('room_settings.permissions'),
    SECURITY: getText('room_settings.security'),
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
    {
        iconSrc: mdiLock,
        text: tabText.SECURITY,
        disabled: false,
    },
];

function SecuritySettings({ roomId }) {
    return (
        <>
            <ListSubheader sx={{ bgcolor: 'transparent' }}>{getText('room_settings.menuheader.encryption')}</ListSubheader>
            <RoomEncryption roomId={roomId} />
            <ListSubheader sx={{ bgcolor: 'transparent' }}>{getText('room_settings.menuheader.history')}</ListSubheader>
            <RoomHistoryVisibility roomId={roomId} />
        </>
    );
}
SecuritySettings.propTypes = {
    roomId: PropTypes.string.isRequired,
};

function useWindowToggle(setSelectedTab) {
    const [window, setWindow] = useState(null);

    useEffect(() => {
        const openRoomSettings = (roomId, tab) => {
            setWindow({ roomId, tabText });
            const tabItem = tabItems.find((item) => item.text === tab);
            if (tabItem) setSelectedTab(tabItem);
        };
        navigation.on(cons.events.navigation.ROOM_SETTINGS_TOGGLED, openRoomSettings);
        return () => {
            navigation.removeListener(cons.events.navigation.ROOM_SETTINGS_TOGGLED, openRoomSettings);
        };
    }, [setSelectedTab]);

    const requestClose = () => setWindow(null);

    return [window, requestClose];
}

function RoomTopic({ room, onEdit }) {
    const topic = useRoomTopic(room);
    const canEdit = useMemo(() => room.currentState.maySendEvent(StateEvent.RoomTopic), [room]);
    return (
        <>
            <ListSubheader sx={{ bgcolor: 'transparent' }}>{getText('room.topic')}</ListSubheader>
            {topic && (
                <Text variant='b3'>
                    <Linkify options={LINKIFY_OPTS}>{topic}</Linkify>
                </Text>
            )}
            {!topic && canEdit && (
                <ListItemButton onClick={onEdit}>
                    <ListItemIcon>
                        <Add />
                    </ListItemIcon>
                    <ListItemText>
                        {getText('room.topic.add')}
                    </ListItemText>
                </ListItemButton>
            )}
        </>
    );
}

function RoomNotificationItem({ room, onClick }) {
    const [activeType] = useNotifications(room.roomId);
    const items = [
        {
            iconSrc: mdiBell,
            text: getText('room_notifications.global'),
            type: cons.notifs.DEFAULT,
        },
        {
            iconSrc: mdiBellRing,
            text: getText('room_notifications.all'),
            type: cons.notifs.ALL_MESSAGES,
        },
        {
            iconSrc: mdiBellAlert,
            text: getText('room_notifications.mentions'),
            type: cons.notifs.MENTIONS_AND_KEYWORDS,
        },
        {
            iconSrc: mdiBellOff,
            text: getText('room_notifications.mute'),
            type: cons.notifs.MUTE,
        },
    ];

    return (
        <ListItemButton onClick={onClick}>
            <ListItemIcon>
                <Icon size={1} path={items.find(x => x.type == activeType).iconSrc} />
            </ListItemIcon>
            <ListItemText primary={getText('room_notification')} secondary={items.find(x => x.type == activeType).text} />
        </ListItemButton>
    );
}

function RoomMembersItem({ room, onClick }) {
    return (
        <ListItemButton onClick={onClick}>
            <ListItemIcon>
                <People />
            </ListItemIcon>
            <ListItemText>
                {getText('room_settings.members')}
            </ListItemText>
            <Typography pr={1} color='textSecondary'>
                {millify(room.getJoinedMemberCount())}
            </Typography>
        </ListItemButton>
    );
}

function RoomSettings() {
    const mx = useMatrixClient();
    const [selectedTab, setSelectedTab] = useState(0);
    const [isEditing, setEditing] = useState(false);
    const [window, requestClose] = useWindowToggle(setSelectedTab);
    const roomId = window?.roomId;
    const room = initMatrix.matrixClient.getRoom(roomId);
    const screenSize = useScreenSize();
    // const theme = useTheme();
    // const bannerMxc = room ? room.currentState.getStateEvents('page.codeberg.everypizza')[0]?.getContent().url : null;
    // const bannerURL = bannerMxc ? mx.mxcUrlToHttp(bannerMxc, false, false, false, false, true, true) : null;

    const { hashRouter } = useClientConfig();
    const location = useLocation();
    const currentPath = joinPathComponent(location);

    const handleClose = () => {
        if (selectedTab === 0) requestClose();
        else setSelectedTab(0);
    };

    return (
        <Dialog
            fullScreen={screenSize === ScreenSize.Mobile}
            fullWidth
            maxWidth='md'
            open={window !== null}
            onClose={requestClose}
            scroll='body'
        >
            {window !== null && <BackButtonHandler callback={requestClose} id='room-settings' />}
            {window !== null && (
                <TransparentAppBar position='relative'>
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
                            {selectedTab === 1 && getText('room_notification')}
                            {selectedTab === 2 && getText('room_settings.members')}
                            {selectedTab === 3 && getText('room_settings.emojis')}
                            {selectedTab === 4 && getText('room_settings.security')}
                            {selectedTab === 5 && getText('room_settings.permissions')}
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
            )}
            {window !== null && (
                <div className="room-settings__content">
                    {selectedTab === 0 && <RoomProfile roomId={roomId} isEditing={isEditing} setIsEditing={setEditing} />}
                    {selectedTab === 0 && !isEditing && (
                        <>
                            <div className='room-settings__actions'>
                                <LabelledIconButton onClick={() => openInviteUser(roomId)} startIcon={<PersonAddOutlined />}>
                                    {getText('btn.invite')}
                                </LabelledIconButton>
                                <LabelledIconButton onClick={() => copyToClipboard(withOriginBaseUrl(getOriginBaseUrl(hashRouter), currentPath))} startIcon={<Share />}>
                                    {getText('share')}
                                </LabelledIconButton>
                            </div>
                            <div className='room-settings__topic'>
                                <RoomTopic room={room} onEdit={() => setEditing(true)} />
                            </div>
                            <Divider />
                            <RoomNotificationItem room={room} onClick={() => setSelectedTab(1)} />
                            <RoomMembersItem room={room} onClick={() => setSelectedTab(2)} />
                            <ListItemButton onClick={() => setSelectedTab(3)}>
                                <ListItemIcon>
                                    <EmojiEmotionsOutlined />
                                </ListItemIcon>
                                <ListItemText>
                                    {getText('room_settings.emojis')}
                                </ListItemText>
                            </ListItemButton>
                            <ListItemButton onClick={() => setSelectedTab(5)}>
                                <ListItemIcon>
                                    <KeyOutlined />
                                </ListItemIcon>
                                <ListItemText>
                                    {getText('room_settings.permissions')}
                                </ListItemText>
                            </ListItemButton>
                            <ListItemButton onClick={() => setSelectedTab(4)}>
                                <ListItemIcon>
                                    <SecurityOutlined />
                                </ListItemIcon>
                                <ListItemText>
                                    {getText('room_settings.security')}
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
                                            <LeaveRoomPrompt
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
                    {selectedTab > 0 && <BackButtonHandler id='room-settings-tab' callback={() => setSelectedTab(0)} />}
                    {selectedTab === 1 && <RoomNotification roomId={roomId} />}
                    {selectedTab === 2 && <RoomMembers roomId={roomId} />}
                    {selectedTab === 3 && <RoomEmojis roomId={roomId} />}
                    {selectedTab === 4 && <SecuritySettings roomId={roomId} />}
                    {selectedTab === 5 && <RoomPermissions roomId={roomId} />}
                    {/* {selectedTab === 6 && <RoomProfile roomId={roomId} isEditing requestClose={() => setSelectedTab(0)} />} */}
                </div>
            )}
        </Dialog>
    );
}

export default RoomSettings;
export { tabText, RoomTopic, RoomNotificationItem, RoomMembersItem };
