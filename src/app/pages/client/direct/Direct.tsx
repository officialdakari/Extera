import React, { MouseEventHandler, forwardRef, useMemo, useRef, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import {
    AppBar,
    Avatar,
    Box,
    Button,
    IconButton,
    ListItem,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Paper,
    Popper,
    Toolbar,
    Typography,
} from '@mui/material';
import { useVirtualizer } from '@tanstack/react-virtual';
import FocusTrap from 'focus-trap-react';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { factoryRoomIdByActivity } from '../../../utils/sort';
import {
    NavButton,
    NavCategory,
    NavCategoryHeader,
    NavEmptyCenter,
    NavEmptyLayout,
    NavItem,
    NavItemContent,
} from '../../../components/nav';
import { getDirectRoomPath } from '../../pathUtils';
import { getCanonicalAliasOrRoomId } from '../../../utils/matrix';
import { useSelectedRoom } from '../../../hooks/router/useSelectedRoom';
import { VirtualTile } from '../../../components/virtualizer';
import { RoomNavCategoryButton, RoomNavItem } from '../../../features/room-nav';
import { muteChangesAtom } from '../../../state/room-list/mutedRoomList';
import { makeNavCategoryId } from '../../../state/closedNavCategories';
import { roomToUnreadAtom } from '../../../state/room/roomToUnread';
import { useCategoryHandler } from '../../../hooks/useCategoryHandler';
import { useNavToActivePathMapper } from '../../../hooks/useNavToActivePathMapper';
import { useDirectRooms } from './useDirectRooms';
import { openInviteUser } from '../../../../client/action/navigation';
import { PageNav, PageNavContent, PageNavHeader } from '../../../components/page';
import { useClosedNavCategoriesAtom } from '../../../state/hooks/closedNavCategories';
import { useRoomsUnread } from '../../../state/hooks/unread';
import { markAsRead } from '../../../../client/action/notifications';
import { getText } from '../../../../lang';
import { isHidden } from '../../../state/hooks/roomList';
import Icon from '@mdi/react';
import { mdiAccountPlus, mdiAt, mdiCheckAll, mdiDotsVertical, mdiPencil, mdiPlus, mdiPlusCircleOutline } from '@mdi/js';
import { ScreenSize, useScreenSize } from '../../../hooks/useScreenSize';
import { Fab } from '@mui/material';
import { DoneAll } from '@mui/icons-material';
import FAB from '../../../components/fab/FAB';

type DirectMenuProps = {
    requestClose: () => void;
    open: boolean;
    anchorEl: null | HTMLElement;
};

const DirectMenu = forwardRef<HTMLDivElement, DirectMenuProps>(({ open, anchorEl, requestClose }, ref) => {
    const orphanRooms = useDirectRooms();
    const unread = useRoomsUnread(orphanRooms, roomToUnreadAtom);

    const handleMarkAsRead = () => {
        if (!unread) return;
        orphanRooms.forEach((rId) => markAsRead(rId));
        requestClose();
    };

    return (
        <Paper sx={{ width: 320, maxWidth: '100%' }}>
            <Menu anchorEl={anchorEl} open={open} onClose={requestClose} ref={ref}>
                <MenuItem onClick={handleMarkAsRead} disabled={!unread}>
                    <ListItemIcon>
                        <DoneAll />
                    </ListItemIcon>
                    <ListItemText>
                        {getText('chats.mark_as_read')}
                    </ListItemText>
                </MenuItem>
            </Menu>
        </Paper>
    );
});

function DirectHeader() {
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

    const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
        setMenuAnchor((prev) => (prev ? null : evt.currentTarget));
    };

    return (
        <>
            <AppBar position='static'>
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        {getText('direct_menu.title')}
                    </Typography>
                    <IconButton onClick={handleOpenMenu}>
                        <Icon size={1} path={mdiDotsVertical} />
                    </IconButton>
                </Toolbar>
            </AppBar>
            <DirectMenu anchorEl={menuAnchor} open={!!menuAnchor} requestClose={() => setMenuAnchor(null)} />
        </>
    );
}

