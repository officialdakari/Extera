import React, {
    ChangeEventHandler,
    MouseEventHandler,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import {
    Box,
    Text,
    config,
    toRem,
    Scroll,
    RectCords,
    Avatar,
} from 'folds';
import { JoinRule, SearchOrderBy } from 'matrix-js-sdk';
import FocusTrap from 'focus-trap-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { joinRuleToIconSrc } from '../../utils/room';
import { factoryRoomIdByAtoZ } from '../../utils/sort';
import {
    SearchItemStrGetter,
    UseAsyncSearchOptions,
    useAsyncSearch,
} from '../../hooks/useAsyncSearch';
import { DebounceOptions, useDebounce } from '../../hooks/useDebounce';
import { VirtualTile } from '../../components/virtualizer';
import { getText } from '../../../lang';
import Icon from '@mdi/react';
import { mdiCheck, mdiClose, mdiMessageLockOutline, mdiMessageOutline, mdiPlusCircleOutline, mdiSort } from '@mdi/js';
import { Button, Chip, Divider, ListItemButton, ListItemIcon, ListItemText, Menu, MenuItem, Typography } from '@mui/material';
import { SearchContainer, SearchIcon, SearchIconWrapper, SearchInputBase } from '../../atoms/search/Search';
import { RoomAvatar } from '../../components/room-avatar';
import { nameInitials } from '../../utils/common';

type OrderButtonProps = {
    order?: string;
    onChange: (order?: string) => void;
};
function OrderButton({ order, onChange }: OrderButtonProps) {
    const [menuAnchor, setMenuAnchor] = useState<Element | null>(null);
    const rankOrder = order === SearchOrderBy.Rank;

    const setOrder = (o?: string) => {
        setMenuAnchor(null);
        onChange(o);
    };
    const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
        setMenuAnchor(evt.currentTarget);
    };

    return (
        <>
            <Chip
                onClick={handleOpenMenu}
                label={getText(rankOrder ? 'sort.relevance' : 'sort.recent')}
                component='button'
            />
            <Menu
                anchorEl={menuAnchor}
                open={!!menuAnchor}
            >
                <MenuItem
                    selected={!rankOrder}
                    onClick={() => setOrder()}
                >
                    <ListItemText>{getText('sort.recent')}</ListItemText>
                </MenuItem>
                <MenuItem
                    selected={rankOrder}
                    onClick={() => setOrder(SearchOrderBy.Rank)}
                >
                    <ListItemText>{getText('sort.relevance')}</ListItemText>
                </MenuItem>
            </Menu>
        </>
    );
}

const SEARCH_OPTS: UseAsyncSearchOptions = {
    limit: 20,
    matchOptions: {
        contain: true,
    },
};
const SEARCH_DEBOUNCE_OPTS: DebounceOptions = {
    wait: 200,
};

