import React, {
    MouseEventHandler,
    forwardRef,
    useCallback,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useAtom, useAtomValue } from 'jotai';
import {
    Avatar,
    Box,
    Line,
    Menu,
    MenuItem,
    PopOut,
    RectCords,
    Text,
    config,
    toRem,
} from 'folds';
import { Icon as MDIcon } from '@mdi/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { JoinRule, Room } from 'matrix-js-sdk';
import FocusTrap from 'focus-trap-react';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { mDirectAtom } from '../../../state/mDirectList';
import {
    NavCategory,
    NavCategoryHeader,
    NavItem,
    NavItemContent,
    NavLink,
} from '../../../components/nav';
import {
    getOriginBaseUrl,
    getSpaceLobbyPath,
    getSpacePath,
    getSpaceRoomPath,
    getSpaceSearchPath,
    withOriginBaseUrl,
} from '../../pathUtils';
import { getCanonicalAliasOrRoomId } from '../../../utils/matrix';
import { useSelectedRoom } from '../../../hooks/router/useSelectedRoom';
import {
    useSpaceLobbySelected,
    useSpaceSearchSelected,
} from '../../../hooks/router/useSelectedSpace';
import { useSpace } from '../../../hooks/useSpace';
import { VirtualTile } from '../../../components/virtualizer';
import { RoomNavCategoryButton, RoomNavItem } from '../../../features/room-nav';
import { muteChangesAtom } from '../../../state/room-list/mutedRoomList';
import { makeNavCategoryId } from '../../../state/closedNavCategories';
import { roomToUnreadAtom } from '../../../state/room/roomToUnread';
import { useCategoryHandler } from '../../../hooks/useCategoryHandler';
import { useNavToActivePathMapper } from '../../../hooks/useNavToActivePathMapper';
import { useRoomName } from '../../../hooks/useRoomMeta';
import { useSpaceJoinedHierarchy } from '../../../hooks/useSpaceHierarchy';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { PageNav, PageNavContent, PageNavHeader } from '../../../components/page';
import { usePowerLevels, usePowerLevelsAPI } from '../../../hooks/usePowerLevels';
import { openInviteUser, openSpaceSettings } from '../../../../client/action/navigation';
import { useRecursiveChildScopeFactory, useSpaceChildren } from '../../../state/hooks/roomList';
import { roomToParentsAtom } from '../../../state/room/roomToParents';
import { markAsRead } from '../../../../client/action/notifications';
import { useRoomsUnread } from '../../../state/hooks/unread';
import { UseStateProvider } from '../../../components/UseStateProvider';
import { LeaveSpacePrompt } from '../../../components/leave-space-prompt';
import { copyToClipboard } from '../../../utils/dom';
import { useClientConfig } from '../../../hooks/useClientConfig';
import { useClosedNavCategoriesAtom } from '../../../state/hooks/closedNavCategories';
import { useStateEvent } from '../../../hooks/useStateEvent';
import { StateEvent } from '../../../../types/matrix/room';
import { getText } from '../../../../lang';
import { mdiAccountPlus, mdiArrowLeft, mdiCheckAll, mdiCog, mdiDotsVertical, mdiFlag, mdiFlagOutline, mdiLink, mdiLock, mdiMagnify } from '@mdi/js';
import { ScreenSize, useScreenSize } from '../../../hooks/useScreenSize';
import FAB from '../../../components/fab/FAB';
import { RoomJoinRulesEventContent } from 'matrix-js-sdk/lib/types';
import { IconButton } from '@mui/material';
import { MoreVert } from '@mui/icons-material';

