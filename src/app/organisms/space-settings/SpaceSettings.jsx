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
import { useBackButton } from '../../hooks/useBackButton';
import { mdiAccount, mdiArrowLeft, mdiClose, mdiCog, mdiEmoticon, mdiShield } from '@mdi/js';
import { AppBar, Box, Dialog, DialogContent, DialogTitle, IconButton, Tab, Tabs, Toolbar, Typography } from '@mui/material';
import { Close } from '@mui/icons-material';

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
        <>
            <div className="space-settings__card">
                <MenuHeader>Options</MenuHeader>
                <MenuItem
                    variant="danger"
                    onClick={async () => {
                        const isConfirmed = await confirmDialog(
                            getText('leavespace.title'),
                            getText('leavespace.text.2', roomName),
                            getText('btn.leave'),
                            'danger'
                        );
                        if (isConfirmed) mx.leave(roomId);
                    }}
                    iconSrc={mdiArrowLeft}
                >
                    {getText('btn.leave')}
                </MenuItem>
            </div>
            <div className="space-settings__card">
                <MenuHeader>{getText('space_settings.visibility')}</MenuHeader>
                <RoomVisibility roomId={roomId} />
            </div>
            <div className="space-settings__card">
                <MenuHeader>{getText('space_settings.addresses')}</MenuHeader>
                <RoomAliases roomId={roomId} />
            </div>
        </>
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

    const mx = initMatrix.matrixClient;
    const room = mx.getRoom(roomId);

    const handleTabChange = (event, tabItem) => {
        setSelectedTab(tabItem);
    };

    useBackButton(requestClose);

    return (
        <Dialog
            open={isOpen}
            onClose={requestClose}
            scroll='body'
        >
            <AppBar sx={{ position: 'relative' }}>
                <Toolbar>
                    <Typography
                        variant='h6'
                        component='div'
                        sx={{ flexGrow: 1 }}
                    >
                        {translate(
                            'space_settings.title',
                            room?.name,
                            getText('space_settings.title.1')
                        )}
                    </Typography>
                    <IconButton
                        size='large'
                        onClick={requestClose}
                    >
                        <Close />
                    </IconButton>
                </Toolbar>
            </AppBar>
            <Box
                sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
                <Tabs
                    orientation='horizontal'
                    variant='scrollable'
                    value={selectedTab}
                    onChange={handleTabChange}
                >
                    {tabItems.map((tabItem, index) => (
                        <Tab label={tabItem.text} {...allyProps(index)} />
                    ))}
                </Tabs>
            </Box>
            {tabItems.map((tabItem, index) => (
                <div
                    role='tabpanel'
                    hidden={selectedTab !== index}
                    id={`vertical-tabpanel-${index}`}
                    aria-labelledby={`vertical-tab-${index}`}
                    style={{ maxWidth: '100%', flexGrow: 1 }}
                >
                    {selectedTab === index && (
                        <Box
                            sx={{ maxWidth: '100%' }}
                        >
                            {selectedTab === 0 && (
                                <GeneralSettings roomId={roomId} />
                            )}
                            {selectedTab === 1 && (
                                <RoomMembers roomId={roomId} />
                            )}
                            {selectedTab === 2 && (
                                <RoomEmojis roomId={roomId} />
                            )}
                            {selectedTab === 3 && (
                                <RoomPermissions roomId={roomId} />
                            )}
                        </Box>
                    )}
                </div>
            ))}
        </Dialog>
        // <PopupWindow
        //     isOpen={isOpen}
        //     className="space-settings"
        //     title={
        //         <Text variant="s1" weight="medium" primary>
        //             {translate(
        //                 'space_settings.title',
        //                 room?.name,
        //                 getText('space_settings.title.1')
        //             )}
        //         </Text>
        //     }
        //     contentOptions={<IconButton src={mdiClose} onClick={requestClose} tooltip="Close" />}
        //     onRequestClose={requestClose}
        // >
        //     {isOpen && (
        //         <div className="space-settings__content">
        //             <RoomProfile roomId={roomId} />
        //             <Tabs
        //                 items={tabItems}
        //                 defaultSelected={tabItems.findIndex((tab) => tab.text === selectedTab.text)}
        //                 onSelect={handleTabChange}
        //             />
        //             <div className="space-settings__cards-wrapper">
        //                 {selectedTab.text === tabText.GENERAL && <GeneralSettings roomId={roomId} />}
        //                 {selectedTab.text === tabText.MEMBERS && <RoomMembers roomId={roomId} />}
        //                 {selectedTab.text === tabText.EMOJIS && <RoomEmojis roomId={roomId} />}
        //                 {selectedTab.text === tabText.PERMISSIONS && <RoomPermissions roomId={roomId} />}
        //             </div>
        //         </div>
        //     )}
        // </PopupWindow>
    );
}

export default SpaceSettings;
