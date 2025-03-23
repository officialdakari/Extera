import React, {
	ChangeEventHandler,
	MouseEventHandler,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import {
	Avatar,
	Box,
	Scroll,
	Text,
	config,
} from 'folds';
import { Room, RoomMember } from 'matrix-js-sdk';
import { useVirtualizer } from '@tanstack/react-virtual';

import { AppBar, Chip, CircularProgress, Fab, List, ListItemButton, ListItemIcon, ListItemText, ListSubheader, Menu, MenuItem, Toolbar, Typography } from '@mui/material';
import { FilterAlt, KeyboardArrowUp, Sort } from '@mui/icons-material';
import { openProfileViewer } from '../../../client/action/navigation';
import * as css from './MembersDrawer.css';
import { useRoomMembers } from '../../hooks/useRoomMembers';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { Membership } from '../../../types/matrix/room';
import { UseStateProvider } from '../../components/UseStateProvider';
import {
	SearchItemStrGetter,
	UseAsyncSearchOptions,
	useAsyncSearch,
} from '../../hooks/useAsyncSearch';
import { useDebounce } from '../../hooks/useDebounce';
import { usePowerLevelTags, PowerLevelTag } from '../../hooks/usePowerLevelTags';
import { TypingIndicator } from '../../components/typing-indicator';
import { getMemberDisplayName, getMemberSearchStr } from '../../utils/room';
import { getMxIdLocalPart } from '../../utils/matrix';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { millify } from '../../plugins/millify';
import { ScrollTopContainer } from '../../components/scroll-top-container';
import { UserAvatar } from '../../components/user-avatar';
import { useRoomTypingMember } from '../../hooks/useRoomTypingMembers';
import { usePresences } from '../../hooks/usePresences';
import { getText } from '../../../lang';
import { SearchContainer, SearchIcon, SearchIconWrapper, SearchInputBase } from '../../atoms/search/Search';
import { MotionBox } from '../../atoms/motion/Animated';

export const MembershipFilters = {
	filterJoined: (m: RoomMember) => m.membership === Membership.Join,
	filterInvited: (m: RoomMember) => m.membership === Membership.Invite,
	filterLeaved: (m: RoomMember) =>
		m.membership === Membership.Leave &&
		m.events.member?.getStateKey() === m.events.member?.getSender(),
	filterKicked: (m: RoomMember) =>
		m.membership === Membership.Leave &&
		m.events.member?.getStateKey() !== m.events.member?.getSender(),
	filterBanned: (m: RoomMember) => m.membership === Membership.Ban,
};

export type MembershipFilterFn = (m: RoomMember) => boolean;

export type MembershipFilter = {
	name: string;
	filterFn: MembershipFilterFn;
	id: string;
};

const useMembershipFilterMenu = (): MembershipFilter[] =>
	useMemo(
		() => [
			{
				name: getText('members_drawer.joined'),
				id: 'joined',
				filterFn: MembershipFilters.filterJoined,
			},
			{
				name: getText('members_drawer.invited'),
				id: 'invited',
				filterFn: MembershipFilters.filterInvited,
			},
			{
				name: getText('members_drawer.left'),
				id: 'left',
				filterFn: MembershipFilters.filterLeaved,
			},
			{
				name: getText('members_drawer.kicked'),
				id: 'kicked',
				filterFn: MembershipFilters.filterKicked,
			},
			{
				name: getText('members_drawer.banned'),
				id: 'banned',
				filterFn: MembershipFilters.filterBanned,
			},
		],
		[]
	);

export const SortFilters = {
	filterAscending: (a: RoomMember, b: RoomMember) =>
		a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1,
	filterDescending: (a: RoomMember, b: RoomMember) =>
		a.name.toLowerCase() > b.name.toLowerCase() ? -1 : 1,
	filterNewestFirst: (a: RoomMember, b: RoomMember) =>
		(b.events.member?.getTs() ?? 0) - (a.events.member?.getTs() ?? 0),
	filterOldest: (a: RoomMember, b: RoomMember) =>
		(a.events.member?.getTs() ?? 0) - (b.events.member?.getTs() ?? 0),
};

export type SortFilterFn = (a: RoomMember, b: RoomMember) => number;

export type SortFilter = {
	name: string;
	filterFn: SortFilterFn;
};

const useSortFilterMenu = (): SortFilter[] =>
	useMemo(
		() => [
			{
				name: getText('sort.a_to_z'),
				filterFn: SortFilters.filterAscending,
			},
			{
				name: getText('sort.z_to_a'),
				filterFn: SortFilters.filterDescending,
			},
			{
				name: getText('sort.newest'),
				filterFn: SortFilters.filterNewestFirst,
			},
			{
				name: getText('sort.oldest'),
				filterFn: SortFilters.filterOldest,
			},
		],
		[]
	);

export type MembersFilterOptions = {
	membershipFilter: MembershipFilter;
	sortFilter: SortFilter;
};

const SEARCH_OPTIONS: UseAsyncSearchOptions = {
	limit: 100,
	matchOptions: {
		contain: true,
	},
};

const mxIdToName = (mxId: string) => getMxIdLocalPart(mxId) ?? mxId;
const getRoomMemberStr: SearchItemStrGetter<RoomMember> = (m, query) =>
	getMemberSearchStr(m, query, mxIdToName);

type MembersDrawerProps = {
	room: Room;
};
export function MembersDrawer({ room }: MembersDrawerProps) {
	const mx = useMatrixClient();
	const scrollRef = useRef<HTMLDivElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const scrollTopAnchorRef = useRef<HTMLDivElement>(null);
	const members = useRoomMembers(mx, room.roomId);
	const getPowerLevelTag = usePowerLevelTags();
	const fetchingMembers = members.length < room.getJoinedMemberCount();
	// const setPeopleDrawer = useSetSetting(settingsAtom, 'isPeopleDrawer');

	const membershipFilterMenu = useMembershipFilterMenu();
	const sortFilterMenu = useSortFilterMenu();
	const [sortFilterIndex] = useSetting(settingsAtom, 'memberSortFilterIndex');
	const [membershipFilterIndex, setMembershipFilterIndex] = useState(0);

	const membershipFilter = membershipFilterMenu[membershipFilterIndex] ?? membershipFilterMenu[0];
	const sortFilter = sortFilterMenu[sortFilterIndex] ?? sortFilterMenu[0];

	const typingMembers = useRoomTypingMember(room.roomId);

	const filteredMembers = useMemo(
		() =>
			members
				.filter(membershipFilter.filterFn)
				.sort(sortFilter.filterFn)
				.sort((a, b) => b.powerLevel - a.powerLevel),
		[members, membershipFilter, sortFilter]
	);

	const [result, search, resetSearch] = useAsyncSearch(
		filteredMembers,
		getRoomMemberStr,
		SEARCH_OPTIONS
	);
	if (!result && searchInputRef.current?.value) search(searchInputRef.current.value);

	const processMembers = result ? result.items : filteredMembers;

	const PLTagOrRoomMember = useMemo(() => {
		let prevTag: PowerLevelTag | undefined;
		const tagOrMember: Array<PowerLevelTag | RoomMember> = [];
		processMembers.forEach((m) => {
			const plTag = getPowerLevelTag(m.powerLevel);
			if (plTag !== prevTag) {
				prevTag = plTag;
				tagOrMember.push(plTag);
			}
			tagOrMember.push(m);
		});
		return tagOrMember;
	}, [processMembers, getPowerLevelTag]);

	const virtualizer = useVirtualizer({
		count: PLTagOrRoomMember.length,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => 40,
		overscan: 10,
	});

	const handleSearchChange: ChangeEventHandler<HTMLInputElement> = useDebounce(
		useCallback(
			(evt) => {
				if (evt.target.value) search(evt.target.value);
				else resetSearch();
			},
			[search, resetSearch]
		),
		{ wait: 200 }
	);

	const getName = (member: RoomMember) =>
		getMemberDisplayName(room, member.userId) ?? getMxIdLocalPart(member.userId) ?? member.userId;

	const handleMemberClick: MouseEventHandler<HTMLDivElement> = (evt) => {
		const btn = evt.currentTarget;
		const userId = btn.getAttribute('data-user-id');
		openProfileViewer(userId, room.roomId);
	};

	const getPresenceFn = usePresences();

	const [avStyles, setAvStyles] = useState<Record<string, string>>({});
	const [statusMsgs, setStatusMsgs] = useState<Record<string, string>>({});

	useEffect(() => {
		const fetchMemberAvStylesAndStatus = () => {
			const newAvStyles: { [key: string]: string } = {};
			const newStatusMsgs: { [key: string]: string } = {};

			members.forEach((member) => {
				try {
					const presence = getPresenceFn(member.userId);
					if (!presence) return;
					newAvStyles[member.userId] = presence.presence;
					newStatusMsgs[member.userId] = presence.presenceStatusMsg ?? presence.presence;
				} catch (error) {
					// handle error if needed
					console.error(`Cant load presence for ${member.userId}`, error);
				}
			});

			setAvStyles(newAvStyles);
			setStatusMsgs(newStatusMsgs);
		};

		fetchMemberAvStylesAndStatus();
	}, [members, mx, getPresenceFn]);

	return (
		<MotionBox
			shrink="No"
			direction="Column"
			initial={{
				translateX: '100%',
				opacity: 0.1,
			}}
			exit={{
				translateX: '100%',
				opacity: 0.1,
			}}
			animate={{
				translateX: 0,
				opacity: 1,
			}}
			className={css.MembersDrawer}
		>
			<AppBar position='relative'>
				<Toolbar>
					<Typography variant='h6'>
						{getText('generic.member_count', millify(room.getJoinedMemberCount()))}
					</Typography>
				</Toolbar>
			</AppBar>
			<Box className={css.MemberDrawerContentBase} grow="Yes">
				<Scroll ref={scrollRef} style={{ background: 'transparent' }} size="300" visibility="Hover" hideTrack>
					<Box className={css.MemberDrawerContent} direction="Column" gap="200">
						<Box ref={scrollTopAnchorRef} className={css.DrawerGroup} direction="Column" gap="200">
							<Box alignItems="Center" justifyContent="SpaceBetween" gap="200">
								<UseStateProvider initial={null}>
									{(anchor: HTMLElement | null, setAnchor) => (
										<>
											<Menu onClose={() => setAnchor(null)} anchorEl={anchor} open={!!anchor}>
												{membershipFilterMenu.map((menuItem, index) =>
													<MenuItem
														key={menuItem.name}
														selected={menuItem.name === membershipFilter.name}
														onClick={() => {
															setMembershipFilterIndex(index);
															setAnchor(null);
														}}
													>
														<ListItemText>
															{menuItem.name}
														</ListItemText>
													</MenuItem>
												)}
											</Menu>
											<Chip
												component='button'
												onClick={
													((evt) =>
														setAnchor(
															evt.currentTarget
														)) as MouseEventHandler<HTMLButtonElement>
												}
												icon={<FilterAlt />}
												label={membershipFilter.name}
											/>
										</>
									)}
								</UseStateProvider>
								<UseStateProvider initial={null}>
									{(anchor: HTMLElement | null, setAnchor) => (
										<>
											<Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
												{sortFilterMenu.map((menuItem) => (
													<MenuItem selected={menuItem.name === sortFilter.name}>
														<ListItemText>
															{menuItem.name}
														</ListItemText>
													</MenuItem>
												))}
											</Menu>
											<Chip
												component='button'
												onClick={
													((evt) =>
														setAnchor(
															evt.currentTarget
														)) as MouseEventHandler<HTMLButtonElement>
												}
												icon={<Sort />}
												label={sortFilter.name}
											/>
										</>
									)}
								</UseStateProvider>
							</Box>
							<Box direction="Column" gap="100">
								<SearchContainer>
									<SearchIconWrapper>
										<SearchIcon />
									</SearchIconWrapper>
									<SearchInputBase
										inputRef={searchInputRef}
										onChange={handleSearchChange}
										placeholder={getText('placeholder.search_name')}
									/>
								</SearchContainer>
							</Box>
						</Box>

						<ScrollTopContainer scrollRef={scrollRef} anchorRef={scrollTopAnchorRef}>
							<Fab
								size='small'
								onClick={() => virtualizer.scrollToOffset(0)}
								aria-label={getText('aria.scroll_to_top')}
							>
								<KeyboardArrowUp />
							</Fab>
						</ScrollTopContainer>

						{!fetchingMembers && !result && processMembers.length === 0 && (
							<Text style={{ padding: config.space.S300 }} align="Center">
								{getText(`members_drawer.no_members.${membershipFilter.id}`)}
							</Text>
						)}

						<List dense>
							<div
								style={{
									position: 'relative',
									height: virtualizer.getTotalSize(),
								}}
							>
								{virtualizer.getVirtualItems().map((vItem) => {
									const tagOrMember = PLTagOrRoomMember[vItem.index];
									if (!('userId' in tagOrMember)) {
										return (
											<ListSubheader
												key={`${room.roomId}-${vItem.index}`}
												ref={virtualizer.measureElement}
												data-index={vItem.index}
											>
												{tagOrMember.name}
											</ListSubheader>
											// <Text
											// 	style={{
											// 		transform: `translateY(${vItem.start}px)`,
											// 	}}
											// 	data-index={vItem.index}
											// 	ref={virtualizer.measureElement}
											// 	key={`${room.roomId}-${vItem.index}`}
											// 	className={classNames(css.MembersGroupLabel, css.DrawerVirtualItem)}
											// 	size="L400"
											// >
											// 	{tagOrMember.name}
											// </Text>
										);
									}

									const member = tagOrMember;
									const name = getName(member);
									const avatarUrl = member.getAvatarUrl(
										mx.baseUrl,
										100,
										100,
										'crop',
										undefined,
										false
									);

									return (
										<ListItemButton
											dense
											ref={virtualizer.measureElement}
											data-index={vItem.index}
											data-user-id={member.userId}
											key={`${room.roomId}-${member.userId}`}
											onClick={handleMemberClick}
										>
											<ListItemIcon>
												<Avatar className={`presence-${avStyles[member.userId]}`} size="300">
													<UserAvatar
														userId={member.userId}
														src={avatarUrl ?? undefined}
														alt={name}
													/>
												</Avatar>
											</ListItemIcon>
											<ListItemText
												primary={name}
												secondary={statusMsgs[member.userId]}
											/>
											{typingMembers.find((receipt) => receipt.userId === member.userId) && (
												<TypingIndicator size="400" />
											)}
										</ListItemButton>
									);
								})}
							</div>
						</List>

						{fetchingMembers && (
							<Box justifyContent="Center">
								<CircularProgress />
							</Box>
						)}
					</Box>
				</Scroll>
			</Box>
		</MotionBox>
	);
}
