import React, { MouseEventHandler, forwardRef, useEffect, useState } from 'react';
import FocusTrap from 'focus-trap-react';
import {
    Box,
    Avatar,
    Text,
    Overlay,
    OverlayCenter,
    OverlayBackdrop,
    IconButton,
    Icon,
    Icons,
    Tooltip,
    TooltipProvider,
    Menu,
    MenuItem,
    toRem,
    config,
    Line,
    PopOut,
    RectCords,
} from 'folds';
import { useLocation, useNavigate } from 'react-router-dom';
import { JoinRule, Room } from 'matrix-js-sdk';
import { useAtomValue } from 'jotai';

import { useStateEvent } from '../../hooks/useStateEvent';
import { PageHeader } from '../../components/page';
import { RoomAvatar, RoomIcon } from '../../components/room-avatar';
import { UseStateProvider } from '../../components/UseStateProvider';
import { RoomTopicViewer } from '../../components/room-topic-viewer';
import { StateEvent } from '../../../types/matrix/room';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useRoom } from '../../hooks/useRoom';
import { useSetSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { useSpaceOptionally } from '../../hooks/useSpace';
import {
    getHomeSearchPath,
    getOriginBaseUrl,
    getSpaceSearchPath,
    joinPathComponent,
    withOriginBaseUrl,
    withSearchParam,
} from '../../pages/pathUtils';
import { getCanonicalAliasOrRoomId } from '../../utils/matrix';
import { _SearchPathSearchParams } from '../../pages/paths';
import * as css from './RoomViewHeader.css';
import { useRoomUnread } from '../../state/hooks/unread';
import { usePowerLevelsAPI, usePowerLevelsContext } from '../../hooks/usePowerLevels';
import { markAsRead } from '../../../client/action/notifications';
import { roomToUnreadAtom } from '../../state/room/roomToUnread';
import { openInviteUser, toggleRoomSettings } from '../../../client/action/navigation';
import { copyToClipboard } from '../../utils/dom';
import { LeaveRoomPrompt } from '../../components/leave-room-prompt';
import { useRoomAvatar, useRoomName, useRoomTopic } from '../../hooks/useRoomMeta';
import { mDirectAtom } from '../../state/mDirectList';
import { useClientConfig } from '../../hooks/useClientConfig';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { usePresences } from '../../hooks/usePresences';
import { getText } from '../../../lang';

type RoomMenuProps = {
    room: Room;
    linkPath: string;
    requestClose: () => void;
};
const RoomMenu = forwardRef<HTMLDivElement, RoomMenuProps>(
    ({ room, linkPath, requestClose }, ref) => {
        const mx = useMatrixClient();
        const { hashRouter } = useClientConfig();
        const unread = useRoomUnread(room.roomId, roomToUnreadAtom);
        const powerLevels = usePowerLevelsContext();
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
                        after={<Icon size="100" src={Icons.CheckTwice} />}
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
                        after={<Icon size="100" src={Icons.UserPlus} />}
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
                        after={<Icon size="100" src={Icons.Link} />}
                        radii="300"
                    >
                        <Text style={{ flexGrow: 1 }} as="span" size="T300">
                            {getText('room_header.copy_link')}
                        </Text>
                    </MenuItem>
                    <MenuItem
                        onClick={handleRoomSettings}
                        size="300"
                        after={<Icon size="100" src={Icons.Setting} />}
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
                                    after={<Icon size="100" src={Icons.ArrowGoLeft} />}
                                    radii="300"
                                    aria-pressed={promptLeave}
                                >
                                    <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
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

export function RoomViewHeader() {
    const navigate = useNavigate();
    const mx = useMatrixClient();
    const screenSize = useScreenSizeContext();
    const room = useRoom();
    const space = useSpaceOptionally();
    const [menuAnchor, setMenuAnchor] = useState<RectCords>();
    const mDirects = useAtomValue(mDirectAtom);

    const encryptionEvent = useStateEvent(room, StateEvent.RoomEncryption);
    const encryptedRoom = !!encryptionEvent;
    const avatarMxc = useRoomAvatar(room, mDirects.has(room.roomId));
    const name = useRoomName(room);
    const topic = useRoomTopic(room);
    const [statusMessage, setStatusMessage] = useState('');
    const avatarUrl = avatarMxc ? mx.mxcUrlToHttp(avatarMxc, 96, 96, 'crop') ?? undefined : undefined;

    const setPeopleDrawer = useSetSetting(settingsAtom, 'isPeopleDrawer');
    const location = useLocation();
    const currentPath = joinPathComponent(location);

    const handleSearchClick = () => {
        const searchParams: _SearchPathSearchParams = {
            rooms: room.roomId,
        };
        const path = space
            ? getSpaceSearchPath(getCanonicalAliasOrRoomId(mx, space.roomId))
            : getHomeSearchPath();
        navigate(withSearchParam(path, searchParams));
    };

    const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
        if (!menuAnchor)
            setMenuAnchor(evt.currentTarget.getBoundingClientRect());
        else
            setMenuAnchor(undefined);
    };

    const handleAvClick = () => {
        toggleRoomSettings(room.roomId);
    };

    const getPresenceFn = usePresences();

    useEffect(() => {
        const isDm = room.getDMInviter() || room.getJoinedMemberCount() == 2;
        if (isDm) {
            const userId = room.guessDMUserId();
            getPresenceFn(userId).then((presence) => {
                setStatusMessage(presence.presenceStatusMsg ?? presence.presence);
            });
        }
    }, [mx]);

    return (
        <PageHeader>
            <Box grow="Yes" gap="300">
                <Box grow="Yes" alignItems="Center" gap="300">
                    <Avatar onClick={handleAvClick} size="300">
                        <RoomAvatar
                            roomId={room.roomId}
                            src={avatarUrl}
                            alt={name}
                            renderFallback={() => (
                                <RoomIcon size="200" joinRule={room.getJoinRule() ?? JoinRule.Restricted} filled />
                            )}
                        />
                    </Avatar>
                    <Box direction="Column">
                        <Text size={(topic ?? statusMessage) ? 'H5' : 'H3'} truncate>
                            {name}
                        </Text>
                        {(topic ?? statusMessage) && (
                            <UseStateProvider initial={false}>
                                {(viewTopic, setViewTopic) => (
                                    <>
                                        <Overlay open={viewTopic} backdrop={<OverlayBackdrop />}>
                                            <OverlayCenter>
                                                <FocusTrap
                                                    focusTrapOptions={{
                                                        initialFocus: false,
                                                        clickOutsideDeactivates: true,
                                                        onDeactivate: () => setViewTopic(false),
                                                    }}
                                                >
                                                    <RoomTopicViewer
                                                        name={name}
                                                        topic={topic ?? statusMessage}
                                                        requestClose={() => setViewTopic(false)}
                                                    />
                                                </FocusTrap>
                                            </OverlayCenter>
                                        </Overlay>
                                        <Text
                                            as="button"
                                            type="button"
                                            onClick={() => setViewTopic(true)}
                                            className={css.HeaderTopic}
                                            size="T200"
                                            priority="300"
                                            truncate
                                        >
                                            {topic ?? statusMessage}
                                        </Text>
                                    </>
                                )}
                            </UseStateProvider>
                        )}
                    </Box>
                </Box>
                <Box shrink="No">
                    {!encryptedRoom && (
                        <TooltipProvider
                            position="Bottom"
                            offset={4}
                            tooltip={
                                <Tooltip>
                                    <Text>{getText('tooltip.search')}</Text>
                                </Tooltip>
                            }
                        >
                            {(triggerRef) => (
                                <IconButton ref={triggerRef} onClick={handleSearchClick}>
                                    <Icon size="400" src={Icons.Search} />
                                </IconButton>
                            )}
                        </TooltipProvider>
                    )}
                    {screenSize === ScreenSize.Desktop && (
                        <TooltipProvider
                            position="Bottom"
                            offset={4}
                            tooltip={
                                <Tooltip>
                                    <Text>{getText('tooltip.members')}</Text>
                                </Tooltip>
                            }
                        >
                            {(triggerRef) => (
                                <IconButton ref={triggerRef} onClick={() => setPeopleDrawer((drawer) => !drawer)}>
                                    <Icon size="400" src={Icons.User} />
                                </IconButton>
                            )}
                        </TooltipProvider>
                    )}
                    <TooltipProvider
                        position="Bottom"
                        align="End"
                        offset={4}
                        tooltip={
                            <Tooltip>
                                <Text>{getText('tooltip.more_options')}</Text>
                            </Tooltip>
                        }
                    >
                        {(triggerRef) => (
                            <IconButton onClick={handleOpenMenu} ref={triggerRef} aria-pressed={!!menuAnchor}>
                                <Icon size="400" src={Icons.VerticalDots} filled={!!menuAnchor} />
                            </IconButton>
                        )}
                    </TooltipProvider>
                    <PopOut
                        anchor={menuAnchor}
                        position="Bottom"
                        align="End"
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
                                <RoomMenu
                                    room={room}
                                    linkPath={currentPath}
                                    requestClose={() => setMenuAnchor(undefined)}
                                />
                            </FocusTrap>
                        }
                    />
                </Box>
            </Box>
        </PageHeader>
    );
}
