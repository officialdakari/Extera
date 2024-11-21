import React, {
    FormEventHandler,
    MouseEventHandler,
    RefObject,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Icon as MDIcon } from '@mdi/react';
import {
    Box,
    Scroll,
    Text,
    config,
    toRem,
} from 'folds';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import FocusTrap from 'focus-trap-react';
import { useAtomValue } from 'jotai';
import { useQuery } from '@tanstack/react-query';
import { JoinRule, MatrixClient, Method, RoomType } from 'matrix-js-sdk';
import { Page, PageContent, PageContentCenter, PageHeader } from '../../../components/page';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { RoomTopicViewer } from '../../../components/room-topic-viewer';
import { RoomCard, RoomCardBase, RoomCardGrid } from '../../../components/room-card';
import { ExploreServerPathSearchParams } from '../../paths';
import { getExploreServerPath, withSearchParam } from '../../pathUtils';
import * as css from './style.css';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { useRoomNavigate } from '../../../hooks/useRoomNavigate';
import { getMxIdServer } from '../../../utils/matrix';
import { getText } from '../../../../lang';
import { mdiAlertCircleOutline, mdiArrowLeft, mdiCheck, mdiChevronDown, mdiClose, mdiMagnify, mdiServer, mdiServerNetwork, mdiShape } from '@mdi/js';
import { SearchContainer, SearchIcon, SearchIconWrapper, SearchInputBase } from '../../../atoms/search/Search';
import { Alert, AppBar, Button, Chip, Divider, Grid2, ListSubheader, Menu, MenuItem, Toolbar, Typography } from '@mui/material';
import { Check, KeyboardArrowDown } from '@mui/icons-material';

const useServerSearchParams = (searchParams: URLSearchParams): ExploreServerPathSearchParams =>
    useMemo(
        () => ({
            limit: searchParams.get('limit') ?? undefined,
            since: searchParams.get('since') ?? undefined,
            term: searchParams.get('term') ?? undefined,
            type: searchParams.get('type') ?? undefined,
            instance: searchParams.get('instance') ?? undefined,
        }),
        [searchParams]
    );

type RoomTypeFilter = {
    title: string;
    value: string | undefined;
};
const useRoomTypeFilters = (): RoomTypeFilter[] =>
    useMemo(
        () => [
            {
                title: getText('explore.server.room_type_filter.all'),
                value: undefined,
            },
            {
                title: getText('explore.server.room_type_filter.spaces'),
                value: RoomType.Space,
            },
            {
                title: getText('explore.server.room_type_filter.rooms'),
                value: 'null',
            },
        ],
        []
    );

const FALLBACK_ROOMS_LIMIT = 24;

type SearchProps = {
    active?: boolean;
    loading?: boolean;
    searchInputRef: RefObject<HTMLInputElement>;
    onSearch: (term: string) => void;
    onReset: () => void;
};
function Search({ active, loading, searchInputRef, onSearch, onReset }: SearchProps) {
    const handleSearchSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
        evt.preventDefault();
        const { searchInput } = evt.target as HTMLFormElement & {
            searchInput: HTMLInputElement;
        };

        const searchTerm = searchInput.value.trim() || undefined;
        if (searchTerm) {
            onSearch(searchTerm);
        }
    };

    return (
        <Box as="form" direction="Column" gap="100" onSubmit={handleSearchSubmit}>
            <span data-spacing-node />
            <Text size="L400">{getText('explore.server.search')}</Text>
            <SearchContainer>
                <SearchIconWrapper>
                    <SearchIcon />
                </SearchIconWrapper>
                <SearchInputBase
                    inputRef={searchInputRef}
                    name='searchInput'
                    placeholder={getText('placeholder.explore.server.search')}
                    disabled={active && loading}
                />
            </SearchContainer>
        </Box>
    );
}

