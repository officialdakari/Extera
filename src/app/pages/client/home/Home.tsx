import React, { MouseEventHandler, forwardRef, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon as MDIcon } from '@mdi/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Add, ArrowForward, DoneAll, MoreVert, Menu as MenuIcon, MenuOpen } from '@mui/icons-material';
import { mdiPound } from '@mdi/js';
import { AppBar, Box, Button, IconButton, Menu, MenuItem, Typography } from 'react-you-ui';
import { factoryRoomIdByActivity } from '../../../utils/sort';
import {
	NavEmptyCenter,
	NavEmptyLayout,
} from '../../../components/nav';
import { getExplorePath, getHomeRoomPath } from '../../pathUtils';
import { getCanonicalAliasOrRoomId, getRoomTags } from '../../../utils/matrix';
import { useSelectedRoom } from '../../../hooks/router/useSelectedRoom';
import { useHomeRooms } from './useHomeRooms';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { VirtualTile } from '../../../components/virtualizer';
import { RoomNavItem } from '../../../features/room-nav';
import { roomToUnreadAtom } from '../../../state/room/roomToUnread';
import { useNavToActivePathMapper } from '../../../hooks/useNavToActivePathMapper';
import { openCreateRoom, openJoinAlias } from '../../../../client/action/navigation';
import { PageNav, PageNavContent } from '../../../components/page';
import { useRoomsUnread } from '../../../state/hooks/unread';
import { markAsRead } from '../../../../client/action/notifications';
import { getText } from '../../../../lang';
import { ScreenSize, useScreenSize } from '../../../hooks/useScreenSize';
import FAB from '../../../components/fab/FAB';
import { useNavHidden } from '../../../hooks/useHideableNav';
import SearchBar from '../SearchBar';
import SyncStateAlert from '../SyncStateAlert';
import { useSetting } from '../../../state/hooks/settings';
import { settingsAtom } from '../../../state/settings';


type HomeMenuProps = {
	requestClose: () => void;
	anchorEl: HTMLElement | null;
};

const HomeMenu = forwardRef<any, HomeMenuProps>(({ anchorEl, requestClose }, ref) => {
	const orphanRooms = useHomeRooms();
	const unread = useRoomsUnread(orphanRooms, roomToUnreadAtom);
	const [ghostMode] = useSetting(settingsAtom, 'extera_ghostMode');

	const handleMarkAsRead = () => {
		if (!unread) return;
		orphanRooms.forEach((rId) => markAsRead(rId, undefined, ghostMode));
		requestClose();
	};

	const handleNewRoom = () => {
		openCreateRoom();
		requestClose();
	};

	const handleJoin = () => {
		openJoinAlias();
		requestClose();
	};

	return (
		<Menu anchorEl={anchorEl || undefined} onClosing={requestClose} onClosed={requestClose} open={!!anchorEl} ref={ref}>
			<MenuItem
				onClick={handleMarkAsRead}
				disabled={!unread}
			>
				<DoneAll />
				<Typography>
					{getText('chats.mark_as_read')}
				</Typography>
			</MenuItem>
			<MenuItem
				onClick={handleNewRoom}
			>
				<Add />
				<Typography>{getText('home.new_room')}</Typography>
			</MenuItem>
			<MenuItem
				onClick={handleJoin}
				style={{ minHeight: 'auto' }}
			>
				<ArrowForward />
				<Typography>{getText('home.join_via_address')}</Typography>
			</MenuItem>
		</Menu>
	);
});

function HomeHeader() {
	const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
	const [navHidden, setNavHidden] = useNavHidden();

	const handleOpenMenu: MouseEventHandler = (evt) => {
		setMenuAnchor((currentState) => (currentState ? null : (evt.currentTarget as HTMLElement)));
	};

	return (
		<Box display='flex' flexGrow={0}>
			<AppBar>
				<IconButton
					onClick={() => setNavHidden(!navHidden)}
				>
					{navHidden ? <MenuIcon /> : <MenuOpen />}
				</IconButton>
				<SearchBar />
				<IconButton
					onClick={handleOpenMenu}
				>
					<MoreVert />
				</IconButton>
				<HomeMenu anchorEl={menuAnchor} requestClose={() => { setMenuAnchor(null); console.log('close') }} />
			</AppBar>
		</Box>
	);
}

function HomeEmpty() {
	const navigate = useNavigate();

	return (
		<NavEmptyCenter>
			<NavEmptyLayout
				icon={<MDIcon size={1} path={mdiPound} />}
				title={
					<Typography variant="h6" align="center">
						{getText('home.empty')}
					</Typography>
				}
				content={
					<Typography variant="span" align="center">
						{getText('home.empty.2')}
					</Typography>
				}
				options={
					<>
						<Button onClick={() => openCreateRoom()} variant="filled">
							{getText('home.empty.new')}
						</Button>
						<Button
							onClick={() => navigate(getExplorePath())}
							variant="filled-tonal"
						>
							{getText('home.empty.explore')}
						</Button>
					</>
				}
			/>
		</NavEmptyCenter>
	);
}

export function Home() {
	const mx = useMatrixClient();
	const screenSize = useScreenSize();
	useNavToActivePathMapper('home');
	const scrollRef = useRef<HTMLDivElement>(null);
	const rooms = useHomeRooms();
	// const muteChanges = useAtomValue(muteChangesAtom);
	// const mutedRooms = muteChanges.added;

	const selectedRoomId = useSelectedRoom();
	const noRoomToDisplay = rooms.length === 0;

	const sortedRooms = useMemo(() => {
		const items = Array.from(rooms).sort(
			factoryRoomIdByActivity(mx)
		);
		return items;
	}, [mx, rooms]);

	const virtualizer = useVirtualizer({
		count: sortedRooms.length,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => 38,
		overscan: 10
	});

	return (
		<PageNav header={<HomeHeader />}>
			<SyncStateAlert />
			{noRoomToDisplay ? (
				<HomeEmpty />
			) : (
				<PageNavContent scrollRef={scrollRef}>
					<Box display="flex" flexDirection="column" gap='10px'>
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
												linkPath={getHomeRoomPath(getCanonicalAliasOrRoomId(mx, roomId))}
												// muted={mutedRooms.includes(roomId)}
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
