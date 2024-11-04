import React, { MouseEventHandler, useCallback, useEffect, useState } from 'react';
import FocusTrap from 'focus-trap-react';
import {
    Box,
    Text,
    config,
    toRem,
} from 'folds';
import { HierarchyItem } from '../../hooks/useSpaceHierarchy';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { MSpaceChildContent, StateEvent } from '../../../types/matrix/room';
import {
    openInviteUser,
    openSpaceSettings,
    toggleRoomSettings,
} from '../../../client/action/navigation';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { UseStateProvider } from '../../components/UseStateProvider';
import { LeaveSpacePrompt } from '../../components/leave-space-prompt';
import { LeaveRoomPrompt } from '../../components/leave-room-prompt';
import { getText } from '../../../lang';
import Icon from '@mdi/react';
import { mdiArrowLeft, mdiDotsVertical, mdiLightbulb, mdiLightbulbOff, mdiPin, mdiPinOff } from '@mdi/js';
import { Divider, IconButton, ListItem, ListItemIcon, ListItemText, Menu, MenuItem, useTheme } from '@mui/material';
import { ArrowBack, Close, MoreVert, PersonAdd, Settings } from '@mui/icons-material';

type HierarchyItemWithParent = HierarchyItem & {
    parentId: string;
};

function SuggestMenuItem({
    item,
    requestClose,
}: {
    item: HierarchyItemWithParent;
    requestClose: () => void;
}) {
    const mx = useMatrixClient();
    const { roomId, parentId, content } = item;

    const [toggleState, handleToggleSuggested] = useAsyncCallback(
        useCallback(() => {
            const newContent: MSpaceChildContent = { ...content, suggested: !content.suggested };
            //@ts-ignore
            return mx.sendStateEvent(parentId, StateEvent.SpaceChild, newContent, roomId);
        }, [mx, parentId, roomId, content])
    );

    useEffect(() => {
        if (toggleState.status === AsyncStatus.Success) {
            requestClose();
        }
    }, [requestClose, toggleState]);

    return (
        <MenuItem
            onClick={handleToggleSuggested}
            disabled={toggleState.status === AsyncStatus.Loading}
        >
            <ListItemIcon>
                <Icon size={1} path={content.suggested ? mdiLightbulbOff : mdiLightbulb} />
            </ListItemIcon>
            <ListItemText>
                {getText(content.suggested ? 'btn.space_lobby.unsuggest' : 'btn.space_lobby.suggest')}
            </ListItemText>
        </MenuItem>
    );
}

function RemoveMenuItem({
    item,
    requestClose,
}: {
    item: HierarchyItemWithParent;
    requestClose: () => void;
}) {
    const mx = useMatrixClient();
    const { roomId, parentId } = item;

    const [removeState, handleRemove] = useAsyncCallback(
        useCallback(
            //@ts-ignore
            () => mx.sendStateEvent(parentId, StateEvent.SpaceChild, {}, roomId),
            [mx, parentId, roomId]
        )
    );

    useEffect(() => {
        if (removeState.status === AsyncStatus.Success) {
            requestClose();
        }
    }, [requestClose, removeState]);

    return (
        <MenuItem
            onClick={handleRemove}
            disabled={removeState.status === AsyncStatus.Loading}
        >
            <ListItemIcon>
                <Close color='error' />
            </ListItemIcon>
            <ListItemText sx={{ color: 'error.main' }}>
                {getText('btn.space_lobby.remove_room')}
            </ListItemText>
        </MenuItem>
    );
}

function InviteMenuItem({
    item,
    requestClose,
    disabled,
}: {
    item: HierarchyItemWithParent;
    requestClose: () => void;
    disabled?: boolean;
}) {
    const handleInvite = () => {
        openInviteUser(item.roomId);
        requestClose();
    };

    return (
        <MenuItem
            onClick={handleInvite}
            disabled={disabled}
        >
            <ListItemIcon>
                <PersonAdd />
            </ListItemIcon>
            <ListItemText>
                {getText('btn.space_lobby.invite')}
            </ListItemText>
        </MenuItem>
    );
}

