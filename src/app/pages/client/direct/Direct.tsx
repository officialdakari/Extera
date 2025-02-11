import React, { MouseEventHandler, forwardRef, useMemo, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import Icon from '@mdi/react';
import { mdiAt } from '@mdi/js';
import { DoneAll, MenuOpen, MoreVert, PersonAdd, Menu as MenuIcon } from '@mui/icons-material';
import {
    AppBar,
    Box,
    Button,
    IconButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Toolbar,
    Typography,
} from '@mui/material';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { factoryRoomIdByActivity } from '../../../utils/sort';
import {
    NavEmptyCenter,
    NavEmptyLayout,
} from '../../../components/nav';
import { getDirectRoomPath } from '../../pathUtils';
import { getCanonicalAliasOrRoomId, getRoomTags } from '../../../utils/matrix';
import { useSelectedRoom } from '../../../hooks/router/useSelectedRoom';
import { VirtualTile } from '../../../components/virtualizer';
import { RoomNavItem } from '../../../features/room-nav';
import { muteChangesAtom } from '../../../state/room-list/mutedRoomList';
import { roomToUnreadAtom } from '../../../state/room/roomToUnread';
import { useNavToActivePathMapper } from '../../../hooks/useNavToActivePathMapper';
import { useDirectRooms } from './useDirectRooms';
import { openInviteUser } from '../../../../client/action/navigation';
import { PageNav, PageNavContent } from '../../../components/page';
import { useRoomsUnread } from '../../../state/hooks/unread';
import { markAsRead } from '../../../../client/action/notifications';
import { getText } from '../../../../lang';
import { ScreenSize, useScreenSize } from '../../../hooks/useScreenSize';
import FAB from '../../../components/fab/FAB';
import { useNavHidden } from '../../../hooks/useHideableNav';
import SearchBar from '../SearchBar';
import SyncStateAlert from '../SyncStateAlert';

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

    const handleNewDM = () => {
        openInviteUser();
        requestClose();
    };

    return (
        <Menu anchorEl={anchorEl} open={open} onClose={requestClose} ref={ref}>
            <MenuItem onClick={handleMarkAsRead} style={{ minHeight: 'auto' }} disabled={!unread}>
                <ListItemIcon>
                    <DoneAll fontSize='small' />
                </ListItemIcon>
                <ListItemText>
                    {getText('chats.mark_as_read')}
                </ListItemText>
            </MenuItem>
            <MenuItem onClick={handleNewDM} style={{ minHeight: 'auto' }}>
                <ListItemIcon>
                    <PersonAdd fontSize='small' />
                </ListItemIcon>
                <ListItemText>
                    {getText('direct_menu.new')}
                </ListItemText>
            </MenuItem>
        </Menu>
    );
});

function DirectHeader() {
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const [navHidden, setNavHidden] = useNavHidden();

    const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
        setMenuAnchor((prev) => (prev ? null : evt.currentTarget));
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
                    <SearchBar />
                    <IconButton
                        size='large'
                        color='inherit'
                        onClick={handleOpenMenu}
                    >
                        <MoreVert />
                    </IconButton>
                    <DirectMenu anchorEl={menuAnchor} open={!!menuAnchor} requestClose={() => setMenuAnchor(null)} />
                </Toolbar>
            </AppBar>
        </Box>
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

export function Direct() {
    const mx = useMatrixClient();
    useNavToActivePathMapper('direct');
    const scrollRef = useRef<HTMLDivElement>(null);
    const directs = useDirectRooms();
    const muteChanges = useAtomValue(muteChangesAtom);
    const mutedRooms = muteChanges.added;
    const screenSize = useScreenSize();

    const selectedRoomId = useSelectedRoom();
    const noRoomToDisplay = directs.length === 0;
    // eslint-disable-next-line no-restricted-globals
    const prev = history.state?.usr?.prev || '';

    const sortedDirects = useMemo(() => {
        const items = Array.from(directs).sort(
            factoryRoomIdByActivity(mx)
        );
        return items;
    }, [mx, directs]);

    const virtualizer = useVirtualizer({
        count: sortedDirects.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => 38,
        overscan: 10
    });

    return (
        <PageNav
            header={<DirectHeader />}
            variants={{
                exit: {
                    translateX: prev === 'rooms' ? '20px' : '-20px',
                    opacity: 0.3,
                    transition: {
                        ease: 'linear'
                    },
                },
                final: {
                    translateX: 0,
                    opacity: 1,
                    transition: {
                        ease: 'linear'
                    },
                }
            }}
        >
            <SyncStateAlert />
            {noRoomToDisplay ? (
                <DirectEmpty />
            ) : (
                <PageNavContent scrollRef={scrollRef}>
                    <Box display="flex" flexDirection="column" gap={3}>
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
                                const tags = getRoomTags(mx, room);

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
                                            pinned={'m.favourite' in tags}
                                        />
                                    </VirtualTile>
                                );
                            })}
                        </div>
                    </Box>
                </PageNavContent>
            )}
            {screenSize === ScreenSize.Mobile && (
                <FAB />
            )}
        </PageNav>
    );
}