function DirectEmpty() {
    return (
        <NavEmptyCenter>
            <NavEmptyLayout
                icon={<Icon size={1} path={mdiAt} />}
                title={
                    <Typography variant="h5" align="center">
                        {getText('direct_menu.empty')}
                    </Typography>
                }
                content={
                    <Typography variant="body2" align="center">
                        {getText('direct_menu.empty.2')}
                    </Typography>
                }
                options={
                    <Button variant="contained" onClick={() => openInviteUser()}>
                        {getText('direct_menu.empty.start_new')}
                    </Button>
                }
            />
        </NavEmptyCenter>
    );
}

const DEFAULT_CATEGORY_ID = makeNavCategoryId('direct', 'direct');
export function Direct() {
    const mx = useMatrixClient();
    useNavToActivePathMapper('direct');
    const scrollRef = useRef<HTMLDivElement>(null);
    const directs = useDirectRooms();
    const muteChanges = useAtomValue(muteChangesAtom);
    const mutedRooms = muteChanges.added;
    const roomToUnread = useAtomValue(roomToUnreadAtom);
    const screenSize = useScreenSize();

    const selectedRoomId = useSelectedRoom();
    const noRoomToDisplay = directs.length === 0;
    const [closedCategories, setClosedCategories] = useAtom(useClosedNavCategoriesAtom());

    const sortedDirects = useMemo(() => {
        const items = Array.from(directs).sort(factoryRoomIdByActivity(mx));
        if (closedCategories.has(DEFAULT_CATEGORY_ID)) {
            return items.filter((rId) => roomToUnread.has(rId) || rId === selectedRoomId);
        }
        return items.filter((room) => !isHidden(mx, room));
    }, [mx, directs, closedCategories, roomToUnread, selectedRoomId]);

    const virtualizer = useVirtualizer({
        count: sortedDirects.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => 38,
        overscan: 10,
    });

    const handleCategoryClick = useCategoryHandler(setClosedCategories, (categoryId) =>
        closedCategories.has(categoryId)
    );

    return (
        <PageNav>
            <DirectHeader />
            {!noRoomToDisplay ? (
                <DirectEmpty />
            ) : (
                <PageNavContent scrollRef={scrollRef}>
                    <Box display="flex" flexDirection="column" gap={3}>
                        {screenSize !== ScreenSize.Mobile && (
                            <NavCategory>
                                <NavItem>
                                    <NavButton onClick={() => openInviteUser()}>
                                        <NavItemContent>
                                            <Box display="flex" alignItems="center" gap={2}>
                                                <Avatar>
                                                    <Icon size={1} path={mdiPlusCircleOutline} />
                                                </Avatar>
                                                <Typography variant="body1">
                                                    {getText('direct_menu.new')}
                                                </Typography>
                                            </Box>
                                        </NavItemContent>
                                    </NavButton>
                                </NavItem>
                            </NavCategory>
                        )}
                        <NavCategory>
                            <NavCategoryHeader>
                                <RoomNavCategoryButton
                                    closed={closedCategories.has(DEFAULT_CATEGORY_ID)}
                                    data-category-id={DEFAULT_CATEGORY_ID}
                                    onClick={handleCategoryClick}
                                >
                                    {getText('direct_menu.chats')}
                                </RoomNavCategoryButton>
                            </NavCategoryHeader>
                            <div
                                style={{
                                    position: 'relative',
                                    height: virtualizer.getTotalSize(),
                                }}
                            >
                                {virtualizer.getVirtualItems().map((vItem) => {
                                    const roomId = sortedDirects[vItem.index];
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
                                                showAvatar
                                                direct
                                                linkPath={getDirectRoomPath(getCanonicalAliasOrRoomId(mx, roomId))}
                                                muted={mutedRooms.includes(roomId)}
                                            />
                                        </VirtualTile>
                                    );
                                })}
                            </div>
                        </NavCategory>
                    </Box>
                </PageNavContent>
            )}
            {screenSize === ScreenSize.Mobile && (
                <FAB />
            )}
        </PageNav>
    );
}
