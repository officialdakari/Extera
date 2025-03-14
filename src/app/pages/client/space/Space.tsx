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
    config,
} from 'folds';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Room } from 'matrix-js-sdk';
import { DoneAll, MenuOpen, MoreVert, PersonAdd, Menu as MenuIcon, Share, ArrowBack, Flag, OutlinedFlag, Search, Settings } from '@mui/icons-material';
import { AppBar, Box, Button, Divider, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Toolbar, Typography } from '@mui/material';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { mDirectAtom } from '../../../state/mDirectList';
import {
    NavCategory,
    NavCategoryHeader,
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
import { getCanonicalAliasOrRoomId, getRoomTags } from '../../../utils/matrix';
import { useSelectedRoom } from '../../../hooks/router/useSelectedRoom';
import {
    useSpaceLobbySelected,
    useSpaceSearchSelected,
} from '../../../hooks/router/useSelectedSpace';
import { useSpace } from '../../../hooks/useSpace';
import { VirtualTile } from '../../../components/virtualizer';
import { RoomNavCategoryButton, RoomNavItem } from '../../../features/room-nav';
import { makeNavCategoryId } from '../../../state/closedNavCategories';
import { roomToUnreadAtom } from '../../../state/room/roomToUnread';
import { useCategoryHandler } from '../../../hooks/useCategoryHandler';
import { useNavToActivePathMapper } from '../../../hooks/useNavToActivePathMapper';
import { useRoomName } from '../../../hooks/useRoomMeta';
import { useSpaceJoinedHierarchy } from '../../../hooks/useSpaceHierarchy';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { PageNav, PageNavContent } from '../../../components/page';
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
import { getText } from '../../../../lang';
import { ScreenSize, useScreenSize } from '../../../hooks/useScreenSize';
import FAB from '../../../components/fab/FAB';
import { useNavHidden } from '../../../hooks/useHideableNav';
import SyncStateAlert from '../SyncStateAlert';
import { useSetting } from '../../../state/hooks/settings';
import { settingsAtom } from '../../../state/settings';

type SpaceMenuProps = {
    room: Room;
    requestClose: () => void;
    anchorEl: HTMLElement | null;
};
const SpaceMenu = forwardRef<HTMLDivElement, SpaceMenuProps>(({ room, anchorEl, requestClose }, ref) => {
    const mx = useMatrixClient();
    const { hashRouter } = useClientConfig();
    const roomToParents = useAtomValue(roomToParentsAtom);
    const [ghostMode] = useSetting(settingsAtom, 'extera_ghostMode');

    const allChild = useSpaceChildren(
        allRoomsAtom,
        room.roomId,
        useRecursiveChildScopeFactory(mx, roomToParents)
    );
    const unread = useRoomsUnread(allChild, roomToUnreadAtom);

    const handleMarkAsRead = () => {
        allChild.forEach((childRoomId) => markAsRead(childRoomId, undefined, ghostMode));
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
        <Menu open={!!anchorEl} onClose={requestClose} anchorEl={anchorEl} ref={ref}>
            <MenuItem
                onClick={handleMarkAsRead}
                disabled={!unread}
            >
                <ListItemIcon>
                    <DoneAll />
                </ListItemIcon>
                <ListItemText>
                    {getText('chats.mark_as_read')}
                </ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem
                onClick={handleInvite}
            >
                <ListItemIcon>
                    <PersonAdd />
                </ListItemIcon>
                <ListItemText>
                    {getText('space.action.invite')}
                </ListItemText>
            </MenuItem>
            <MenuItem
                onClick={handleCopyLink}
            >
                <ListItemIcon>
                    <Share />
                </ListItemIcon>
                <ListItemText>
                    {getText('space.action.copy_link')}
                </ListItemText>
            </MenuItem>

            <MenuItem
                onClick={handleRoomSettings}
            >
                <ListItemIcon>
                    <Settings />
                </ListItemIcon>
                <ListItemText>
                    {getText('space.action.settings')}
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
                                <ArrowBack color='error' />
                            </ListItemIcon>
                            <ListItemText sx={{ color: 'error.main' }}>
                                {getText('space.action.leave')}
                            </ListItemText>
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
        </Menu>
    );
});

function SpaceHeader() {
    const space = useSpace();
    const spaceName = useRoomName(space);
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const [navHidden, setNavHidden] = useNavHidden();

    const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
        setMenuAnchor((currentState) => {
            if (currentState) return null;
            return evt.currentTarget;
        });
    };

    return (
        <Box sx={{ flexGrow: 0 }}>
            <AppBar color='primary' position='static'>
                <Toolbar style={{ paddingLeft: 8, paddingRight: 8 }} variant='regular'>
                    <IconButton
                        size='large'
                        color='inherit'
                        onClick={() => setNavHidden(!navHidden)}
                    >
                        {navHidden ? <MenuIcon /> : <MenuOpen />}
                    </IconButton>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        {getText(spaceName)}
                    </Typography>
                    <IconButton
                        size='large'
                        color='inherit'
                        onClick={handleOpenMenu}
                    >
                        <MoreVert />
                    </IconButton>
                    <SpaceMenu room={space} anchorEl={menuAnchor} requestClose={() => setMenuAnchor(null)} />
                </Toolbar>
            </AppBar>
            <SyncStateAlert />
        </Box>
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
    // const muteChanges = useAtomValue(muteChangesAtom);
    // const mutedRooms = muteChanges.added;

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
        <PageNav header={<SpaceHeader />}>
            <PageNavContent scrollRef={scrollRef}>
                <Box flexDirection='column' gap='300'>
                    <NavCategory>
                        <Button
                            aria-selected={lobbySelected}
                            fullWidth
                            startIcon={lobbySelected ? <Flag /> : <OutlinedFlag />}
                            color='inherit'
                        >
                            <NavLink to={getSpaceLobbyPath(getCanonicalAliasOrRoomId(mx, space.roomId))}>
                                {getText('space.lobby')}
                            </NavLink>
                        </Button>
                        <Button
                            aria-selected={searchSelected}
                            fullWidth
                            startIcon={<Search />}
                            color='inherit'
                        >
                            <NavLink to={getSpaceSearchPath(getCanonicalAliasOrRoomId(mx, space.roomId))}>
                                {getText('home.search_messages')}
                            </NavLink>
                        </Button>
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
                            const tags = getRoomTags(mx, room);

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
                                        showAvatar
                                        direct={mDirects.has(roomId)}
                                        linkPath={getToLink(roomId)}
                                        // muted={mutedRooms.includes(roomId)}
                                        pinned={'m.favourite' in tags}
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