function SettingsMenuItem({
    item,
    requestClose,
    disabled,
}: {
    item: HierarchyItemWithParent;
    requestClose: () => void;
    disabled?: boolean;
}) {
    const handleSettings = () => {
        if (item.space) {
            openSpaceSettings(item.roomId);
        } else {
            toggleRoomSettings(item.roomId);
        }
        requestClose();
    };

    return (
        <MenuItem onClick={handleSettings} disabled={disabled}>
            <ListItemIcon>
                <Settings />
            </ListItemIcon>
            <ListItemText>
                {getText('btn.space_lobby.settings')}
            </ListItemText>
        </MenuItem>
    );
}

type HierarchyItemMenuProps = {
    item: HierarchyItem & {
        parentId: string;
    };
    joined: boolean;
    canInvite: boolean;
    canEditChild: boolean;
    pinned?: boolean;
    onTogglePin?: (roomId: string) => void;
};
export function HierarchyItemMenu({
    item,
    joined,
    canInvite,
    canEditChild,
    pinned,
    onTogglePin,
}: HierarchyItemMenuProps) {
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement>();

    const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
        setMenuAnchor(evt.currentTarget);
    };

    const handleRequestClose = useCallback(() => setMenuAnchor(undefined), []);

    if (!joined && !canEditChild) {
        return null;
    }

    return (
        <Box gap="200" alignItems="Center" shrink="No">
            <IconButton
                onClick={handleOpenMenu}
                aria-pressed={!!menuAnchor}
            >
                <MoreVert />
            </IconButton>
            <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={handleRequestClose}>
                {joined && (
                    <>
                        {onTogglePin && (
                            <MenuItem
                                onClick={() => {
                                    onTogglePin(item.roomId);
                                    handleRequestClose();
                                }}
                            >
                                <ListItemIcon>
                                    <Icon size={1} path={pinned ? mdiPinOff : mdiPin} />
                                </ListItemIcon>
                                <ListItemText>
                                    {getText(pinned ? 'btn.space.unpin' : 'btn.space.pin')}
                                </ListItemText>
                            </MenuItem>
                        )}
                        <InviteMenuItem
                            item={item}
                            requestClose={handleRequestClose}
                            disabled={!canInvite}
                        />
                        <SettingsMenuItem item={item} requestClose={handleRequestClose} />
                        <UseStateProvider initial={false}>
                            {(promptLeave, setPromptLeave) => (
                                <>
                                    <MenuItem
                                        onClick={() => setPromptLeave(true)}
                                        aria-pressed={promptLeave}
                                    >
                                        <ListItemIcon>
                                            <ArrowBack color='error' />
                                        </ListItemIcon>
                                        <ListItemText sx={{ color: 'error.main' }}>
                                            {getText('btn.leave')}
                                        </ListItemText>
                                    </MenuItem>
                                    {promptLeave &&
                                        (item.space ? (
                                            <LeaveSpacePrompt
                                                roomId={item.roomId}
                                                onDone={handleRequestClose}
                                                onCancel={() => setPromptLeave(false)}
                                            />
                                        ) : (
                                            <LeaveRoomPrompt
                                                roomId={item.roomId}
                                                onDone={handleRequestClose}
                                                onCancel={() => setPromptLeave(false)}
                                            />
                                        ))}
                                </>
                            )}
                        </UseStateProvider>
                    </>
                )}
                {(joined && canEditChild) && (
                    <Divider />
                )}
                {canEditChild && (
                    <>
                        <SuggestMenuItem item={item} requestClose={handleRequestClose} />
                        <RemoveMenuItem item={item} requestClose={handleRequestClose} />
                    </>
                )}
            </Menu>
        </Box>
    );
}
