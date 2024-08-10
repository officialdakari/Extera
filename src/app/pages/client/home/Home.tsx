import React, { MouseEventHandler, forwardRef, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Icon as MDIcon } from '@mdi/react';
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
import { mdiCheckAll, mdiDotsVertical, mdiLinkVariant, mdiMagnify, mdiPlus, mdiPlusCircle, mdiPlusCircleOutline, mdiPound } from '@mdi/js';

type HomeMenuProps = {
    requestClose: () => void;
};
const HomeMenu = forwardRef<HTMLDivElement, HomeMenuProps>(({ requestClose }, ref) => {
    const orphanRooms = useHomeRooms();
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
                    after={<MDIcon size={1} path={mdiCheckAll} />}
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

function HomeHeader() {
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
                            {getText('home.title')}
                        </Text>
                    </Box>
                    <Box>
                        <IconButton aria-pressed={!!menuAnchor} variant="Background" onClick={handleOpenMenu}>
                            <MDIcon size={1} path={mdiDotsVertical} />
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
                        <HomeMenu requestClose={() => setMenuAnchor(undefined)} />
                    </FocusTrap>
                }
            />
        </>
    );
}

function HomeEmpty() {
    const navigate = useNavigate();

    return (
        <NavEmptyCenter>
            <NavEmptyLayout
                icon={<MDIcon size={1} path={mdiPound} />}
                title={
                    <Text size="H5" align="Center">
                        {getText('home.empty')}
                    </Text>
                }
                content={
                    <Text size="T300" align="Center">
                        {getText('home.empty.2')}
                    </Text>
                }
                options={
                    <>
                        <Button onClick={() => openCreateRoom()} variant="Secondary" size="300">
                            <Text size="B300" truncate>
                                {getText('home.empty.new')}
                            </Text>
                        </Button>
                        <Button
                            onClick={() => navigate(getExplorePath())}
                            variant="Secondary"
                            fill="Soft"
                            size="300"
                        >
                            <Text size="B300" truncate>
                                {getText('home.empty.explore')}
                            </Text>
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
            {noRoomToDisplay ? (
                <HomeEmpty />
            ) : (
                <PageNavContent scrollRef={scrollRef}>
                    <Box direction="Column" gap="300">
                        <NavCategory>
                            <NavItem variant="Background" radii="400">
                                <NavButton onClick={() => openCreateRoom()}>
                                    <NavItemContent>
                                        <Box as="span" grow="Yes" alignItems="Center" gap="200">
                                            <Avatar size="200" radii="400">
                                                <MDIcon size={1} path={mdiPlusCircleOutline} />
                                            </Avatar>
                                            <Box as="span" grow="Yes">
                                                <Text as="span" size="Inherit">
                                                    {getText('home.new_room')}
                                                </Text>
                                            </Box>
                                        </Box>
                                    </NavItemContent>
                                </NavButton>
                            </NavItem>
                            <NavItem variant="Background" radii="400">
                                <NavButton onClick={() => openJoinAlias()}>
                                    <NavItemContent>
                                        <Box as="span" grow="Yes" alignItems="Center" gap="200">
                                            <Avatar size="200" radii="400">
                                                <MDIcon size={1} path={mdiLinkVariant} />
                                            </Avatar>
                                            <Box as="span" grow="Yes">
                                                <Text as="span" size="Inherit">
                                                    {getText('home.join_via_address')}
                                                </Text>
                                            </Box>
                                        </Box>
                                    </NavItemContent>
                                </NavButton>
                            </NavItem>
                            <NavItem variant="Background" radii="400" aria-selected={searchSelected}>
                                <NavLink to={getHomeSearchPath()}>
                                    <NavItemContent>
                                        <Box as="span" grow="Yes" alignItems="Center" gap="200">
                                            <Avatar size="200" radii="400">
                                                <MDIcon size={1} path={mdiMagnify} />
                                            </Avatar>
                                            <Box as="span" grow="Yes">
                                                <Text as="span" size="Inherit">
                                                    {getText('home.search_messages')}
                                                </Text>
                                            </Box>
                                        </Box>
                                    </NavItemContent>
                                </NavLink>
                            </NavItem>
                        </NavCategory>
                        <NavCategory>
                            <NavCategoryHeader>
                                <RoomNavCategoryButton
                                    closed={closedCategories.has(DEFAULT_CATEGORY_ID)}
                                    data-category-id={DEFAULT_CATEGORY_ID}
                                    onClick={handleCategoryClick}
                                >
                                    {getText('home.rooms')}
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
                        </NavCategory>
                    </Box>
                </PageNavContent>
            )}
        </PageNav>
    );
}
