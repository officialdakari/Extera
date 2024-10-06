import React, { MouseEventHandler, forwardRef, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Avatar,
    Box,
    Button,
    IconButton,
    Menu,
    MenuItem,
    Popover,
    Typography,
    Divider,
    AppBar,
    Toolbar,
    ListItemIcon,
    ListItemText,
} from '@mui/material';
import Icon, { Icon as MDIcon } from '@mdi/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAtom, useAtomValue } from 'jotai';
import FocusTrap from 'focus-trap-react';
import { factoryRoomIdByActivity, factoryRoomIdByAtoZ } from '../../../utils/sort';
import {
    NavButton,
    NavCategory,
    NavCategoryHeader,
    NavEmptyCenter,
    NavEmptyLayout,
    NavItem,
    NavItemContent,
    NavLink,
} from '../../../components/nav';
import { getExplorePath, getHomeRoomPath, getHomeSearchPath } from '../../pathUtils';
import { getCanonicalAliasOrRoomId } from '../../../utils/matrix';
import { useSelectedRoom } from '../../../hooks/router/useSelectedRoom';
import { useHomeSearchSelected } from '../../../hooks/router/useHomeSelected';
import { useHomeRooms } from './useHomeRooms';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { VirtualTile } from '../../../components/virtualizer';
import { RoomNavCategoryButton, RoomNavItem } from '../../../features/room-nav';
import { muteChangesAtom } from '../../../state/room-list/mutedRoomList';
import { makeNavCategoryId } from '../../../state/closedNavCategories';
import { roomToUnreadAtom } from '../../../state/room/roomToUnread';
import { useCategoryHandler } from '../../../hooks/useCategoryHandler';
import { useNavToActivePathMapper } from '../../../hooks/useNavToActivePathMapper';
import { openCreateRoom, openJoinAlias } from '../../../../client/action/navigation';
import { PageNav, PageNavHeader, PageNavContent } from '../../../components/page';
import { useRoomsUnread } from '../../../state/hooks/unread';
import { markAsRead } from '../../../../client/action/notifications';
import { useClosedNavCategoriesAtom } from '../../../state/hooks/closedNavCategories';
import { getText } from '../../../../lang';
import { isHidden } from '../../../state/hooks/roomList';
import { mdiPound } from '@mdi/js';
import { ScreenSize, useScreenSize } from '../../../hooks/useScreenSize';
import FAB from '../../../components/fab/FAB';
import { Add, ArrowForward, ArrowRight, DoneAll, KeyboardArrowRight, MoreVert, Menu as MenuIcon, MenuOpen } from '@mui/icons-material';
import { useNavHidden } from '../../../hooks/useHideableNav';
import SearchBar from '../SearchBar';
import SyncStateAlert from '../SyncStateAlert';
import BottomNav from '../BottomNav';

type HomeMenuProps = {
    requestClose: () => void;
    anchorEl: HTMLElement | null;
};

const HomeMenu = forwardRef<HTMLDivElement, HomeMenuProps>(({ anchorEl, requestClose }, ref) => {
    const orphanRooms = useHomeRooms();
    const unread = useRoomsUnread(orphanRooms, roomToUnreadAtom);

    const handleMarkAsRead = () => {
        if (!unread) return;
        orphanRooms.forEach((rId) => markAsRead(rId));
        requestClose();
    };

    const handleNewRoom = () => {
        openCreateRoom();
        requestClose();
    };

    const handleJoin = () => {
        openJoinAlias();
        requestClose();
    };

    return (
        <Menu anchorEl={anchorEl} onClose={requestClose} open={!!anchorEl} ref={ref}>
            <MenuItem
                onClick={handleMarkAsRead}
                disabled={!unread}
                style={{ minHeight: 'auto' }}
            >
                <ListItemIcon>
                    <DoneAll fontSize='small' />
                </ListItemIcon>
                <ListItemText>{getText('chats.mark_as_read')}</ListItemText>
            </MenuItem>
            <MenuItem
                onClick={handleNewRoom}
                style={{ minHeight: 'auto' }}
            >
                <ListItemIcon>
                    <Add fontSize='small' />
                </ListItemIcon>
                <ListItemText>{getText('home.new_room')}</ListItemText>
            </MenuItem>
            <MenuItem
                onClick={handleJoin}
                style={{ minHeight: 'auto' }}
            >
                <ListItemIcon>
                    <ArrowForward fontSize='small' />
                </ListItemIcon>
                <ListItemText>{getText('home.join_via_address')}</ListItemText>
            </MenuItem>
        </Menu>
    );
});