type SelectRoomButtonProps = {
    roomList: string[];
    selectedRooms?: string[];
    onChange: (rooms?: string[]) => void;
};
function SelectRoomButton({ roomList, selectedRooms, onChange }: SelectRoomButtonProps) {
    const mx = useMatrixClient();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const [localSelected, setLocalSelected] = useState(selectedRooms);

    const getRoomNameStr: SearchItemStrGetter<string> = useCallback(
        (rId) => mx.getRoom(rId)?.name ?? rId,
        [mx]
    );

    const [searchResult, _searchRoom, resetSearch] = useAsyncSearch(
        roomList,
        getRoomNameStr,
        SEARCH_OPTS
    );
    const rooms = Array.from(searchResult?.items ?? roomList).sort(factoryRoomIdByAtoZ(mx));

    const virtualizer = useVirtualizer({
        count: rooms.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => 32,
        overscan: 5,
    });
    const vItems = virtualizer.getVirtualItems();

    const searchRoom = useDebounce(_searchRoom, SEARCH_DEBOUNCE_OPTS);
    const handleSearchChange: ChangeEventHandler<HTMLInputElement> = (evt) => {
        const value = evt.currentTarget.value.trim();
        if (!value) {
            resetSearch();
            return;
        }
        searchRoom(value);
    };

    const handleRoomClick: MouseEventHandler<HTMLButtonElement> = (evt) => {
        const roomId = evt.currentTarget.getAttribute('data-room-id');
        if (!roomId) return;
        if (localSelected?.includes(roomId)) {
            setLocalSelected(localSelected?.filter((rId) => rId !== roomId));
            return;
        }
        const addedRooms = [...(localSelected ?? [])];
        addedRooms.push(roomId);
        setLocalSelected(addedRooms);
    };

    const handleSave = () => {
        setMenuAnchor(null);
        onChange(localSelected);
    };

    const handleDeselectAll = () => {
        setMenuAnchor(null);
        onChange(undefined);
    };

    useEffect(() => {
        setLocalSelected(selectedRooms);
        resetSearch();
    }, [menuAnchor, selectedRooms, resetSearch]);

    const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
        setMenuAnchor(evt.currentTarget);
    };

    return (
        <>
            <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
                <SearchContainer>
                    <SearchIconWrapper>
                        <SearchIcon />
                    </SearchIconWrapper>
                    <SearchInputBase
                        placeholder={getText('search')}
                        onChange={handleSearchChange}
                    />
                </SearchContainer>
                <Divider />
                <Scroll ref={scrollRef} size="300" hideTrack>
                    <Box
                        direction="Column"
                        gap="100"
                        style={{
                            padding: config.space.S200,
                            paddingRight: 0,
                        }}
                    >
                        {!searchResult && <Text size="L400">{getText('rooms')}</Text>}
                        {searchResult && <Text size="L400">{getText('generic.results.room', searchResult.query)}</Text>}
                        {searchResult && searchResult.items.length === 0 && (
                            <Text style={{ padding: config.space.S400 }} size="T300" align="Center">
                                {getText('generic.no_matches')}
                            </Text>
                        )}
                        <div
                            style={{
                                position: 'relative',
                                height: virtualizer.getTotalSize(),
                            }}
                        >
                            {vItems.map((vItem) => {
                                const roomId = rooms[vItem.index];
                                const room = mx.getRoom(roomId);
                                if (!room) return null;
                                const selected = localSelected?.includes(roomId);
                                const avatarSrc = room.getAvatarUrl(mx.getHomeserverUrl(), 96, 96, 'scale', false) || undefined;

                                return (
                                    <VirtualTile
                                        virtualItem={vItem}
                                        style={{ width: '100%' }}
                                        ref={virtualizer.measureElement}
                                        key={vItem.index}
                                    >
                                        <ListItemButton
                                            data-room-id={roomId}
                                            onClick={handleRoomClick}
                                            selected={selected}
                                            component='button'
                                            sx={{ width: '100%' }}
                                        >
                                            <ListItemIcon>
                                                <Avatar size='300'>
                                                    <RoomAvatar
                                                        roomId={room.roomId}
                                                        key={room.roomId}
                                                        renderFallback={() => <Text>{nameInitials(room.name)}</Text>}
                                                        src={avatarSrc}
                                                    />
                                                </Avatar>
                                            </ListItemIcon>
                                            <ListItemText>
                                                <Typography component='div' variant='body1'>
                                                    {room.name}
                                                </Typography>
                                            </ListItemText>
                                        </ListItemButton>
                                    </VirtualTile>
                                );
                            })}
                        </div>
                    </Box>
                </Scroll>
                <Divider />
                <Box shrink="No" direction="Column" gap="100" style={{ padding: config.space.S200 }}>
                    <Button variant='contained' onClick={handleSave}>
                        {localSelected && localSelected.length > 0 ? (
                            <Text size="B300">{getText('btn.save.2', localSelected.length)}</Text>
                        ) : (
                            <Text size="B300">{getText('btn.save')}</Text>
                        )}
                    </Button>
                    <Button
                        variant='outlined'
                        onClick={handleDeselectAll}
                        disabled={!localSelected || localSelected.length === 0}
                    >
                        <Text size="B300">{getText('btn.deselect_all')}</Text>
                    </Button>
                </Box>
            </Menu>
            <Chip
                onClick={handleOpenMenu}
                label={getText('search_filters.select_rooms')}
                component='button'
            />
        </>
    );
}

type SearchFiltersProps = {
    defaultRoomsFilterName: string;
    allowGlobal?: boolean;
    roomList: string[];
    selectedRooms?: string[];
    onSelectedRoomsChange: (selectedRooms?: string[]) => void;
    global?: boolean;
    onGlobalChange: (global?: boolean) => void;
    order?: string;
    onOrderChange: (order?: string) => void;
};
export function SearchFilters({
    defaultRoomsFilterName,
    allowGlobal,
    roomList,
    selectedRooms,
    onSelectedRoomsChange,
    global,
    order,
    onGlobalChange,
    onOrderChange,
}: SearchFiltersProps) {
    const mx = useMatrixClient();

    return (
        <Box direction="Column" gap="100">
            <Box gap="200" wrap="Wrap">
                <Chip
                    variant={!global ? 'filled' : 'outlined'}
                    aria-pressed={!global}
                    onClick={() => onGlobalChange()}
                    label={defaultRoomsFilterName}
                />
                {allowGlobal && (
                    <Chip
                        variant={global ? 'filled' : 'outlined'}
                        aria-pressed={global}
                        label={getText('search_filters.global')}
                        onClick={() => onGlobalChange(true)}
                    />
                )}
                <Divider orientation='vertical' />
                {selectedRooms?.map((roomId) => {
                    const room = mx.getRoom(roomId);
                    if (!room) return null;

                    return (
                        <Chip
                            key={roomId}
                            variant="filled"
                            color='success'
                            onClick={() => onSelectedRoomsChange(selectedRooms.filter((rId) => rId !== roomId))}
                            label={room.name}
                        />
                    );
                })}
                <SelectRoomButton
                    roomList={roomList}
                    selectedRooms={selectedRooms}
                    onChange={onSelectedRoomsChange}
                />
                <Box grow="Yes" data-spacing-node />
                <OrderButton order={order} onChange={onOrderChange} />
            </Box>
        </Box>
    );
}
