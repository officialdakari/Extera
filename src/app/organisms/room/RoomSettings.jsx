import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './RoomSettings.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';

import Text from '../../atoms/text/Text';
import Tabs from '../../atoms/tabs/Tabs';
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
import { useBackButton } from '../../hooks/useBackButton';
import { mdiAccount, mdiArrowLeft, mdiClose, mdiCog, mdiEmoticon, mdiLock, mdiShield } from '@mdi/js';
import Icon from '@mdi/react';
import { AppBar, Dialog, IconButton } from '@mui/material';
import ProminientToolbar from '../../components/prominient-toolbar/ProminientToolbar';
import { Close } from '@mui/icons-material';

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
        <div className="room-settings__card">
            <RoomNotification roomId={roomId} />
            <RoomVisibility roomId={roomId} />
            <RoomAliases roomId={roomId} />
        </div>
    );
}

GeneralSettings.propTypes = {
    roomId: PropTypes.string.isRequired,
};

function SecuritySettings({ roomId }) {
    return (
        <>
            <div className="room-settings__card">
                <MenuHeader>{getText('room_settings.menuheader.encryption')}</MenuHeader>
                <RoomEncryption roomId={roomId} />
            </div>
            <div className="room-settings__card">
                <MenuHeader>{getText('room_settings.menuheader.history')}</MenuHeader>
                <RoomHistoryVisibility roomId={roomId} />
            </div>
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

function RoomSettings() {
    const [selectedTab, setSelectedTab] = useState(tabItems[0]);
    const [window, requestClose] = useWindowToggle(setSelectedTab);
    const isOpen = window !== null;
    const roomId = window?.roomId;
    const room = initMatrix.matrixClient.getRoom(roomId);

    const handleTabChange = (tabItem) => {
        setSelectedTab(tabItem);
    };

    useBackButton(requestClose);

    return (
        <Dialog
            open={isOpen}
            onClose={requestClose}
        >
            {isOpen && (
                <AppBar position='relative'>
                    <ProminientToolbar>
                        <RoomProfile roomId={roomId} />
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
            {isOpen && (
                <div className="room-settings__content">

                    <Tabs
                        items={tabItems}
                        defaultSelected={tabItems.findIndex((tab) => tab.text === selectedTab.text)}
                        onSelect={handleTabChange}
                    />
                    <div className="room-settings__cards-wrapper">
                        {selectedTab.text === tabText.GENERAL && <GeneralSettings roomId={roomId} />}
                        {selectedTab.text === tabText.MEMBERS && <RoomMembers roomId={roomId} />}
                        {selectedTab.text === tabText.EMOJIS && <RoomEmojis roomId={roomId} />}
                        {selectedTab.text === tabText.PERMISSIONS && <RoomPermissions roomId={roomId} />}
                        {selectedTab.text === tabText.SECURITY && <SecuritySettings roomId={roomId} />}
                    </div>
                </div>
            )}
        </Dialog>
    );
}

export default RoomSettings;
export { tabText };