function HomeHeader() {
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [navHidden, setNavHidden] = useNavHidden();

    const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
        setMenuAnchor((currentState) => (currentState ? null : evt.currentTarget));
    };

    return (
        <Box sx={{ flexGrow: 0 }}>
            <AppBar color='inherit' enableColorOnDark position='static'>
                <Toolbar style={{ paddingLeft: 8, paddingRight: 8 }} variant='regular'>
                    <IconButton
                        size='large'
                        color='inherit'
                        onClick={() => setNavHidden(!navHidden)}
                    >
                        {navHidden ? <MenuIcon /> : <MenuOpen />}
                    </IconButton>
                    <SearchBar />
                    <IconButton
                        size='large'
                        color='inherit'
                        onClick={handleOpenMenu}
                    >
                        <MoreVert />
                    </IconButton>
                    <HomeMenu anchorEl={menuAnchor} requestClose={() => setMenuAnchor(null)} />
                </Toolbar>
            </AppBar>
        </Box>
    );
}

function HomeEmpty() {
    const navigate = useNavigate();

    return (
        <NavEmptyCenter>
            <NavEmptyLayout
                icon={<MDIcon size={1} path={mdiPound} />}
                title={
                    <Typography variant="h5" align="center">
                        {getText('home.empty')}
                    </Typography>
                }
                content={
                    <Typography variant="body2" align="center">
                        {getText('home.empty.2')}
                    </Typography>
                }
                options={
                    <>
                        <Button onClick={() => openCreateRoom()} variant="contained" size="small">
                            {getText('home.empty.new')}
                        </Button>
                        <Button
                            onClick={() => navigate(getExplorePath())}
                            variant="outlined"
                            size="small"
                        >
                            {getText('home.empty.explore')}
                        </Button>
                    </>
                }
            />
        </NavEmptyCenter>
    );
}

const DEFAULT_CATEGORY_ID = makeNavCategoryId('home', 'room');

export function Home() {
    const mx = useMatrixClient();
    const screenSize = useScreenSize();
    useNavToActivePathMapper('home');
    const scrollRef = useRef<HTMLDivElement>(null);
    const rooms = useHomeRooms();
    const muteChanges = useAtomValue(muteChangesAtom);
    const mutedRooms = muteChanges.added;
    const roomToUnread = useAtomValue(roomToUnreadAtom);

    const selectedRoomId = useSelectedRoom();
    const searchSelected = useHomeSearchSelected();
    const noRoomToDisplay = rooms.length === 0;
    const [closedCategories, setClosedCategories] = useAtom(useClosedNavCategoriesAtom());

    const sortedRooms = useMemo(() => {
        const items = Array.from(rooms).sort(
            closedCategories.has(DEFAULT_CATEGORY_ID)
                ? factoryRoomIdByActivity(mx)
                : factoryRoomIdByAtoZ(mx)
        );
        if (closedCategories.has(DEFAULT_CATEGORY_ID)) {
            return items.filter((rId) => roomToUnread.has(rId) || rId === selectedRoomId);
        }
        return items.filter((room) => !isHidden(mx, room));
    }, [mx, rooms, closedCategories, roomToUnread, selectedRoomId]);

    const virtualizer = useVirtualizer({
        count: sortedRooms.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => 38,
        overscan: 10,
    });

    const handleCategoryClick = useCategoryHandler(setClosedCategories, (categoryId) =>
        closedCategories.has(categoryId)
    );

    return (
        <PageNav>
            <HomeHeader />
            <SyncStateAlert />
            {noRoomToDisplay ? (
                <HomeEmpty />
            ) : (
                <PageNavContent scrollRef={scrollRef}>
                    <Box display="flex" flexDirection="column" gap={2}>
                        <div
                            style={{
                                position: 'relative',
                                height: virtualizer.getTotalSize(),
                            }}
                        >
                            {virtualizer.getVirtualItems()
                                .map((vItem) => {
                                    const roomId = sortedRooms[vItem.index];
                                    const room = mx.getRoom(roomId);
                                    if (!room) return null;
                                    const selected = selectedRoomId === roomId;

                                    return (
                                        <VirtualTile
                                            virtualItem={vItem}
                                            key={vItem.index}
                                            ref={virtualizer.measureElement}
                                        >
                                            <RoomNavItem
                                                room={room}
                                                selected={selected}
                                                showAvatar={true}
                                                linkPath={getHomeRoomPath(getCanonicalAliasOrRoomId(mx, roomId))}
                                                muted={mutedRooms.includes(roomId)}
                                            />
                                        </VirtualTile>
                                    );
                                })}
                        </div>
                    </Box>
                </PageNavContent>
            )}
            <BottomNav current='rooms' />
            {screenSize === ScreenSize.Mobile && (
                <FAB />
            )}
        </PageNav>
    );
}
