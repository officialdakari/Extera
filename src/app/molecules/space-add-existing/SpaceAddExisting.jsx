import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAtomValue } from 'jotai';
import './SpaceAddExisting.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import { joinRuleToIconSrc, getIdServer, genRoomVia } from '../../../util/matrixUtil';
import { Debounce } from '../../../util/common';

import Text from '../../atoms/text/Text';

import { useStore } from '../../hooks/useStore';
import { roomToParentsAtom } from '../../state/room/roomToParents';
import { useDirects, useRooms, useSpaces } from '../../state/hooks/roomList';
import { allRoomsAtom } from '../../state/room-list/roomList';
import { mDirectAtom } from '../../state/mDirectList';
import { getText } from '../../../lang';
import { mdiClose, mdiMagnify } from '@mdi/js';
import Icon from '@mdi/react';
import { AppBar, Box, Button, Checkbox, CircularProgress, Dialog, IconButton, Toolbar, Typography, useTheme } from '@mui/material';
import { SearchContainer, SearchIcon, SearchIconWrapper, SearchInputBase } from '../../atoms/search/Search';
import RoomSelector from '../room-selector/RoomSelector';
import { Close } from '@mui/icons-material';
import { BackButtonHandler } from '../../hooks/useBackButton';
import { ScreenSize, useScreenSize } from '../../hooks/useScreenSize';

function SpaceAddExistingContent({ roomId, spaces: onlySpaces }) {
    const mountStore = useStore(roomId);
    const [debounce] = useState(new Debounce());
    const [process, setProcess] = useState(null);
    const [allRoomIds, setAllRoomIds] = useState([]);
    const [selected, setSelected] = useState([]);
    const [searchIds, setSearchIds] = useState(null);
    const mx = initMatrix.matrixClient;
    const roomIdToParents = useAtomValue(roomToParentsAtom);
    const mDirects = useAtomValue(mDirectAtom);
    const spaces = useSpaces(mx, allRoomsAtom);
    const directs = useDirects(mx, allRoomsAtom, mDirects);
    const rooms = useRooms(mx, allRoomsAtom, mDirects);

    useEffect(() => {
        const roomIds = onlySpaces ? [...spaces] : [...rooms, ...directs];
        const allIds = roomIds.filter(
            (rId) => rId !== roomId && !roomIdToParents.get(rId)?.has(roomId)
        );
        setAllRoomIds(allIds);
    }, [roomId, onlySpaces]);

    const toggleSelection = (rId) => {
        if (process !== null) return;
        const newSelected = [...selected];
        const selectedIndex = newSelected.indexOf(rId);

        if (selectedIndex > -1) {
            newSelected.splice(selectedIndex, 1);
            setSelected(newSelected);
            return;
        }
        newSelected.push(rId);
        setSelected(newSelected);
    };

    const handleAdd = async () => {
        setProcess(getText('space_add_existing.adding', selected.length));

        const promises = selected.map((rId) => {
            const room = mx.getRoom(rId);
            const via = genRoomVia(room);
            if (via.length === 0) {
                via.push(getIdServer(rId));
            }

            return mx.sendStateEvent(
                roomId,
                'm.space.child',
                {
                    auto_join: false,
                    suggested: false,
                    via,
                },
                rId
            );
        });

        mountStore.setItem(true);
        await Promise.allSettled(promises);
        if (mountStore.getItem() !== true) return;

        const roomIds = onlySpaces ? [...spaces] : [...rooms, ...directs];
        const allIds = roomIds.filter(
            (rId) => rId !== roomId && !roomIdToParents.get(rId)?.has(roomId) && !selected.includes(rId)
        );
        setAllRoomIds(allIds);
        setProcess(null);
        setSelected([]);
    };

    const handleSearch = (ev) => {
        const term = ev.target.value.toLocaleLowerCase().replace(/\s/g, '');
        if (term === '') {
            setSearchIds(null);
            return;
        }

        debounce._(() => {
            const searchedIds = allRoomIds.filter((rId) => {
                let name = mx.getRoom(rId)?.name;
                if (!name) return false;
                name = name.normalize('NFKC').toLocaleLowerCase().replace(/\s/g, '');
                return name.includes(term);
            });
            setSearchIds(searchedIds);
        }, 200)();
    };
    const handleSearchClear = (ev) => {
        const btn = ev.currentTarget;
        btn.parentElement.searchInput.value = '';
        setSearchIds(null);
    };
    const theme = useTheme();

    return (
        <Box bgcolor='background.paper'>
            <form
                onSubmit={(ev) => {
                    ev.preventDefault();
                }}
                style={{ backgroundColor: theme.palette.background.paper }}
            >
                <SearchContainer sx={{ flexGrow: 1 }}>
                    <SearchIconWrapper>
                        <SearchIcon />
                    </SearchIconWrapper>
                    <SearchInputBase
                        name='searchInput'
                        onChange={handleSearch}
                        placeholder={getText('placeholder.search_room')}
                        autoFocus
                    />
                </SearchContainer>
            </form>
            {searchIds?.length === 0 && <Typography color='error'>{getText('generic.no_results.2')}</Typography>}
            {(searchIds || allRoomIds).map((rId) => {
                const room = mx.getRoom(rId);
                let imageSrc =
                    room.getAvatarFallbackMember()?.getAvatarUrl(mx.baseUrl, 24, 24, 'crop') || null;
                if (imageSrc === null) imageSrc = room.getAvatarUrl(mx.baseUrl, 24, 24, 'crop') || null;

                const parentSet = roomIdToParents.get(rId);
                const parentNames = parentSet
                    ? [...parentSet].map((parentId) => mx.getRoom(parentId).name)
                    : undefined;
                const parents = parentNames ? parentNames.join(', ') : null;

                const handleSelect = () => toggleSelection(rId);

                return (
                    <RoomSelector
                        key={rId}
                        name={room.name}
                        parentName={parents}
                        roomId={rId}
                        imageSrc={imageSrc}
                        iconSrc={
                            mDirects.has(rId) ? null : joinRuleToIconSrc(room.getJoinRule(), room.isSpaceRoom())
                        }
                        isUnread={false}
                        notificationCount={0}
                        isAlert={false}
                        onClick={handleSelect}
                        options={
                            <Checkbox
                                checked={selected.includes(rId)}
                                onClick={handleSelect}
                                tabIndex={-1}
                                disabled={process !== null}
                            />
                        }
                    />
                );
            })}
            {selected.length !== 0 && (
                <div className="space-add-existing__footer" style={{ backgroundColor: theme.palette.background.paper }}>
                    {process && <CircularProgress />}
                    <Typography flexGrow={1}>{process || getText('space_add_existing.item_selected', selected.length)}</Typography>
                    {!process && (
                        <Button onClick={handleAdd} variant="contained">
                            {getText('btn.space_add_existing.add')}
                        </Button>
                    )}
                </div>
            )}
        </Box>
    );
}
SpaceAddExistingContent.propTypes = {
    roomId: PropTypes.string.isRequired,
    spaces: PropTypes.bool.isRequired,
};

