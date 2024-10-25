import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './RoomSettings.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';

import Text from '../../atoms/text/Text';
import { MenuHeader, MenuItem } from '../../atoms/context-menu/ContextMenu';
import RoomProfile from '../../molecules/room-profile/RoomProfile';
import RoomNotification from '../../molecules/room-notification/RoomNotification';
import RoomVisibility from '../../molecules/room-visibility/RoomVisibility';
import RoomAliases from '../../molecules/room-aliases/RoomAliases';
import RoomHistoryVisibility from '../../molecules/room-history-visibility/RoomHistoryVisibility';
import RoomEncryption from '../../molecules/room-encryption/RoomEncryption';
import RoomPermissions from '../../molecules/room-permissions/RoomPermissions';
import RoomMembers from '../../molecules/room-members/RoomMembers';
import RoomEmojis from '../../molecules/room-emojis/RoomEmojis';

import { confirmDialog } from '../../molecules/confirm-dialog/ConfirmDialog';
import PopupWindow from '../../molecules/popup-window/PopupWindow';
import { getText, translate } from '../../../lang';
import { BackButtonHandler, useBackButton } from '../../hooks/useBackButton';
import { mdiAccount, mdiArrowLeft, mdiClose, mdiCog, mdiEmoticon, mdiLock, mdiShield } from '@mdi/js';
import Icon from '@mdi/react';
import { AppBar, Box, Dialog, IconButton, List, ListSubheader, Tab, Tabs, useTheme } from '@mui/material';
import ProminientToolbar from '../../components/prominient-toolbar/ProminientToolbar';
import { Close } from '@mui/icons-material';
import { ScreenSize, useScreenSize } from '../../hooks/useScreenSize';

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

function GeneralSettings({ roomId }) {
    const mx = initMatrix.matrixClient;
    const room = mx.getRoom(roomId);

    return (
        <>
            <RoomNotification roomId={roomId} />
            <RoomVisibility roomId={roomId} />
            <RoomAliases roomId={roomId} />
        </>
    );
}

GeneralSettings.propTypes = {
    roomId: PropTypes.string.isRequired,
};

function SecuritySettings({ roomId }) {
    return (
        <>
            <ListSubheader>{getText('room_settings.menuheader.encryption')}</ListSubheader>
            <RoomEncryption roomId={roomId} />
            <ListSubheader>{getText('room_settings.menuheader.history')}</ListSubheader>
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

function a11yProps(index) {
    return {
        id: `simple-tab-${index}`,
        'aria-controls': `simple-tabpanel-${index}`,
    };
}

function RoomSettings() {
    const [selectedTab, setSelectedTab] = useState(0);
    const [window, requestClose] = useWindowToggle(setSelectedTab);
    const roomId = window?.roomId;
    const room = initMatrix.matrixClient.getRoom(roomId);
    const screenSize = useScreenSize();
    const theme = useTheme();

    const handleTabChange = (tabItem) => {
        setSelectedTab(tabItem);
    };

    return (
        <Dialog
            fullScreen={screenSize === ScreenSize.Mobile}
            open={window !== null}
            onClose={requestClose}
            scroll='body'
            sx={{ backdropFilter: 'blur(3px)' }}
        >
            {window !== null && <BackButtonHandler callback={requestClose} id='room-settings' />}
            {window !== null && (
                <AppBar position='relative'>
                    <ProminientToolbar>
                        <Box flexGrow={1}>
                            <RoomProfile roomId={roomId} />
                        </Box>
                        <IconButton
                            size='large'
                            edge='end'
                            onClick={requestClose}
                        >
                            <Close />
                        </IconButton>
                    </ProminientToolbar>
                </AppBar>
            )}
            {window !== null && (
                <div className="room-settings__content" style={{ minHeight: '100%', backgroundColor: theme.palette.background.default }}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs value={selectedTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
                            <Tab label={tabItems[0].text} onClick={() => handleTabChange(0)} {...a11yProps(0)} />
                            <Tab label={tabItems[1].text} onClick={() => handleTabChange(1)} {...a11yProps(1)} />
                            <Tab label={tabItems[2].text} onClick={() => handleTabChange(2)} {...a11yProps(2)} />
                            <Tab label={tabItems[3].text} onClick={() => handleTabChange(3)} {...a11yProps(3)} />
                            <Tab label={tabItems[4].text} onClick={() => handleTabChange(4)} {...a11yProps(4)} />
                        </Tabs>
                    </Box>
                    <List sx={{ bgcolor: 'background.default' }}>
                        <div className="room-settings__cards-wrapper">
                            {selectedTab === 0 && <GeneralSettings roomId={roomId} />}
                            {selectedTab === 1 && <RoomMembers roomId={roomId} />}
                            {selectedTab === 2 && <RoomEmojis roomId={roomId} />}
                            {selectedTab === 3 && <RoomPermissions roomId={roomId} />}
                            {selectedTab === 4 && <SecuritySettings roomId={roomId} />}
                        </div>
                    </List>
                </div>
            )}
        </Dialog>
    );
}

export default RoomSettings;
export { tabText };