type SpaceMenuProps = {
    room: Room;
    requestClose: () => void;
};
const SpaceMenu = forwardRef<HTMLDivElement, SpaceMenuProps>(({ room, requestClose }, ref) => {
    const mx = useMatrixClient();
    const { hashRouter } = useClientConfig();
    const roomToParents = useAtomValue(roomToParentsAtom);
    const powerLevels = usePowerLevels(room);
    const { getPowerLevel, canDoAction } = usePowerLevelsAPI(powerLevels);
    const canInvite = canDoAction('invite', getPowerLevel(mx.getUserId() ?? ''));

    const allChild = useSpaceChildren(
        allRoomsAtom,
        room.roomId,
        useRecursiveChildScopeFactory(mx, roomToParents)
    );
    const unread = useRoomsUnread(allChild, roomToUnreadAtom);

    const handleMarkAsRead = () => {
        allChild.forEach((childRoomId) => markAsRead(childRoomId));
        requestClose();
    };

    const handleCopyLink = () => {
        const spacePath = getSpacePath(getCanonicalAliasOrRoomId(mx, room.roomId));
        copyToClipboard(withOriginBaseUrl(getOriginBaseUrl(hashRouter), spacePath));
        requestClose();
    };

    const handleInvite = () => {
        openInviteUser(room.roomId);
        requestClose();
    };

    const handleRoomSettings = () => {
        openSpaceSettings(room.roomId);
        requestClose();
    };

    return (
        <Menu ref={ref} style={{ maxWidth: toRem(160), width: '100vw' }}>
            <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
                <MenuItem
                    onClick={handleMarkAsRead}
                    size="300"
                    after={<MDIcon size={1} path={mdiCheckAll} />}
                    radii="300"
                    disabled={!unread}
                >
                    <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
                        {getText('chats.mark_as_read')}
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
                    after={<MDIcon size={1} path={mdiAccountPlus} />}
                    radii="300"
                    disabled={!canInvite}
                >
                    <Text style={{ flexGrow: 1 }} as="span" size="T300">
                        {getText('space.action.invite')}
                    </Text>
                </MenuItem>
                <MenuItem
                    onClick={handleCopyLink}
                    size="300"
                    after={<MDIcon size={1} path={mdiLink} />}
                    radii="300"
                >
                    <Text style={{ flexGrow: 1 }} as="span" size="T300">
                        {getText('space.action.copy_link')}
                    </Text>
                </MenuItem>
                <MenuItem
                    onClick={handleRoomSettings}
                    size="300"
                    after={<MDIcon size={1} path={mdiCog} />}
                    radii="300"
                >
                    <Text style={{ flexGrow: 1 }} as="span" size="T300">
                        {getText('space.action.settings')}
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
                                after={<MDIcon size={1} path={mdiArrowLeft} />}
                                radii="300"
                                aria-pressed={promptLeave}
                            >
                                <Text style={{ flexGrow: 1 }} as="span" size="T300">
                                    {getText('space.action.leave')}
                                </Text>
                            </MenuItem>
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
            </Box>
        </Menu>
    );
});

function SpaceHeader() {
    const space = useSpace();
    const spaceName = useRoomName(space);
    const [menuAnchor, setMenuAnchor] = useState<RectCords>();

    const joinRules = useStateEvent(
        space,
        StateEvent.RoomJoinRules
    )?.getContent<RoomJoinRulesEventContent>();

    const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
        const cords = evt.currentTarget.getBoundingClientRect();
        setMenuAnchor((currentState) => {
            if (currentState) return undefined;
            return cords;
        });
    };

    return (
        <>
            <PageNavHeader>
                <Box alignItems="Center" grow="Yes" gap="300">
                    <Box grow="Yes" alignItems="Center" gap="100">
                        {joinRules?.join_rule !== JoinRule.Public && <MDIcon size={0.7} path={mdiLock} />}
                        <Text size="H4" truncate>
                            {spaceName}
                        </Text>
                    </Box>
                    <Box>
                        <IconButton aria-pressed={!!menuAnchor} color='default' onClick={handleOpenMenu}>
                            <MoreVert />
                        </IconButton>
                    </Box>
                </Box>
            </PageNavHeader>
            {menuAnchor && (
                <PopOut
                    anchor={menuAnchor}
                    position="Bottom"
                    align="End"
                    offset={6}
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
                            <SpaceMenu room={space} requestClose={() => setMenuAnchor(undefined)} />
                        </FocusTrap>
                    }
                />
            )}
        </>
    );
}

