import React, { MouseEventHandler, forwardRef, useCallback, useEffect, useState } from 'react';
import { Room } from 'matrix-js-sdk';
import {
    Avatar,
    Box,
    config,
    PopOut,
    toRem,
    RectCords,
    Text,
} from 'folds';
import { useFocusWithin, useHover } from 'react-aria';
import FocusTrap from 'focus-trap-react';
import { NavItem, NavItemContent, NavItemOptions, NavLink } from '../../components/nav';
import { UnreadBadge, UnreadBadgeCenter } from '../../components/unread-badge';
import { RoomAvatar, RoomIcon } from '../../components/room-avatar';
import { getDirectRoomAvatarUrl, getRoomAvatarUrl } from '../../utils/room';
import { nameInitials } from '../../utils/common';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useRoomUnread } from '../../state/hooks/unread';
import { roomToUnreadAtom } from '../../state/room/roomToUnread';
import { usePowerLevels, usePowerLevelsAPI } from '../../hooks/usePowerLevels';
import { copyToClipboard } from '../../utils/dom';
import { getOriginBaseUrl, withOriginBaseUrl } from '../../pages/pathUtils';
import { markAsRead } from '../../../client/action/notifications';
import { openInviteUser, toggleRoomSettings } from '../../../client/action/navigation';
import { UseStateProvider } from '../../components/UseStateProvider';
import { LeaveRoomPrompt } from '../../components/leave-room-prompt';
import { useClientConfig } from '../../hooks/useClientConfig';
import { useRoomTypingMember } from '../../hooks/useRoomTypingMembers';
import { TypingIndicator } from '../../components/typing-indicator';
import { useAtomValue } from 'jotai';
import { mDirectAtom } from '../../state/mDirectList';
import { allRoomsAtom } from '../../state/room-list/roomList';
import { useDirects } from '../../state/hooks/roomList';
import { usePresences } from '../../hooks/usePresences';
import { getText } from '../../../lang';
import cons from '../../../client/state/cons';
import { Time } from '../../components/message';
import { Badge, Divider, IconButton, Link, ListItemIcon, ListItemText, Menu, MenuItem, Typography } from '@mui/material';
import { ArrowBack, DoneAll, MoreVert, NotificationsOff, PersonAdd, Settings, Link as LinkIcon, PushPin, PushPinOutlined } from '@mui/icons-material';
import Icon from '@mdi/react';
import { mdiPin, mdiPinOffOutline, mdiPinOutline } from '@mdi/js';

type RoomNavItemMenuProps = {
    room: Room;
    linkPath: string;
    requestClose: () => void;
    anchorEl: HTMLElement | null;
};
const RoomNavItemMenu = forwardRef<HTMLDivElement, RoomNavItemMenuProps>(
    ({ room, linkPath, anchorEl, requestClose }, ref) => {
        const mx = useMatrixClient();
        const { hashRouter } = useClientConfig();
        const unread = useRoomUnread(room.roomId, roomToUnreadAtom);
        const powerLevels = usePowerLevels(room);
        const { getPowerLevel, canDoAction } = usePowerLevelsAPI(powerLevels);
        const canInvite = canDoAction('invite', getPowerLevel(mx.getUserId() ?? ''));

        const handleMarkAsRead = () => {
            markAsRead(room.roomId);
            requestClose();
        };

        const handleInvite = () => {
            openInviteUser(room.roomId);
            requestClose();
        };

        const handleCopyLink = () => {
            copyToClipboard(withOriginBaseUrl(getOriginBaseUrl(hashRouter), linkPath));
            requestClose();
        };

        const handleRoomSettings = () => {
            toggleRoomSettings(room.roomId);
            requestClose();
        };

        return (
            <Menu open={!!anchorEl} anchorEl={anchorEl} onClose={requestClose} ref={ref}>
                <MenuItem
                    onClick={handleMarkAsRead}
                    disabled={!unread}
                >
                    <ListItemIcon>
                        <DoneAll />
                    </ListItemIcon>
                    <ListItemText>
                        {getText('room_header.mark_as_read')}
                    </ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem
                    disabled={!canInvite}
                    onClick={handleInvite}
                >
                    <ListItemIcon>
                        <PersonAdd />
                    </ListItemIcon>
                    <ListItemText>
                        {getText('room_header.invite')}
                    </ListItemText>
                </MenuItem>
                <MenuItem
                    onClick={handleCopyLink}
                >
                    <ListItemIcon>
                        <LinkIcon />
                    </ListItemIcon>
                    <ListItemText>
                        {getText('room_header.copy_link')}
                    </ListItemText>
                </MenuItem>
                <MenuItem
                    onClick={handleRoomSettings}
                >
                    <ListItemIcon>
                        <Settings />
                    </ListItemIcon>
                    <ListItemText>
                        {getText('room_header.settings')}
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
                                    <ArrowBack sx={{ color: 'error.main' }} />
                                </ListItemIcon>
                                <ListItemText sx={{ color: 'error.main' }}>
                                    {getText('room_header.leave')}
                                </ListItemText>
                            </MenuItem>
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
            </Menu>
        );
    }
);