function useVisibilityToggle() {
    const [data, setData] = useState(null);

    useEffect(() => {
        const handleOpen = (roomId, spaces) =>
            setData({
                roomId,
                spaces,
            });
        navigation.on(cons.events.navigation.SPACE_ADDEXISTING_OPENED, handleOpen);
        return () => {
            navigation.removeListener(cons.events.navigation.SPACE_ADDEXISTING_OPENED, handleOpen);
        };
    }, []);

    const requestClose = () => setData(null);

    return [data, requestClose];
}

function SpaceAddExisting() {
    const [data, requestClose] = useVisibilityToggle();
    const mx = initMatrix.matrixClient;
    const room = mx.getRoom(data?.roomId);
    const screenSize = useScreenSize();

    return (
        <Dialog
            open={!!room}
            className="space-add-existing"
            onRequestClose={requestClose}
            fullScreen={screenSize === ScreenSize.Mobile}
        >
            <BackButtonHandler callback={requestClose} id='space-add-existing' />
            <AppBar position='static'>
                <Toolbar>
                    <Typography variant='h6' component='div' flexGrow={1}>
                        {room && room.name}
                        {
                            getText(
                                'space_add_existing.tip',
                                getText(
                                    data?.spaces ?
                                        'space_add_existing.tip.spaces' :
                                        'space_add_existing.tip.rooms'
                                )
                            )
                        }
                    </Typography>
                    <IconButton onClick={requestClose}>
                        <Close />
                    </IconButton>
                </Toolbar>
            </AppBar>
            {room ? <SpaceAddExistingContent roomId={room.roomId} spaces={data.spaces} /> : <div />}
        </Dialog>
    );
}

export default SpaceAddExisting;
