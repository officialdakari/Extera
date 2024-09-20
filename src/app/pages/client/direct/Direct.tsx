import React, { MouseEventHandler, forwardRef, useMemo, useRef, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import {
    Avatar,
    Box,
    Button,
    IconButton,
    Menu,
    MenuItem,
    PopOut,
    RectCords,
    Text,
    config,
    toRem,
} from 'folds';
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

type DirectMenuProps = {
    requestClose: () => void;
};
const DirectMenu = forwardRef<HTMLDivElement, DirectMenuProps>(({ requestClose }, ref) => {
    const orphanRooms = useDirectRooms();
    const unread = useRoomsUnread(orphanRooms, roomToUnreadAtom);

    const handleMarkAsRead = () => {
        if (!unread) return;
        orphanRooms.forEach((rId) => markAsRead(rId));
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
                    aria-disabled={!unread}
                >
                    <Text style={{ flexGrow: 1 }} as="span" size="T300">
                        {getText('chats.mark_as_read')}
                    </Text>
                </MenuItem>
            </Box>
        </Menu>
    );
});

function DirectHeader() {
    const [menuAnchor, setMenuAnchor] = useState<RectCords>();

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
                    <Box grow="Yes">
                        <Text size="H4" truncate>
                            {getText('direct_menu.title')}
                        </Text>
                    </Box>
                    <Box>
                        <IconButton aria-pressed={!!menuAnchor} variant="Background" onClick={handleOpenMenu}>
                            <Icon size={1} path={mdiDotsVertical} />
                        </IconButton>
                    </Box>
                </Box>
            </PageNavHeader>
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
                        <DirectMenu requestClose={() => setMenuAnchor(undefined)} />
                    </FocusTrap>
                }
            />
        </>
    );
}

function DirectEmpty() {
    return (
        <NavEmptyCenter>
            <NavEmptyLayout
                icon={<Icon size={1} path={mdiAt} />}
                title={
                    <Text size="H5" align="Center">
                        {getText('direct_menu.empty')}
                    </Text>
                }
                content={
                    <Text size="T300" align="Center">
                        {getText('direct_menu.empty.2')}
                    </Text>
                }
                options={
                    <Button variant="Secondary" size="300" onClick={() => openInviteUser()}>
                        <Text size="B300" truncate>
                            {getText('direct_menu.empty.start_new')}
                        </Text>
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
            {noRoomToDisplay ? (
                <DirectEmpty />
            ) : (
                <PageNavContent scrollRef={scrollRef}>
                    <Box direction="Column" gap="300">
                        {screenSize !== ScreenSize.Mobile && (
                            <NavCategory>
                                <NavItem variant="Background" radii="400">
                                    <NavButton onClick={() => openInviteUser()}>
                                        <NavItemContent>
                                            <Box as="span" grow="Yes" alignItems="Center" gap="200">
                                                <Avatar size="200" radii="400">
                                                    <Icon size={1} path={mdiPlusCircleOutline} />
                                                </Avatar>
                                                <Box as="span" grow="Yes">
                                                    <Text as="span" size="Inherit" truncate>
                                                        {getText('direct_menu.new')}
                                                    </Text>
                                                </Box>
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
                                {virtualizer.getVirtualItems()
                                    .map((vItem) => {
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
                <Box style={{ display: 'flex', zIndex: 50, position: 'absolute', bottom: '20px', right: '20px', width: 'inherit' }}>
                    <Fab onClick={() => openInviteUser()} color='primary' aria-label='New chat'>
                        <Icon path={mdiPencil} size={1} />
                    </Fab>
                </Box>
            )}
        </PageNav>
    );
}
