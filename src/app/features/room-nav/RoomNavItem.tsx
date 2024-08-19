import React, { MouseEventHandler, forwardRef, useCallback, useEffect, useState } from 'react';
import { Room } from 'matrix-js-sdk';
import {
    Avatar,
    Box,
    IconButton,
    Text,
    Menu,
    MenuItem,
    config,
    PopOut,
    toRem,
    Line,
    RectCords,
    Badge,
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
import Icon from '@mdi/react';
import { mdiAccountPlus, mdiArrowLeft, mdiBellCancel, mdiCheckAll, mdiCog, mdiDotsVertical, mdiLinkVariant } from '@mdi/js';

type RoomNavItemMenuProps = {
    room: Room;
    linkPath: string;
    requestClose: () => void;
};
const RoomNavItemMenu = forwardRef<HTMLDivElement, RoomNavItemMenuProps>(
    ({ room, linkPath, requestClose }, ref) => {
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
            <Menu ref={ref} style={{ maxWidth: toRem(160), width: '100vw' }}>
                <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
                    <MenuItem
                        onClick={handleMarkAsRead}
                        size="300"
                        after={<Icon size={1} path={mdiCheckAll} />}
                        radii="300"
                        disabled={!unread}
                    >
                        <Text style={{ flexGrow: 1 }} as="span" size="T300">
                            {getText('room_header.mark_as_read')}
                        </Text>
                    </MenuItem>
                </Box>
                <Line variant="Surface" size="300" />
                <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
                    <MenuItem
                        onClick={handleInvite}
                        variant="Primary"
                        fill="None"
                        size="300"
                        after={<Icon size={1} path={mdiAccountPlus} />}
                        radii="300"
                        disabled={!canInvite}
                    >
                        <Text style={{ flexGrow: 1 }} as="span" size="T300">
                            {getText('room_header.invite')}
                        </Text>
                    </MenuItem>
                    <MenuItem
                        onClick={handleCopyLink}
                        size="300"
                        after={<Icon size={1} path={mdiLinkVariant} />}
                        radii="300"
                    >
                        <Text style={{ flexGrow: 1 }} as="span" size="T300">
                            {getText('room_header.copy_link')}
                        </Text>
                    </MenuItem>
                    <MenuItem
                        onClick={handleRoomSettings}
                        size="300"
                        after={<Icon size={1} path={mdiCog} />}
                        radii="300"
                    >
                        <Text style={{ flexGrow: 1 }} as="span" size="T300">
                            {getText('room_header.settings')}
                        </Text>
                    </MenuItem>
                </Box>
                <Line variant="Surface" size="300" />
                <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
                    <UseStateProvider initial={false}>
                        {(promptLeave, setPromptLeave) => (
                            <>
                                <MenuItem
                                    onClick={() => setPromptLeave(true)}
                                    variant="Critical"
                                    fill="None"
                                    size="300"
                                    after={<Icon size={1} path={mdiArrowLeft} />}
                                    radii="300"
                                    aria-pressed={promptLeave}
                                >
                                    <Text style={{ flexGrow: 1 }} as="span" size="T300">
                                        {getText('room_header.leave')}
                                    </Text>
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
                </Box>
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
};
export function RoomNavItem({
    room,
    selected,
    showAvatar,
    direct,
    muted,
    linkPath,
}: RoomNavItemProps) {
    const mx = useMatrixClient();
    const [hover, setHover] = useState(false);
    const { hoverProps } = useHover({ onHoverChange: setHover });
    const { focusWithinProps } = useFocusWithin({ onFocusWithinChange: setHover });
    const [menuAnchor, setMenuAnchor] = useState<RectCords>();
    const unread = useRoomUnread(room.roomId, roomToUnreadAtom);
    const typingMember = useRoomTypingMember(room.roomId);

    const handleContextMenu: MouseEventHandler<HTMLElement> = (evt) => {
        evt.preventDefault();
        setMenuAnchor({
            x: evt.clientX,
            y: evt.clientY,
            width: 0,
            height: 0,
        });
    };

    const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
        setMenuAnchor(evt.currentTarget.getBoundingClientRect());
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

    // TODO: Color customization
    const styles = {
        'online': { borderStyle: 'solid', borderWidth: '3px', borderColor: '#079d16', borderRadius: '50%' },
        'offline': { borderStyle: 'solid', borderWidth: '3px', borderColor: '#737373', borderRadius: '50%' },
        'unavailable': { borderStyle: 'solid', borderWidth: '3px', borderColor: '#b9a12d', borderRadius: '50%' }
    };

    const [avStyle, setAvStyle] = useState({});

    const mDirects = useAtomValue(mDirectAtom);
    const directs = useDirects(mx, allRoomsAtom, mDirects);

    const getPresenceFn = usePresences();

    const updateAvStyle = useCallback(async () => {
        if (directs.includes(room.roomId)) {
            const user = room.getDMInviter() ?? room.guessDMUserId();
            const presence = getPresenceFn(user);
            if (presence)
                setAvStyle(styles[presence.presence]);
        }
    }, [mx, directs, room]);

    useEffect(() => {
        updateAvStyle();
    }, [updateAvStyle]);

    return (
        <NavItem
            variant="Background"
            radii="400"
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
                        <Avatar style={avStyle} size="300" radii="400">
                            {showAvatar ? (
                                <RoomAvatar
                                    roomId={room.roomId}
                                    src={
                                        direct ? getDirectRoomAvatarUrl(mx, room, 96) : getRoomAvatarUrl(mx, room, 96)
                                    }
                                    alt={room.name}
                                    renderFallback={() => (
                                        <Text as="span" size="H6">
                                            {nameInitials(room.name)}
                                        </Text>
                                    )}
                                />
                            ) : (
                                <RoomIcon
                                    style={{ opacity: unread ? config.opacity.P500 : config.opacity.P300 }}
                                    filled={selected}
                                    size="100"
                                    joinRule={room.getJoinRule()}
                                />
                            )}
                        </Avatar>
                        <Box as="span" grow="Yes" direction='Column'>
                            <Text priority={unread ? '500' : '300'} as="span" size="Inherit" truncate>
                                {room.name}
                            </Text>
                            <Text priority={unread ? '500' : '300'} as="span" size="C400" truncate>
                                {lastMessage}
                            </Text>
                        </Box>
                        {!optionsVisible && !unread && !selected && typingMember.length > 0 && (
                            <Badge size="300" variant="Secondary" fill="Soft" radii="Pill" outlined>
                                <TypingIndicator size="300" disableAnimation />
                            </Badge>
                        )}
                        {!optionsVisible && unread && (
                            <UnreadBadgeCenter>
                                <UnreadBadge highlight={unread.highlight > 0} count={unread.total} />
                            </UnreadBadgeCenter>
                        )}
                        {muted && !optionsVisible && (
                            <IconButton
                                variant="Background"
                                fill="None"
                                size="300"
                                radii="300"
                            >
                                <Icon size={0.8} path={mdiBellCancel} />
                            </IconButton>
                        )}
                    </Box>
                </NavItemContent>
            </NavLink>
            {optionsVisible && (
                <NavItemOptions>
                    <PopOut
                        anchor={menuAnchor}
                        offset={menuAnchor?.width === 0 ? 0 : undefined}
                        alignOffset={menuAnchor?.width === 0 ? 0 : -5}
                        position="Bottom"
                        align={menuAnchor?.width === 0 ? 'Start' : 'End'}
                        content={
                            <FocusTrap
                                focusTrapOptions={{
                                    initialFocus: false,
                                    returnFocusOnDeactivate: false,
                                    onDeactivate: () => setMenuAnchor(undefined),
                                    clickOutsideDeactivates: true,
                                    isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
                                    isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
                                }}
                            >
                                <RoomNavItemMenu
                                    room={room}
                                    linkPath={linkPath}
                                    requestClose={() => setMenuAnchor(undefined)}
                                />
                            </FocusTrap>
                        }
                    >
                        <IconButton
                            onClick={handleOpenMenu}
                            aria-pressed={!!menuAnchor}
                            variant="Background"
                            fill="None"
                            size="300"
                            radii="300"
                        >
                            <Icon size={1} path={mdiDotsVertical} />
                        </IconButton>
                    </PopOut>
                </NavItemOptions>
            )}
        </NavItem>
    );
}