const DEFAULT_INSTANCE_NAME = 'Matrix';
function ThirdPartyProtocolsSelector({
    instanceId,
    onChange,
}: {
    instanceId?: string;
    onChange: (instanceId?: string) => void;
}) {
    const mx = useMatrixClient();
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement>();

    const { data } = useQuery({
        queryKey: ['thirdparty', 'protocols'],
        queryFn: () => mx.getThirdpartyProtocols(),
    });

    const handleInstanceSelect: MouseEventHandler<HTMLLIElement> = (evt): void => {
        const insId = evt.currentTarget.getAttribute('data-instance-id') ?? undefined;
        onChange(insId);
        setMenuAnchor(undefined);
    };

    const handleOpenMenu: MouseEventHandler<HTMLElement> = (evt) => {
        setMenuAnchor(evt.currentTarget);
    };

    const instances = data && Object.keys(data).flatMap((protocol) => data[protocol].instances);
    if (!instances || instances.length === 0) return null;
    const selectedInstance = instances.find((instance) => instanceId === instance.instance_id);

    return (
        <>
            <Menu open={!!menuAnchor} anchorEl={menuAnchor} onClose={() => setMenuAnchor(undefined)}>
                <MenuItem selected={instanceId === undefined} onClick={handleInstanceSelect}>
                    {DEFAULT_INSTANCE_NAME}
                </MenuItem>
                {instances.map((instance) => (
                    <MenuItem
                        key={instance.instance_id}
                        selected={instanceId === instance.instance_id}
                        onClick={handleInstanceSelect}
                    >
                        {instance.desc}
                    </MenuItem>
                ))}
            </Menu>
            <Chip
                label={selectedInstance?.desc || DEFAULT_INSTANCE_NAME}
                onClick={handleOpenMenu}
                aria-pressed={!!menuAnchor}
                icon={<KeyboardArrowDown />}
            />
        </>
    );
}

// type LimitButtonProps = {
//     limit: number;
//     onLimitChange: (limit: string) => void;
// };
// function LimitButton({ limit, onLimitChange }: LimitButtonProps) {
//     const [menuAnchor, setMenuAnchor] = useState<DOMRect>();

//     const handleLimitSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
//         evt.preventDefault();
//         const limitInput = evt.currentTarget.limitInput as HTMLInputElement;
//         if (!limitInput) return;
//         const newLimit = limitInput.value.trim();
//         if (!newLimit) return;
//         onLimitChange(newLimit);
//     };

//     const setLimit = (l: string) => {
//         setMenuAnchor(undefined);
//         onLimitChange(l);
//     };
//     const handleOpenMenu: MouseEventHandler<HTMLElement> = (evt) => {
//         setMenuAnchor(evt.currentTarget.getBoundingClientRect());
//     };

//     return (
//         <PopOut
//             anchor={menuAnchor}
//             align="End"
//             position="Bottom"
//             content={
//                 <FocusTrap
//                     focusTrapOptions={{
//                         initialFocus: false,
//                         onDeactivate: () => setMenuAnchor(undefined),
//                         clickOutsideDeactivates: true,
//                     }}
//                 >
//                     <Menu variant="Surface">
//                         <Box direction="Column" gap="400" style={{ padding: config.space.S300 }}>
//                             <Box direction="Column" gap="100">
//                                 <Text size="L400">{getText('presets')}</Text>
//                                 <Box gap="100" wrap="Wrap">
//                                     <Chip variant="SurfaceVariant" onClick={() => setLimit('24')} radii="Pill">
//                                         <Text size="T200">24</Text>
//                                     </Chip>
//                                     <Chip variant="SurfaceVariant" onClick={() => setLimit('48')} radii="Pill">
//                                         <Text size="T200">48</Text>
//                                     </Chip>
//                                     <Chip variant="SurfaceVariant" onClick={() => setLimit('96')} radii="Pill">
//                                         <Text size="T200">96</Text>
//                                     </Chip>
//                                 </Box>
//                             </Box>
//                             <Box as="form" onSubmit={handleLimitSubmit} direction="Column" gap="300">
//                                 <Box direction="Column" gap="100">
//                                     <Text size="L400">{getText('count.custom_limit')}</Text>
//                                     <Input
//                                         name="limitInput"
//                                         size="300"
//                                         variant="Background"
//                                         defaultValue={limit}
//                                         min={1}
//                                         step={1}
//                                         outlined
//                                         type="number"
//                                         radii="400"
//                                         aria-label={getText('aria.per_page_item_limit')}
//                                     />
//                                 </Box>
//                                 <Button type="submit" size="300" variant="Primary" radii="400">
//                                     <Text size="B300">{getText('count.set_limit')}</Text>
//                                 </Button>
//                             </Box>
//                         </Box>
//                     </Menu>
//                 </FocusTrap>
//             }
//         >
//             <Chip
//                 onClick={handleOpenMenu}
//                 aria-pressed={!!menuAnchor}
//                 radii="Pill"
//                 size="400"
//                 variant="SurfaceVariant"
//                 after={<MDIcon size={1} path={mdiChevronDown} />}
//             >
//                 <Text size="T200" truncate>{getText('count.page_limit', limit)}</Text>
//             </Chip>
//         </PopOut>
//     );
// }