type RoomNavItemProps = {
    room: Room;
    selected: boolean;
    linkPath: string;
    muted?: boolean;
    showAvatar?: boolean;
    direct?: boolean;
    pinned?: boolean;
    lowPriority?: boolean;
};
export function RoomNavItem({
    room,
    selected,
    showAvatar,
    direct,
    muted,
    linkPath,
    pinned
}: RoomNavItemProps) {
    const mx = useMatrixClient();
    const [hover, setHover] = useState(false);
    const { hoverProps } = useHover({ onHoverChange: setHover });
    const { focusWithinProps } = useFocusWithin({ onFocusWithinChange: setHover });
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const unread = useRoomUnread(room.roomId, roomToUnreadAtom);
    const typingMember = useRoomTypingMember(room.roomId);

    const handleContextMenu: MouseEventHandler<HTMLElement> = (evt) => {
        evt.preventDefault();
        setMenuAnchor(evt.currentTarget);
    };

    const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
        setMenuAnchor(evt.currentTarget);
    };

    const optionsVisible = hover || !!menuAnchor;

    var lastMessage = '';
    const events = room.getLiveTimeline().getEvents().filter(x => x.getType() == 'm.room.message');
    const lastEvent = events[events.length - 1];

    if (lastEvent) {
        const content = lastEvent.getContent();
        lastMessage += lastEvent.sender?.rawDisplayName;
        lastMessage += `: `;
        if (typeof content.body === 'string') {
            lastMessage += content.body;
        } else if (typeof content.msgtype === 'string') {
            lastMessage += content.msgtype;
        } else if (lastEvent.isRedacted()) {
            lastMessage += getText('msg_preview.redacted');
        } else {
            lastMessage += getText('msg_preview.failed');
        }
    }

    const [avStyle, setAvStyle] = useState({});

    const mDirects = useAtomValue(mDirectAtom);
    const directs = useDirects(mx, allRoomsAtom, mDirects);

    const getPresenceFn = usePresences();

    const updateAvStyle = useCallback(async () => {
        if (directs.includes(room.roomId)) {
            const user = room.getDMInviter() ?? room.guessDMUserId();
            const presence = getPresenceFn(user);
            if (presence)
                setAvStyle(presence.presence);
        }
    }, [mx, directs, room]);

    useEffect(() => {
        updateAvStyle();
    }, [updateAvStyle]);

    return (
        <NavItem
            highlight={unread !== undefined}
            aria-selected={selected}
            data-hover={!!menuAnchor}
            onContextMenu={handleContextMenu}
            {...hoverProps}
            {...focusWithinProps}
        >
            <NavLink to={linkPath}>
                <NavItemContent>
                    <Box as="span" style={{ marginTop: '5px', marginBottom: '5px' }} grow="Yes" alignItems="Center" gap="200">
                        <Badge max={99} color={unread?.highlight ? 'error' : 'primary'} badgeContent={unread && unread.total}>
                            <Avatar className={`presence-${avStyle}`} size="400" radii="400">
                                {showAvatar ? (
                                    <RoomAvatar
                                        roomId={room.roomId}
                                        src={
                                            direct ? getDirectRoomAvatarUrl(mx, room, 96) : getRoomAvatarUrl(mx, room, 96)
                                        }
                                        alt={room.name}
                                        renderFallback={() => (
                                            <Typography variant='button' component='span'>
                                                {nameInitials(room.name)}
                                            </Typography>
                                        )}
                                    />
                                ) : (
                                    <RoomIcon
                                        style={{ opacity: unread ? config.opacity.P500 : config.opacity.P300 }}
                                        size="100"
                                        joinRule={room.getJoinRule()}
                                    />
                                )}
                            </Avatar>
                        </Badge>
                        <Box as="span" grow="Yes" direction='Column'>
                            <Box as="span" grow="Yes" direction='Row' justifyContent='SpaceBetween'>
                                <Text priority={unread ? '500' : '300'} as="span" size="Inherit" style={{ display: 'flex', alignItems: 'end' }} truncate>
                                    {pinned && <Icon path={mdiPin} size={0.8} />}
                                    {room.name}
                                </Text>
                                {lastEvent && (
                                    <Text priority={unread ? '500' : '300'} as="span" size="Inherit">
                                        <Time ts={lastEvent.localTimestamp} compact />
                                    </Text>
                                )}
                            </Box>
                            <Box as="span" grow="Yes" direction='Row' justifyContent='SpaceBetween'>
                                <Text priority={unread ? '500' : '300'} as="span" size="B300" truncate>
                                    {lastMessage}
                                </Text>
                                {/* {!optionsVisible && !unread && !selected && typingMember.length > 0 && (
                                    <Badge size="300" variant="Secondary" fill="Soft" radii="Pill" outlined>
                                        <TypingIndicator size="300" disableAnimation />
                                    </Badge>
                                )} */}
                            </Box>

                        </Box>
                    </Box>
                </NavItemContent>
            </NavLink>
            <RoomNavItemMenu
                room={room}
                linkPath={linkPath}
                requestClose={() => setMenuAnchor(null)}
                anchorEl={menuAnchor}
            />
        </NavItem>
    );
}
