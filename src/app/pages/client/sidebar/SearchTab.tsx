import React, { KeyboardEventHandler, RefObject, SyntheticEvent, useEffect, useRef, useState } from 'react';
import { PageNav, PageNavContent } from '../../../components/page';
import { AppBar, Box, CircularProgress, IconButton, LinearProgress, Tab, Tabs, Toolbar, useTheme } from '@mui/material';
import { useNavHidden } from '../../../hooks/useHideableNav';
import { MenuOpen, Menu as MenuIcon, Close, Message as MessageIcon } from '@mui/icons-material';
import SearchBar from '../SearchBar';
import { getText } from '../../../../lang';
import { MatrixEvent, Room } from 'matrix-js-sdk';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useRoomNavigate } from '../../../hooks/useRoomNavigate';
import { getDMRoomFor, mxcUrlToHttp, searchRoom } from '../../../utils/matrix';
import { useAtomValue } from 'jotai';
import { muteChangesAtom } from '../../../state/room-list/mutedRoomList';
import { roomToUnreadAtom } from '../../../state/room/roomToUnread';
import RoomSelector from '../../../molecules/room-selector/RoomSelector';
import RoomTile from '../../../molecules/room-tile/RoomTile';

import * as roomActions from '../../../../client/action/room';
import { hasDevices } from '../../../../util/matrixUtil';
import { MessageSearch } from '../../../features/message-search';
import { useRooms } from '../../../state/hooks/roomList';
import { mDirectAtom } from '../../../state/mDirectList';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { useForceUpdate } from '../../../hooks/useForceUpdate';

type UserProfile = {
    user_id: string;
    display_name?: string;
    avatar_url?: string;
};

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
        </Box>
    );
}

function SearchUsers({ users }: { users: UserProfile[] }) {
    const mx = useMatrixClient();
    const theme = useTheme();

    const { navigateRoom } = useRoomNavigate();
    const [procUsers, updateProcUsers] = useState(new Set<string>());

    function addUserToProc(userId: string) {
        procUsers.add(userId);
        updateProcUsers(new Set(Array.from(procUsers)));
    }

    function deleteUserFromProc(userId: string) {
        procUsers.delete(userId);
        updateProcUsers(new Set(Array.from(procUsers)));
    }

    const createDM = async (userId: string) => {
        if (mx.getUserId()! === userId) return;
        const room = getDMRoomFor(mx, userId);
        if (room) {
            navigateRoom(room.roomId);
            return;
        }
        addUserToProc(userId);
        const newRoom = await roomActions.createDM(userId, await hasDevices(userId));
        deleteUserFromProc(userId);

        navigateRoom(newRoom.room_id);
    };

    const renderOptions = (userId: string) => {
        return procUsers.has(userId) ? (
            <CircularProgress />
        ) : (
            <IconButton
                onClick={() => createDM(userId)}
            >
                <MessageIcon />
            </IconButton>
        );
    };

    return (
        <Box display='flex' flexDirection='column' gap={theme.spacing(1)}>
            {users.map((user) => {
                const userId = user.user_id;
                const name = typeof user.display_name === 'string' ? user.display_name : userId;
                return (
                    <RoomTile
                        key={userId}
                        avatarSrc={
                            typeof user.avatar_url === 'string'
                                ? mxcUrlToHttp(mx, user.avatar_url, 42, 42, 'crop')
                                : null
                        }
                        name={name}
                        id={userId}
                        options={renderOptions(userId)}
                    //desc={renderError(userId)}
                    />
                );
            })}
        </Box>
    );
}

function SearchMessages({ searchRef, term }: { searchRef: RefObject<HTMLInputElement>, term: string }) {
    const mx = useMatrixClient();
    const mDirects = useAtomValue(mDirectAtom);
    const theme = useTheme();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [, forceUpdate] = useForceUpdate();

    const rooms = useRooms(mx, allRoomsAtom, mDirects);

    useEffect(() => {
        forceUpdate();
        console.log(`!!! new term ${term} updating`);
    }, [term]);

    return (
        <Box ref={scrollRef} display='flex' flexDirection='column' gap={theme.spacing(1)}>
            <MessageSearch
                scrollRef={scrollRef}
                rooms={rooms}
                allowGlobal
                defaultRoomsFilterName='Home'
                searchRef={searchRef}
                mSearchParams={{
                    term
                }}
            />
        </Box>
    );
}

export default function SearchTab() {
    const mx = useMatrixClient();
    const [tabIndex, setTabIndex] = useState(0);
    const [navHidden, setNavHidden] = useNavHidden();
    const [query, setQuery] = useState('');
    const [rooms, setRooms] = useState<Room[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);

    const theme = useTheme();

    const handleTabChange = (evt: SyntheticEvent, v: any) => {
        setTabIndex(v);
    };

    const search = async () => {
        const isInputUserId = query[0] === '@' && query.indexOf(':') > 1;
        const isInputRoomAlias = query[0] === '#' && query.indexOf(':') > 1;

        setLoading(true);
        if (tabIndex === 0) {
            if (query.length > 0) {
                setRooms(searchRoom(mx, query));
            } else {
                setRooms([]);
            }
        } else if (tabIndex === 2) {
            if (query.length > 0) {
                if (isInputUserId) {
                    const profile = await mx.getProfileInfo(query);
                    setUsers([
                        {
                            user_id: query,
                            avatar_url: profile.avatar_url,
                            display_name: profile.displayname
                        }
                    ]);
                } else {
                    const { results } = await mx.searchUserDirectory({
                        term: query,
                        limit: 20
                    });
                    setUsers(results);
                }
            } else {
                setUsers([]);
            }
        }
        setLoading(false);
    };

    const handleChange = async () => {
        const value = `${searchRef.current?.value}` || '';

        if (tabIndex === 0) {
            setQuery(value);
            search();
        }
    };

    const handleKeyUp: KeyboardEventHandler<HTMLInputElement> = (evt) => {
        const value = `${searchRef.current?.value}` || '';
        if (evt.key === 'Enter') {
            evt.preventDefault();
            setQuery(value);
            search();
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
                    <SearchBar doNotNavigate onChange={handleChange} onKeyUp={handleKeyUp} inputRef={searchRef} autoFocus />
                    <IconButton
                        size='large'
                        color='inherit'
                        onClick={() => history.back()}
                    >
                        <Close />
                    </IconButton>
                </Toolbar>
                <Tabs variant='fullWidth' value={tabIndex} onChange={handleTabChange}>
                    <Tab label={getText('search.tab.chats')} {...a11yProps(0)} />
                    <Tab label={getText('search.tab.messages')} {...a11yProps(1)} />
                    <Tab label={getText('search.tab.users')} {...a11yProps(2)} />
                </Tabs>
            </AppBar>
            <PageNavContent>
                {loading ? (
                    <LinearProgress />
                ) : (
                    <>
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
                                    <SearchMessages term={query} searchRef={searchRef} />
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
                                    <SearchUsers users={users} />
                                </Box>
                            )}
                        </div>
                    </>
                )}
            </PageNavContent>
        </PageNav>
    );
}