export function PublicRooms() {
    const { server } = useParams();
    const mx = useMatrixClient();
    const userId = mx.getUserId();
    const userServer = userId && getMxIdServer(userId);
    const allRooms = useAtomValue(allRoomsAtom);
    const { navigateSpace, navigateRoom } = useRoomNavigate();

    const [searchParams] = useSearchParams();
    const serverSearchParams = useServerSearchParams(searchParams);
    const isSearch = !!serverSearchParams.term;
    const scrollRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const roomTypeFilters = useRoomTypeFilters();

    const currentLimit: number = useMemo(() => {
        const limitParam = serverSearchParams.limit;
        if (!limitParam) return FALLBACK_ROOMS_LIMIT;
        return parseInt(limitParam, 10) || FALLBACK_ROOMS_LIMIT;
    }, [serverSearchParams.limit]);

    const resetScroll = useCallback(() => {
        const scroll = scrollRef.current;
        if (scroll) scroll.scrollTop = 0;
    }, []);

    const fetchPublicRooms = useCallback(() => {
        const limit =
            typeof serverSearchParams.limit === 'string'
                ? parseInt(serverSearchParams.limit, 10)
                : FALLBACK_ROOMS_LIMIT;
        const roomType: string | null | undefined =
            serverSearchParams.type === 'null' ? null : serverSearchParams.type;

        return mx.http.authedRequest<Awaited<ReturnType<MatrixClient['publicRooms']>>>(
            Method.Post,
            '/publicRooms',
            {
                server,
            },
            {
                limit,
                since: serverSearchParams.since,
                filter: {
                    generic_search_term: serverSearchParams.term,
                    room_types: roomType !== undefined ? [roomType] : undefined,
                },
                third_party_instance_id: serverSearchParams.instance,
            }
        );
    }, [mx, server, serverSearchParams]);

    const { data, isLoading, error } = useQuery({
        queryKey: [
            server,
            'publicRooms',
            serverSearchParams.limit,
            serverSearchParams.since,
            serverSearchParams.term,
            serverSearchParams.type,
            serverSearchParams.instance,
        ],
        queryFn: fetchPublicRooms,
    });

    useEffect(() => {
        if (isLoading) resetScroll();
    }, [isLoading, resetScroll]);

    const explore = (newSearchParams: ExploreServerPathSearchParams) => {
        if (!server) return;

        const sParams: Record<string, string> = {
            ...serverSearchParams,
            ...newSearchParams,
        };
        Object.keys(sParams).forEach((key) => {
            if (sParams[key] === undefined) delete sParams[key];
        });
        const path = withSearchParam(getExploreServerPath(server), sParams);
        navigate(path);
    };

    const paginateBack = () => {
        const token = data?.prev_batch;
        explore({ since: token });
    };

    const paginateFront = () => {
        const token = data?.next_batch;
        explore({ since: token });
    };

    const handleSearch = (term: string) => {
        explore({
            term,
            since: undefined,
        });
    };

    const handleSearchClear = () => {
        if (searchInputRef.current) {
            searchInputRef.current.value = '';
        }
        explore({
            term: undefined,
            since: undefined,
        });
    };

    const handleRoomFilterClick: MouseEventHandler<HTMLElement> = (evt) => {
        const filter = evt.currentTarget.getAttribute('data-room-filter');
        explore({
            type: filter ?? undefined,
            since: undefined,
        });
    };

    const handleInstanceIdChange = (instanceId?: string) => {
        explore({ instance: instanceId, since: undefined });
    };

    return (
        <Page>
            <AppBar position='static'>
                <Toolbar>
                    {isSearch ? (
                        <>
                            <Box grow="Yes" basis="No">
                                <Chip
                                    label={server}
                                    icon={<MDIcon size={1} path={mdiArrowLeft} />}
                                    onClick={handleSearchClear}
                                />
                            </Box>

                            <Box grow="No" justifyContent="Center" alignItems="Center" gap="200">
                                <MDIcon size={1} path={mdiMagnify} />
                                <Typography variant='h6'>
                                    {getText('explore.server.search')}
                                </Typography>
                            </Box>
                            <Box grow="Yes" />
                        </>
                    ) : (
                        <Box grow="Yes" justifyContent="Center" alignItems="Center" gap="200">
                            <MDIcon size={1} path={mdiServerNetwork} />
                            <Typography variant='h6'>
                                {server}
                            </Typography>
                        </Box>
                    )}
                </Toolbar>
            </AppBar>
            <Box grow="Yes">
                <Scroll ref={scrollRef} hideTrack visibility="Hover">
                    <PageContent>
                        <PageContentCenter>
                            <Box direction="Column" gap="600">
                                <Search
                                    key={server}
                                    active={isSearch}
                                    loading={isLoading}
                                    searchInputRef={searchInputRef}
                                    onSearch={handleSearch}
                                    onReset={handleSearchClear}
                                />
                                <Box direction="Column" gap="400">
                                    <Box direction="Column" gap="300">
                                        {isSearch ? (
                                            <Text size="H4">{getText('search.results', serverSearchParams.term)}</Text>
                                        ) : (
                                            <Text size="H4">{getText('explore.popular_communities')}</Text>
                                        )}
                                        <Box gap="200">
                                            {roomTypeFilters.map((filter) => (
                                                <Chip
                                                    key={filter.title}
                                                    onClick={handleRoomFilterClick}
                                                    data-room-filter={filter.value}
                                                    color={filter.value === serverSearchParams.type ? 'success' : 'default'}
                                                    variant='outlined'
                                                    icon={
                                                        filter.value === serverSearchParams.type ? (
                                                            <Check />
                                                        ) : undefined
                                                    }
                                                    label={filter.title}
                                                />
                                            ))}
                                            {userServer === server && (
                                                <>
                                                    <Divider orientation='vertical' />
                                                    <ThirdPartyProtocolsSelector
                                                        instanceId={serverSearchParams.instance}
                                                        onChange={handleInstanceIdChange}
                                                    />
                                                </>
                                            )}
                                        </Box>
                                    </Box>
                                    {isLoading && (
                                        <RoomCardGrid>
                                            {[...Array(currentLimit).keys()].map((item) => (
                                                <Grid2 key={item} size={{ xs: 12, sm: 12, md: 6, lg: 4 }}>
                                                    <RoomCardBase key={item} sx={{ minHeight: toRem(260) }} />
                                                </Grid2>
                                            ))}
                                        </RoomCardGrid>
                                    )}
                                    {error && (
                                        <Alert severity='error' title={error.name}>
                                            {error.message}
                                        </Alert>
                                    )}
                                    {data &&
                                        (data.chunk.length > 0 ? (
                                            <>
                                                <RoomCardGrid>
                                                    {data?.chunk.map((chunkRoom, index) => (
                                                        <Grid2 key={index} size={{ xs: 12, sm: 12, md: 6, lg: 4 }}>
                                                            <RoomCard
                                                                key={chunkRoom.room_id}
                                                                roomIdOrAlias={chunkRoom.canonical_alias ?? chunkRoom.room_id}
                                                                allRooms={allRooms}
                                                                avatarUrl={chunkRoom.avatar_url}
                                                                name={chunkRoom.name}
                                                                topic={chunkRoom.topic}
                                                                memberCount={chunkRoom.num_joined_members}
                                                                knock={chunkRoom.join_rule === JoinRule.Knock}
                                                                roomType={chunkRoom.room_type}
                                                                onView={
                                                                    chunkRoom.room_type === RoomType.Space
                                                                        ? navigateSpace
                                                                        : navigateRoom
                                                                }
                                                                renderTopicViewer={(name, topic, requestClose) => (
                                                                    <RoomTopicViewer
                                                                        name={name}
                                                                        topic={topic}
                                                                        requestClose={requestClose}
                                                                    />
                                                                )}
                                                            />
                                                        </Grid2>
                                                    ))}
                                                </RoomCardGrid>

                                                {(data.prev_batch || data.next_batch) && (
                                                    <Box justifyContent="Center" gap="200">
                                                        <Button
                                                            onClick={paginateBack}
                                                            disabled={!data.prev_batch}
                                                        >
                                                            {getText('btn.prev_page')}
                                                        </Button>
                                                        <Box data-spacing-node grow="Yes" />
                                                        <Button
                                                            onClick={paginateFront}
                                                            disabled={!data.next_batch}
                                                        >
                                                            {getText('btn.next_page')}
                                                        </Button>
                                                    </Box>
                                                )}
                                            </>
                                        ) : (
                                            <Alert severity='warning'>
                                                {getText('explore.server.no_communities')}
                                            </Alert>
                                        ))}
                                </Box>
                            </Box>
                        </PageContentCenter>
                    </PageContent>
                </Scroll>
            </Box>
        </Page>
    );
}
