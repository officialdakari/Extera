import React, { MouseEventHandler, forwardRef, useState } from 'react';
import {
    Avatar,
    Box,
    RectCords,
    Text,
    config,
    toRem,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import { PageHeader } from '../../components/page';
import { useSetSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { useRoomAvatar, useRoomName } from '../../hooks/useRoomMeta';
import { useSpace } from '../../hooks/useSpace';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { RoomAvatar } from '../../components/room-avatar';
import { nameInitials } from '../../utils/common';
import * as css from './LobbyHeader.css';
import { openInviteUser, openSpaceSettings } from '../../../client/action/navigation';
import { IPowerLevels, usePowerLevelsAPI } from '../../hooks/usePowerLevels';
import { UseStateProvider } from '../../components/UseStateProvider';
import { LeaveSpacePrompt } from '../../components/leave-space-prompt';
import { getText } from '../../../lang';
import Icon from '@mdi/react';
import { mdiAccount, mdiAccountPlus, mdiArrowLeft, mdiCog, mdiDotsVertical } from '@mdi/js';
import { AppBar, Divider, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Toolbar, Tooltip } from '@mui/material';
import { ArrowBack, MoreVert, Person, PersonAdd, Settings } from '@mui/icons-material';

type LobbyMenuProps = {
    roomId: string;
    powerLevels: IPowerLevels;
    requestClose: () => void;
    anchorEl: HTMLElement | null;
};
const LobbyMenu = forwardRef<HTMLDivElement, LobbyMenuProps>(
    ({ roomId, powerLevels, requestClose, anchorEl }, ref) => {
        const mx = useMatrixClient();
        const { getPowerLevel, canDoAction } = usePowerLevelsAPI(powerLevels);
        const canInvite = canDoAction('invite', getPowerLevel(mx.getUserId() ?? ''));

        const handleInvite = () => {
            openInviteUser(roomId);
            requestClose();
        };

        const handleRoomSettings = () => {
            openSpaceSettings(roomId);
            requestClose();
        };

        return (
            <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={requestClose}>
                <MenuItem
                    onClick={handleInvite}
                    disabled={!!canInvite}
                >
                    <ListItemIcon>
                        <PersonAdd />
                    </ListItemIcon>
                    <ListItemText>
                        {getText('btn.space_lobby.invite')}
                    </ListItemText>
                </MenuItem>
                <MenuItem
                    onClick={handleRoomSettings}
                >
                    <ListItemIcon>
                        <Settings />
                    </ListItemIcon>
                    <ListItemText>
                        {getText('btn.space_lobby.settings')}
                    </ListItemText>
                </MenuItem>
                <Divider />
                <UseStateProvider initial={false}>
                    {(promptLeave, setPromptLeave) => (
                        <>
                            <MenuItem
                                onClick={() => setPromptLeave(true)}
                                aria-pressed={promptLeave}
                            >
                                <ListItemIcon>
                                    <ArrowBack />
                                </ListItemIcon>
                                <ListItemText>
                                    {getText('space.action.leave')}
                                </ListItemText>
                            </MenuItem>
                            {promptLeave && (
                                <LeaveSpacePrompt
                                    roomId={roomId}
                                    onDone={requestClose}
                                    onCancel={() => setPromptLeave(false)}
                                />
                            )}
                        </>
                    )}
                </UseStateProvider>
            </Menu>
        );
    }
);

type LobbyHeaderProps = {
    showProfile?: boolean;
    powerLevels: IPowerLevels;
};
export function LobbyHeader({ showProfile, powerLevels }: LobbyHeaderProps) {
    const mx = useMatrixClient();
    const space = useSpace();
    const setPeopleDrawer = useSetSetting(settingsAtom, 'isPeopleDrawer');
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

    const name = useRoomName(space);
    const avatarMxc = useRoomAvatar(space);
    const avatarUrl = avatarMxc ? mx.mxcUrlToHttp(avatarMxc, 96, 96, 'crop') ?? undefined : undefined;

    const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
        setMenuAnchor(evt.currentTarget);
    };

    return (
        <AppBar position='static'>
            <Toolbar>
                <IconButton
                    onClick={() => history.back()}
                >
                    <ArrowBack />
                </IconButton>
                <Box grow="Yes" basis="No" />
                <Box justifyContent="Center" alignItems="Center" gap="300">
                    {showProfile && (
                        <>
                            <Avatar size="300">
                                <RoomAvatar
                                    roomId={space.roomId}
                                    src={avatarUrl}
                                    alt={name}
                                />
                            </Avatar>
                            <Text size="H3" truncate>
                                {name}
                            </Text>
                        </>
                    )}
                </Box>
                <Box shrink="No" grow="Yes" basis="No" justifyContent="End">
                    <Tooltip title={getText('generic.members')}>
                        <IconButton onClick={() => setPeopleDrawer((drawer) => !drawer)}>
                            <Person />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={getText('generic.more_options')}>
                        <IconButton onClick={handleOpenMenu} aria-pressed={!!menuAnchor}>
                            <MoreVert />
                        </IconButton>
                    </Tooltip>
                    <LobbyMenu
                        roomId={space.roomId}
                        powerLevels={powerLevels}
                        anchorEl={menuAnchor}
                        requestClose={() => setMenuAnchor(null)}
                    />
                </Box>
            </Toolbar>
        </AppBar>
    );
}