export function Space() {
    const mx = useMatrixClient();
    const screenSize = useScreenSize();
    const space = useSpace();
    useNavToActivePathMapper(space.roomId);
    const spaceIdOrAlias = getCanonicalAliasOrRoomId(mx, space.roomId);
    const scrollRef = useRef<HTMLDivElement>(null);
    const mDirects = useAtomValue(mDirectAtom);
    const roomToUnread = useAtomValue(roomToUnreadAtom);
    const allRooms = useAtomValue(allRoomsAtom);
    const allJoinedRooms = useMemo(() => new Set(allRooms), [allRooms]);
    const muteChanges = useAtomValue(muteChangesAtom);
    const mutedRooms = muteChanges.added;

    const selectedRoomId = useSelectedRoom();
    const lobbySelected = useSpaceLobbySelected(spaceIdOrAlias);
    const searchSelected = useSpaceSearchSelected(spaceIdOrAlias);

    const [closedCategories, setClosedCategories] = useAtom(useClosedNavCategoriesAtom());

    const getRoom = useCallback(
        (rId: string) => {
            if (allJoinedRooms.has(rId)) {
                return mx.getRoom(rId) ?? undefined;
            }
            return undefined;
        },
        [mx, allJoinedRooms]
    );

    const hierarchy = useSpaceJoinedHierarchy(
        space.roomId,
        getRoom,
        useCallback(
            (parentId, roomId) => {
                if (!closedCategories.has(makeNavCategoryId(space.roomId, parentId))) {
                    return false;
                }
                const showRoom = roomToUnread.has(roomId) || roomId === selectedRoomId;
                if (showRoom) return false;
                return true;
            },
            [space.roomId, closedCategories, roomToUnread, selectedRoomId]
        ),
        useCallback(
            (sId) => closedCategories.has(makeNavCategoryId(space.roomId, sId)),
            [closedCategories, space.roomId]
        )
    );

    const virtualizer = useVirtualizer({
        count: hierarchy.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => 0,
        overscan: 10,
    });

    const handleCategoryClick = useCategoryHandler(setClosedCategories, (categoryId) =>
        closedCategories.has(categoryId)
    );

    const getToLink = (roomId: string) =>
        getSpaceRoomPath(spaceIdOrAlias, getCanonicalAliasOrRoomId(mx, roomId));

    return (
        <PageNav>
            <SpaceHeader />
            <PageNavContent scrollRef={scrollRef}>
                <Box direction="Column" gap="300">
                    <NavCategory>
                        <NavItem variant="Background" radii="400" aria-selected={lobbySelected}>
                            <NavLink to={getSpaceLobbyPath(getCanonicalAliasOrRoomId(mx, space.roomId))}>
                                <NavItemContent>
                                    <Box as="span" grow="Yes" alignItems="Center" gap="200">
                                        <Avatar size="200" radii="400">
                                            <MDIcon size={1} path={lobbySelected ? mdiFlag : mdiFlagOutline} />
                                        </Avatar>
                                        <Box as="span" grow="Yes">
                                            <Text as="span" size="Inherit" truncate>
                                                {getText('space.lobby')}
                                            </Text>
                                        </Box>
                                    </Box>
                                </NavItemContent>
                            </NavLink>
                        </NavItem>
                        <NavItem variant="Background" radii="400" aria-selected={searchSelected}>
                            <NavLink to={getSpaceSearchPath(getCanonicalAliasOrRoomId(mx, space.roomId))}>
                                <NavItemContent>
                                    <Box as="span" grow="Yes" alignItems="Center" gap="200">
                                        <Avatar size="200" radii="400">
                                            <MDIcon size={1} path={mdiMagnify} />
                                        </Avatar>
                                        <Box as="span" grow="Yes">
                                            <Text as="span" size="Inherit" truncate>
                                                {getText('home.search_messages')}
                                            </Text>
                                        </Box>
                                    </Box>
                                </NavItemContent>
                            </NavLink>
                        </NavItem>
                    </NavCategory>
                    <NavCategory
                        style={{
                            height: virtualizer.getTotalSize(),
                            position: 'relative',
                        }}
                    >
                        {virtualizer.getVirtualItems().map((vItem) => {
                            const { roomId } = hierarchy[vItem.index] ?? {};
                            const room = mx.getRoom(roomId);
                            if (!room) return null;

                            if (room.isSpaceRoom()) {
                                const categoryId = makeNavCategoryId(space.roomId, roomId);

                                return (
                                    <VirtualTile
                                        virtualItem={vItem}
                                        key={vItem.index}
                                        ref={virtualizer.measureElement}
                                    >
                                        <div style={{ paddingTop: vItem.index === 0 ? undefined : config.space.S400 }}>
                                            <NavCategoryHeader>
                                                <RoomNavCategoryButton
                                                    data-category-id={categoryId}
                                                    onClick={handleCategoryClick}
                                                    closed={closedCategories.has(categoryId)}
                                                >
                                                    {roomId === space.roomId ? getText('rooms') : room?.name}
                                                </RoomNavCategoryButton>
                                            </NavCategoryHeader>
                                        </div>
                                    </VirtualTile>
                                );
                            }

                            return (
                                <VirtualTile virtualItem={vItem} key={vItem.index} ref={virtualizer.measureElement}>
                                    <RoomNavItem
                                        room={room}
                                        selected={selectedRoomId === roomId}
                                        showAvatar={true}
                                        direct={mDirects.has(roomId)}
                                        linkPath={getToLink(roomId)}
                                        muted={mutedRooms.includes(roomId)}
                                    />
                                </VirtualTile>
                            );
                        })}
                    </NavCategory>
                </Box>
            </PageNavContent>
            {screenSize === ScreenSize.Mobile && (
                <FAB />
            )}
        </PageNav>
    );
}
