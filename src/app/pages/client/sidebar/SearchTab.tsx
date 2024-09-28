import React, { ChangeEventHandler, EventHandler, KeyboardEventHandler, SyntheticEvent, useRef, useState } from 'react';
import { PageNav, PageNavContent } from '../../../components/page';
import { AppBar, Box, IconButton, Tab, Tabs, Toolbar, useTheme } from '@mui/material';
import { useNavHidden } from '../../../hooks/useHideableNav';
import { MenuOpen, Menu as MenuIcon, Close } from '@mui/icons-material';
import SearchBar from '../SearchBar';
import { getText } from '../../../../lang';
import { Room } from 'matrix-js-sdk';
import { Scroll } from 'folds';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { VirtualTile } from '../../../components/virtualizer';
import { RoomNavItem } from '../../../features/room-nav';
import { useRoomNavigate } from '../../../hooks/useRoomNavigate';
import { getHomeRoomPath } from '../../pathUtils';
import { getCanonicalAliasOrRoomId, searchRoom } from '../../../utils/matrix';
import { useAtomValue } from 'jotai';
import { muteChangesAtom } from '../../../state/room-list/mutedRoomList';
import { roomToUnreadAtom } from '../../../state/room/roomToUnread';
import AsyncSearch from '../../../../util/AsyncSearch';
import RoomSelector from '../../../molecules/room-selector/RoomSelector';

function a11yProps(index: number) {
    return {
        id: `simple-tab-${index}`,
        'aria-controls': `simple-tabpanel-${index}`,
    };
}

function SearchRooms({ rooms }: { rooms: Room[] }) {
    const mx = useMatrixClient();
    const theme = useTheme();
    const { navigateRoom } = useRoomNavigate();
    // const scrollRef = useRef<HTMLDivElement>(null);
    // const virtualizer = useVirtualizer({
    //     count: rooms.length,
    //     getScrollElement: () => scrollRef.current,
    //     estimateSize: () => 38,
    //     overscan: 10,
    // });

    const muteChanges = useAtomValue(muteChangesAtom);
    const mutedRooms = muteChanges.added;
    const roomToUnread = useAtomValue(roomToUnreadAtom);

    return (
        <Box display='flex' flexDirection='column' gap={theme.spacing(1)}>
            {
                rooms.map(room => {
                    let imageSrc = null;
                    imageSrc = room.getAvatarUrl(mx.baseUrl, 96, 96, 'crop', false) || null;
                    return (
                        <RoomSelector
                            key={room.roomId}
                            name={room.name}
                            roomId={room.roomId}
                            imageSrc={imageSrc}
                            isUnread={roomToUnread.has(room.roomId)}
                            notificationCount={roomToUnread.get(room.roomId)?.total ?? 0}
                            isAlert={(roomToUnread.get(room.roomId)?.highlight || 0) > 0}
                            onClick={() => navigateRoom(room.roomId)}
                        />
                    );
                })
            }
            {/* <div
                style={{
                    position: 'relative',
                    height: virtualizer.getTotalSize(),
                }}
            >
                {virtualizer.getVirtualItems()
                    .map((vItem) => {
                        const room = rooms[vItem.index];
                        const roomId = room.roomId;
                        if (!room) return null;

                        return (
                            <VirtualTile
                                virtualItem={vItem}
                                key={vItem.index}
                                ref={virtualizer.measureElement}
                            >
                                <RoomNavItem
                                    room={room}
                                    showAvatar={true}
                                    linkPath={getHomeRoomPath(getCanonicalAliasOrRoomId(mx, roomId))}
                                    muted={mutedRooms.includes(roomId)}
                                    selected={false}
                                />
                            </VirtualTile>
                        );
                    })}
            </div> */}
        </Box>
    );
}

export default function SearchTab() {
    const mx = useMatrixClient();
    const [result, setResult] = useState();
    const [tabIndex, setTabIndex] = useState(0);
    const [navHidden, setNavHidden] = useNavHidden();
    const [query, setQuery] = useState('');
    const [rooms, setRooms] = useState<Room[]>([]);
    const searchRef = useRef<HTMLInputElement>(null);

    const handleTabChange = (evt: SyntheticEvent, v: any) => {
        setTabIndex(v);
    };

    const handleSearch = () => {
        setQuery(searchRef.current?.value || '');
        if (tabIndex === 0) {
            if (query.length > 0) {
                setRooms(searchRoom(mx, query));
            } else {
                setRooms([]);
            }
        }
    };

    return (
        <PageNav>
            <AppBar color='inherit' enableColorOnDark position='static'>
                <Toolbar style={{ paddingLeft: 8, paddingRight: 8 }} variant='regular'>
                    <IconButton
                        size='large'
                        color='inherit'
                        onClick={() => setNavHidden(!navHidden)}
                    >
                        {navHidden ? <MenuIcon /> : <MenuOpen />}
                    </IconButton>
                    <SearchBar doNotNavigate onChange={handleSearch} onKeyUp={handleSearch} inputRef={searchRef} autoFocus />
                    <IconButton
                        size='large'
                        color='inherit'
                        onClick={() => history.back()}
                    >
                        <Close />
                    </IconButton>
                </Toolbar>
            </AppBar>
            <PageNavContent>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={tabIndex} onChange={handleTabChange}>
                        <Tab label={getText('search.tab.chats')} {...a11yProps(0)} />
                        <Tab label={getText('search.tab.messages')} {...a11yProps(1)} />
                        <Tab label={getText('search.tab.users')} {...a11yProps(2)} />
                    </Tabs>
                </Box>
                <div
                    role="tabpanel"
                    hidden={tabIndex !== 0}
                    id={`simple-tabpanel-0`}
                    aria-labelledby={`simple-tab-0`}
                >
                    {tabIndex === 0 && (
                        <Box>
                            <SearchRooms rooms={rooms} />
                        </Box>
                    )}
                </div>
                <div
                    role="tabpanel"
                    hidden={tabIndex !== 1}
                    id={`simple-tabpanel-1`}
                    aria-labelledby={`simple-tab-1`}
                >
                    {tabIndex === 1 && (
                        <Box>
                            messages
                        </Box>
                    )}
                </div>
                <div
                    role="tabpanel"
                    hidden={tabIndex !== 2}
                    id={`simple-tabpanel-2`}
                    aria-labelledby={`simple-tab-2`}
                >
                    {tabIndex === 2 && (
                        <Box>
                            users
                        </Box>
                    )}
                </div>
            </PageNavContent>
        </PageNav>
    );
}