import React, { RefObject, useEffect, useMemo, useRef } from 'react';
import { Text, Box, config, toRem } from 'folds';
import { useAtomValue } from 'jotai';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { SearchOrderBy } from 'matrix-js-sdk';
import { Alert, CircularProgress, Divider, Fab, LinearProgress, Paper } from '@mui/material';
import { KeyboardArrowUp } from '@mui/icons-material';
import { PageHero, PageHeroSection } from '../../components/page';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { _SearchPathSearchParams } from '../../pages/paths';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { ScrollTopContainer } from '../../components/scroll-top-container';
import { ContainerColor } from '../../styles/ContainerColor.css';
import { decodeSearchParamValueArray, encodeSearchParamValueArray } from '../../pages/pathUtils';
import { useRooms } from '../../state/hooks/roomList';
import { allRoomsAtom } from '../../state/room-list/roomList';
import { mDirectAtom } from '../../state/mDirectList';
import { MessageSearchParams, useMessageSearch } from './useMessageSearch';
import { SearchResultGroup } from './SearchResultGroup';
import { SearchInput } from './SearchInput';
import { SearchFilters } from './SearchFilters';
import { VirtualTile } from '../../components/virtualizer';
import { getText, translate } from '../../../lang';
import { SearchIcon } from '../../atoms/search/Search';

const useSearchPathSearchParams = (searchParams: URLSearchParams): _SearchPathSearchParams =>
	useMemo(
		() => ({
			global: searchParams.get('global') ?? undefined,
			term: searchParams.get('term') ?? undefined,
			order: searchParams.get('order') ?? undefined,
			rooms: searchParams.get('rooms') ?? undefined,
			senders: searchParams.get('senders') ?? undefined,
		}),
		[searchParams]
	);

type MessageSearchProps = {
	defaultRoomsFilterName: string;
	allowGlobal?: boolean;
	rooms: string[];
	senders?: string[];
	scrollRef: RefObject<HTMLDivElement>;
	searchRef?: RefObject<HTMLInputElement>;
	mSearchParams?: MessageSearchParams;
};
export function MessageSearch({
	defaultRoomsFilterName,
	allowGlobal,
	rooms,
	senders,
	scrollRef,
	searchRef,
	mSearchParams
}: MessageSearchProps) {
	const mx = useMatrixClient();
	const mDirects = useAtomValue(mDirectAtom);
	const allRooms = useRooms(mx, allRoomsAtom, mDirects);
	const [mediaAutoLoad] = useSetting(settingsAtom, 'mediaAutoLoad');
	const [urlPreview] = useSetting(settingsAtom, 'urlPreview');
	// Насрать пока что
	// eslint-disable-next-line react-hooks/rules-of-hooks
	const searchInputRef = searchRef || useRef<HTMLInputElement>(null);
	const scrollTopAnchorRef = useRef<HTMLDivElement>(null);
	const [searchParams, setSearchParams] = useSearchParams();
	const searchPathSearchParams = useSearchPathSearchParams(searchParams);
	const { navigateRoom } = useRoomNavigate();

	const searchParamRooms = useMemo(() => {
		if (searchPathSearchParams.rooms) {
			const joinedRoomIds = decodeSearchParamValueArray(searchPathSearchParams.rooms).filter(
				(rId) => allRooms.includes(rId)
			);
			return joinedRoomIds;
		}
		return undefined;
	}, [allRooms, searchPathSearchParams.rooms]);
	const searchParamsSenders = useMemo(() => {
		if (searchPathSearchParams.senders) {
			return decodeSearchParamValueArray(searchPathSearchParams.senders);
		}
		return undefined;
	}, [searchPathSearchParams.senders]);

	const msgSearchParams: MessageSearchParams = useMemo(() => {
		const isGlobal = searchPathSearchParams.global === 'true';
		const defaultRooms = isGlobal ? undefined : rooms;

		return {
			term: mSearchParams?.term ?? searchPathSearchParams.term,
			order: searchPathSearchParams.order ?? mSearchParams?.order ?? SearchOrderBy.Recent,
			rooms: searchParamRooms ?? mSearchParams?.rooms ?? defaultRooms,
			senders: searchParamsSenders ?? mSearchParams?.senders ?? senders,
		};
	}, [searchPathSearchParams, searchParamRooms, searchParamsSenders, rooms, senders, mSearchParams]);

	const searchMessages = useMessageSearch(msgSearchParams);

	const { status, data, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
		enabled: !!msgSearchParams.term,
		queryKey: [
			'search',
			msgSearchParams.term,
			msgSearchParams.order,
			msgSearchParams.rooms,
			msgSearchParams.senders,
		],
		queryFn: ({ pageParam }) => searchMessages(pageParam),
		initialPageParam: '',
		getNextPageParam: (lastPage) => lastPage.nextToken,
	});

	const groups = useMemo(() => data?.pages.flatMap((result) => result.groups) ?? [], [data]);
	const highlights = useMemo(() => {
		const mixed = data?.pages.flatMap((result) => result.highlights);
		return Array.from(new Set(mixed));
	}, [data]);

	const virtualizer = useVirtualizer({
		count: groups.length,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => 40,
		overscan: 1,
	});
	const vItems = virtualizer.getVirtualItems();

	const handleSearch = (term: string) => {
		setSearchParams((prevParams) => {
			const newParams = new URLSearchParams(prevParams);
			newParams.delete('term');
			newParams.append('term', term);
			return newParams;
		});
	};
	const handleSearchClear = () => {
		if (searchInputRef.current) {
			searchInputRef.current.value = '';
		}
		setSearchParams((prevParams) => {
			const newParams = new URLSearchParams(prevParams);
			newParams.delete('term');
			return newParams;
		});
	};

	const handleSelectedRoomsChange = (selectedRooms?: string[]) => {
		setSearchParams((prevParams) => {
			const newParams = new URLSearchParams(prevParams);
			newParams.delete('rooms');
			if (selectedRooms && selectedRooms.length > 0) {
				newParams.append('rooms', encodeSearchParamValueArray(selectedRooms));
			}
			return newParams;
		});
	};
	const handleGlobalChange = (global?: boolean) => {
		setSearchParams((prevParams) => {
			const newParams = new URLSearchParams(prevParams);
			newParams.delete('global');
			if (global) {
				newParams.append('global', 'true');
			}
			return newParams;
		});
	};

	const handleOrderChange = (order?: string) => {
		setSearchParams((prevParams) => {
			const newParams = new URLSearchParams(prevParams);
			newParams.delete('order');
			if (order) {
				newParams.append('order', order);
			}
			return newParams;
		});
	};

	const lastVItem = vItems[vItems.length - 1];
	const lastVItemIndex: number | undefined = lastVItem?.index;
	const lastGroupIndex = groups.length - 1;
	useEffect(() => {
		if (
			lastGroupIndex > -1 &&
			lastGroupIndex === lastVItemIndex &&
			!isFetchingNextPage &&
			hasNextPage
		) {
			fetchNextPage();
		}
	}, [lastVItemIndex, lastGroupIndex, fetchNextPage, isFetchingNextPage, hasNextPage]);

	return (
		<Box direction="Column" gap="700">
			<ScrollTopContainer scrollRef={scrollRef} anchorRef={scrollTopAnchorRef}>
				<Fab size='small' onClick={() => virtualizer.scrollToOffset(0)} aria-label={getText('scroll_to_top')}>
					<KeyboardArrowUp />
				</Fab>
			</ScrollTopContainer>
			<Box ref={scrollTopAnchorRef} direction="Column" gap="300">
				{!searchRef && (
					<SearchInput
						active={!!msgSearchParams.term}
						loading={status === 'pending'}
						searchInputRef={searchInputRef}
						onSearch={handleSearch}
						onReset={handleSearchClear}
					/>
				)}
				<SearchFilters
					defaultRoomsFilterName={defaultRoomsFilterName}
					allowGlobal={allowGlobal}
					roomList={searchPathSearchParams.global === 'true' ? allRooms : rooms}
					selectedRooms={searchParamRooms}
					onSelectedRoomsChange={handleSelectedRoomsChange}
					global={searchPathSearchParams.global === 'true'}
					onGlobalChange={handleGlobalChange}
					order={msgSearchParams.order}
					onOrderChange={handleOrderChange}
				/>
			</Box>

			{!msgSearchParams.term && status === 'pending' && (
				<Paper
					sx={{
						padding: config.space.S400,
						borderRadius: config.radii.R400,
						minHeight: toRem(450),
						alignItems: 'center',
						justifyContent: 'center',
						display: 'flex',
						flexDirection: 'column'
					}}
				>
					<PageHeroSection>
						<PageHero
							icon={<SearchIcon />}
							title={getText('msg_search.title.2')}
							subTitle={getText('msg_search.subtitle.2')}
						/>
					</PageHeroSection>
				</Paper>
			)}

			{msgSearchParams.term && groups.length === 0 && status === 'success' && (
				<Alert severity='warning'>
					{translate('generic.no_results', <b>{`"${msgSearchParams.term}"`}</b>)}
				</Alert>
			)}

			{((msgSearchParams.term && status === 'pending') ||
				(groups.length > 0 && vItems.length === 0)) && (
					<LinearProgress />
				)}

			{vItems.length > 0 && (
				<Box direction="Column" gap="300">
					<Box direction="Column" gap="200">
						<Text size="H5">{getText('generic.results', msgSearchParams.term)}</Text>
						<Divider />
					</Box>
					<div
						style={{
							position: 'relative',
							height: virtualizer.getTotalSize(),
						}}
					>
						{vItems.map((vItem) => {
							const group = groups[vItem.index];
							if (!group) return null;
							const groupRoom = mx.getRoom(group.roomId);
							if (!groupRoom) return null;

							return (
								<VirtualTile
									virtualItem={vItem}
									style={{ paddingBottom: config.space.S500 }}
									ref={virtualizer.measureElement}
									key={vItem.index}
								>
									<SearchResultGroup
										room={groupRoom}
										highlights={highlights}
										items={group.items}
										mediaAutoLoad={mediaAutoLoad}
										urlPreview={urlPreview}
										onOpen={navigateRoom}
									/>
								</VirtualTile>
							);
						})}
					</div>
					{isFetchingNextPage && (
						<Box justifyContent="Center" alignItems="Center">
							<CircularProgress />
						</Box>
					)}
				</Box>
			)}

			{error && (
				<Box
					className={ContainerColor({ variant: 'error' })}
					style={{
						padding: config.space.S300,
						borderRadius: config.radii.R400,
					}}
					direction="Column"
					gap="200"
				>
					<Text size="L400">{error.name}</Text>
					<Text size="T300">{error.message}</Text>
				</Box>
			)}
		</Box>
	);
}
