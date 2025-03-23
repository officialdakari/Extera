import React, {
	ChangeEventHandler,
	FocusEventHandler,
	MouseEventHandler,
	UIEventHandler,
	ReactNode,
	memo,
	useCallback,
	useEffect,
	useMemo,
	useRef,
} from 'react';
import {
	Box,
	Scroll,
	Text,
	as,
	config,
	toRem,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import { isKeyHotkey } from 'is-hotkey';
import classNames from 'classnames';
import { MatrixClient, Room } from 'matrix-js-sdk';
import { atom, useAtomValue, useSetAtom } from 'jotai';

import Icon from '@mdi/react';
import { mdiHistory, mdiStickerOutline } from '@mdi/js';
import { Divider, IconButton, Tab, Tabs, Theme, Tooltip, useTheme } from '@mui/material';
import * as css from './EmojiBoard.css';
import { EmojiGroupId, IEmoji, IEmojiGroup, emojiGroups, emojis } from '../../plugins/emoji';
import { IEmojiGroupLabels, useEmojiGroupLabels } from './useEmojiGroupLabels';
import { IEmojiGroupIcons, useEmojiGroupIcons } from './useEmojiGroupIcons';
import { preventScrollWithArrowKey } from '../../utils/keyboard';
import { useRelevantImagePacks } from '../../hooks/useImagePacks';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useRecentEmoji } from '../../hooks/useRecentEmoji';
import { ExtendedPackImage, ImagePack, PackUsage } from '../../plugins/custom-emoji';
import { isUserId, mxcUrlToHttp } from '../../utils/matrix';
import { editableActiveElement, isIntersectingScrollView, targetFromEvent } from '../../utils/dom';
import { useAsyncSearch, UseAsyncSearchOptions } from '../../hooks/useAsyncSearch';
import { useDebounce } from '../../hooks/useDebounce';
import { useThrottle } from '../../hooks/useThrottle';
import { addRecentEmoji } from '../../plugins/recent-emoji';
import { mobileOrTablet } from '../../utils/user-agent';
import { getText } from '../../../lang';
import { SearchContainer, SearchIcon, SearchIconWrapper, SearchInputBase } from '../../atoms/search/Search';
import { MotionBox } from '../../atoms/motion/Animated';

const RECENT_GROUP_ID = 'recent_group';
const SEARCH_GROUP_ID = 'search_group';

export enum EmojiBoardTab {
	Emoji = 'Emoji',
	Sticker = 'Sticker',
}

enum EmojiType {
	Emoji = 'emoji',
	CustomEmoji = 'customEmoji',
	Sticker = 'sticker',
}

export type EmojiItemInfo = {
	type: EmojiType;
	data: string;
	shortcode: string;
	label: string;
};

const getDOMGroupId = (id: string): string => `EmojiBoardGroup-${id}`;

const getEmojiItemInfo = (element: Element): EmojiItemInfo | undefined => {
	const type = element.getAttribute('data-emoji-type') as EmojiType | undefined;
	const data = element.getAttribute('data-emoji-data');
	const label = element.getAttribute('title');
	const shortcode = element.getAttribute('data-emoji-shortcode');

	if (type && data && shortcode && label)
		return {
			type,
			data,
			shortcode,
			label,
		};
	return undefined;
};

const activeGroupIdAtom = atom<string | undefined>(undefined);

function Sidebar({ children }: { children: ReactNode }) {
	return (
		<Box className={css.Sidebar} shrink="No">
			<Scroll size="0">
				<Box className={css.SidebarContent} direction="Column" alignItems="Center" gap="100">
					{children}
				</Box>
			</Scroll>
		</Box>
	);
}

const SidebarStack = as<'div'>(({ className, children, ...props }, ref) => (
	<Box
		className={classNames(css.SidebarStack, className)}
		direction="Column"
		alignItems="Center"
		gap="100"
		{...props}
		ref={ref}
	>
		{children}
	</Box>
));
function SidebarDivider() {
	return <Divider orientation='vertical' />;
}

function Header({ children }: { children: ReactNode }) {
	return (
		<Box className={css.Header} direction="Column" shrink="No">
			{children}
		</Box>
	);
}

function Content({ children }: { children: ReactNode }) {
	return <Box grow="Yes">{children}</Box>;
}

function Footer({ children }: { children: ReactNode }) {
	return (
		<Box shrink="No" className={css.Footer} gap="300" alignItems="Center">
			{children}
		</Box>
	);
}

const EmojiBoardLayout = as<
	'div',
	{
		header: ReactNode;
		sidebar?: ReactNode;
		footer?: ReactNode;
		children: ReactNode;
		theme: Theme;
		fullWidth?: boolean;
	}
>(({ className, header, sidebar, footer, children, theme, fullWidth, ...props }, ref) => (
	<MotionBox
		display="InlineFlex"
		className={classNames(fullWidth ? css.FullWidth : css.Base, className)}
		direction="Row"
		style={{ backgroundColor: theme.palette.background.paper, color: theme.palette.text.primary }}
		{...props}
		ref={ref}
		initial={{
			translateY: '30px',
			opacity: 0.1
		}}
		exit={{
			translateY: '30px',
			opacity: 0.1
		}}
		animate={{
			translateY: 0,
			opacity: 1
		}}
	>
		<Box direction="Column" grow="Yes">
			{header}
			{children}
			{footer}
		</Box>
		<SidebarDivider />
		{sidebar}
	</MotionBox>
));

function EmojiBoardTabs({
	tab,
	onTabChange,
}: {
	tab: EmojiBoardTab;
	onTabChange: (tab: EmojiBoardTab) => void;
}) {
	return (
		<Tabs
			value={tab === EmojiBoardTab.Emoji ? 1 : 0}
			onChange={(evt, v) => onTabChange(v === 0 ? EmojiBoardTab.Sticker : EmojiBoardTab.Emoji)}
		>
			<Tab label={getText('emojiboard.stickers')} id='emojiboard-tab-0' aria-controls='emojibord-tab-stickers' />
			<Tab label={getText('emojiboard.emojis')} id='emojiboard-tab-1' aria-controls='emojibord-tab-emojis' />
		</Tabs>
	);
}

export function SidebarBtn<T extends string>({
	active,
	label,
	id,
	onItemClick,
	children,
}: {
	active?: boolean;
	label: string;
	id: T;
	onItemClick: (id: T) => void;
	children: ReactNode;
}) {
	return (
		<Tooltip title={label}>
			<IconButton
				aria-pressed={active}
				aria-labelledby={`SidebarStackItem-${id}-label`}
				onClick={() => onItemClick(id)}
			>
				{children}
			</IconButton>
		</Tooltip>
	);
}

export const EmojiGroup = as<
	'div',
	{
		id: string;
		label: string;
		children: ReactNode;
	}
>(({ className, id, label, children, ...props }, ref) => (
	<Box
		id={getDOMGroupId(id)}
		data-group-id={id}
		className={classNames(css.EmojiGroup, className)}
		direction="Column"
		gap="200"
		{...props}
		ref={ref}
	>
		<Text id={`EmojiGroup-${id}-label`} as="label" className={css.EmojiGroupLabel} size="O400">
			{label}
		</Text>
		<div aria-labelledby={`EmojiGroup-${id}-label`} className={css.EmojiGroupContent}>
			<Box wrap="Wrap" justifyContent="Center">
				{children}
			</Box>
		</div>
	</Box>
));

export function EmojiItem({
	label,
	type,
	data,
	shortcode,
	children,
}: {
	label: string;
	type: EmojiType;
	data: string;
	shortcode: string;
	children: ReactNode;
}) {
	return (
		<MotionBox
			as="button"
			className={css.EmojiItem}
			type="button"
			alignItems="Center"
			justifyContent="Center"
			title={label}
			aria-label={`${label} emoji`}
			data-emoji-type={type}
			data-emoji-data={data}
			data-emoji-shortcode={shortcode}
			whileHover={{ scale: 1.2 }}
		>
			{children}
		</MotionBox>
	);
}

export function StickerItem({
	label,
	type,
	data,
	shortcode,
	children,
}: {
	label: string;
	type: EmojiType;
	data: string;
	shortcode: string;
	children: ReactNode;
}) {
	return (
		<MotionBox
			as="button"
			className={css.StickerItem}
			type="button"
			alignItems="Center"
			justifyContent="Center"
			title={label}
			aria-label={`${label} sticker`}
			data-emoji-type={type}
			data-emoji-data={data}
			data-emoji-shortcode={shortcode}
			whileHover={{
				scale: 1.2
			}}
		>
			{children}
		</MotionBox>
	);
}

function RecentEmojiSidebarStack({ onItemClick }: { onItemClick: (id: string) => void }) {
	const activeGroupId = useAtomValue(activeGroupIdAtom);

	return (
		<SidebarStack>
			<SidebarBtn
				active={activeGroupId === RECENT_GROUP_ID}
				id={RECENT_GROUP_ID}
				label="Recent"
				onItemClick={() => onItemClick(RECENT_GROUP_ID)}
			>
				<Icon size={1} path={mdiHistory} />
			</SidebarBtn>
		</SidebarStack>
	);
}

function ImagePackSidebarStack({
	mx,
	packs,
	usage,
	onItemClick,
}: {
	mx: MatrixClient;
	packs: ImagePack[];
	usage: PackUsage;
	onItemClick: (id: string) => void;
}) {
	const activeGroupId = useAtomValue(activeGroupIdAtom);
	return (
		<SidebarStack>
			{usage === PackUsage.Emoticon && <SidebarDivider />}
			{packs.map((pack) => {
				let label = pack.displayName;
				if (!label) label = isUserId(pack.id) ? getText('emojiboard.personal_pack') : mx.getRoom(pack.id)?.name;
				return (
					<SidebarBtn
						active={activeGroupId === pack.id}
						key={pack.id}
						id={pack.id}
						label={label || getText('emojiboard.unknown_pack')}
						onItemClick={onItemClick}
					>
						<img
							style={{
								width: toRem(24),
								height: toRem(24),
								objectFit: 'contain',
							}}
							src={mxcUrlToHttp(mx, pack.getPackAvatarUrl(usage) ?? '') || pack.avatarUrl}
							alt={label || getText('emojiboard.unknown_pack')}
						/>
					</SidebarBtn>
				);
			})}
		</SidebarStack>
	);
}

function NativeEmojiSidebarStack({
	groups,
	icons,
	labels,
	onItemClick,
}: {
	groups: IEmojiGroup[];
	icons: IEmojiGroupIcons;
	labels: IEmojiGroupLabels;
	onItemClick: (id: EmojiGroupId) => void;
}) {
	const activeGroupId = useAtomValue(activeGroupIdAtom);
	return (
		<SidebarStack className={css.NativeEmojiSidebarStack}>
			<SidebarDivider />
			{groups.map((group) => (
				<SidebarBtn
					key={group.id}
					active={activeGroupId === group.id}
					id={group.id}
					label={labels[group.id]}
					onItemClick={onItemClick}
				>
					<Icon path={icons[group.id]} size={1} />
				</SidebarBtn>
			))}
		</SidebarStack>
	);
}

export function RecentEmojiGroup({
	label,
	id,
	emojis: recentEmojis,
}: {
	label: string;
	id: string;
	emojis: IEmoji[];
}) {
	return (
		<EmojiGroup key={id} id={id} label={label}>
			{recentEmojis.map((emoji) => (
				<EmojiItem
					key={emoji.unicode}
					label={emoji.label}
					type={EmojiType.Emoji}
					data={emoji.unicode}
					shortcode={emoji.shortcode}
				>
					{emoji.unicode}
				</EmojiItem>
			))}
		</EmojiGroup>
	);
}

export function SearchEmojiGroup({
	mx,
	tab,
	label,
	id,
	emojis: searchResult,
}: {
	mx: MatrixClient;
	tab: EmojiBoardTab;
	label: string;
	id: string;
	emojis: Array<ExtendedPackImage | IEmoji>;
}) {
	return (
		<EmojiGroup key={id} id={id} label={label}>
			{tab === EmojiBoardTab.Emoji
				? searchResult.map((emoji) =>
					'unicode' in emoji ? (
						<EmojiItem
							key={emoji.unicode}
							label={emoji.label}
							type={EmojiType.Emoji}
							data={emoji.unicode}
							shortcode={emoji.shortcode}
						>
							{emoji.unicode}
						</EmojiItem>
					) : (
						<EmojiItem
							key={emoji.shortcode}
							label={emoji.body || emoji.shortcode}
							type={EmojiType.CustomEmoji}
							data={emoji.url}
							shortcode={emoji.shortcode}
						>
							<img
								loading="lazy"
								className={css.CustomEmojiImg}
								alt={emoji.body || emoji.shortcode}
								src={mxcUrlToHttp(mx, emoji.url) ?? emoji.url}
							/>
						</EmojiItem>
					)
				)
				: searchResult.map((emoji) =>
					'unicode' in emoji ? null : (
						<StickerItem
							key={emoji.shortcode}
							label={emoji.body || emoji.shortcode}
							type={EmojiType.Sticker}
							data={emoji.url}
							shortcode={emoji.shortcode}
						>
							<img
								loading="lazy"
								className={css.StickerImg}
								alt={emoji.body || emoji.shortcode}
								src={mxcUrlToHttp(mx, emoji.url) ?? emoji.url}
							/>
						</StickerItem>
					)
				)}
		</EmojiGroup>
	);
}

export const CustomEmojiGroups = memo(
	({ mx, groups }: { mx: MatrixClient; groups: ImagePack[] }) => (
		<>
			{groups.map((pack) => (
				<EmojiGroup key={pack.id} id={pack.id} label={pack.displayName || getText('emojigroup.unknown_name')}>
					{pack.getEmojis().map((image) => (
						<EmojiItem
							key={image.shortcode}
							label={image.body || image.shortcode}
							type={EmojiType.CustomEmoji}
							data={image.url}
							shortcode={image.shortcode}
						>
							<img
								loading="lazy"
								className={css.CustomEmojiImg}
								alt={image.body || image.shortcode}
								src={mxcUrlToHttp(mx, image.url) ?? image.url}
							/>
						</EmojiItem>
					))}
				</EmojiGroup>
			))}
		</>
	)
);

export const StickerGroups = memo(({ mx, groups }: { mx: MatrixClient; groups: ImagePack[] }) => (
	<>
		{groups.length === 0 && (
			<Box
				style={{ padding: `${toRem(60)} ${config.space.S500}` }}
				alignItems="Center"
				justifyContent="Center"
				direction="Column"
				gap="300"
			>
				<Icon size={1} path={mdiStickerOutline} />
				<Box direction="Inherit">
					<Text align="Center">{getText('emojiboard.no_sticker_packs')}</Text>
					<Text priority="300" align="Center" size="T200">
						{getText('emojiboard.no_sticker_packs.2')}
					</Text>
				</Box>
			</Box>
		)}
		{groups.map((pack) => (
			<EmojiGroup key={pack.id} id={pack.id} label={pack.displayName || 'Unknown'}>
				{pack.getStickers().map((image) => (
					<StickerItem
						key={image.shortcode}
						label={image.body || image.shortcode}
						type={EmojiType.Sticker}
						data={image.url}
						shortcode={image.shortcode}
					>
						<img
							loading="lazy"
							className={css.StickerImg}
							alt={image.body || image.shortcode}
							src={mxcUrlToHttp(mx, image.url) ?? image.url}
						/>
					</StickerItem>
				))}
			</EmojiGroup>
		))}
	</>
));

export const NativeEmojiGroups = memo(
	({ groups, labels }: { groups: IEmojiGroup[]; labels: IEmojiGroupLabels }) => (
		<>
			{groups.map((emojiGroup) => (
				<EmojiGroup key={emojiGroup.id} id={emojiGroup.id} label={labels[emojiGroup.id]}>
					{emojiGroup.emojis.map((emoji) => (
						<EmojiItem
							key={emoji.unicode}
							label={emoji.label}
							type={EmojiType.Emoji}
							data={emoji.unicode}
							shortcode={emoji.shortcode}
						>
							{emoji.unicode}
						</EmojiItem>
					))}
				</EmojiGroup>
			))}
		</>
	)
);

const getSearchListItemStr = (item: ExtendedPackImage | IEmoji) => {
	const shortcode = `:${item.shortcode}:`;
	if ('body' in item) {
		return [shortcode, item.body ?? ''];
	}
	return shortcode;
};
const SEARCH_OPTIONS: UseAsyncSearchOptions = {
	limit: 26,
	matchOptions: {
		contain: true,
	},
};

export function EmojiBoard({
	tab = EmojiBoardTab.Emoji,
	onTabChange,
	imagePackRooms,
	requestClose,
	returnFocusOnDeactivate,
	onEmojiSelect,
	onCustomEmojiSelect,
	onStickerSelect,
	allowTextCustomEmoji,
	fullWidth
}: {
	tab?: EmojiBoardTab;
	onTabChange?: (tab: EmojiBoardTab) => void;
	imagePackRooms: Room[];
	requestClose: () => void;
	returnFocusOnDeactivate?: boolean;
	onEmojiSelect?: (unicode: string, shortcode: string) => void;
	onCustomEmojiSelect?: (mxc: string, shortcode: string) => void;
	onStickerSelect?: (mxc: string, shortcode: string, label: string) => void;
	allowTextCustomEmoji?: boolean;
	fullWidth?: boolean;
}) {
	const emojiTab = tab === EmojiBoardTab.Emoji;
	const stickerTab = tab === EmojiBoardTab.Sticker;
	const usage = emojiTab ? PackUsage.Emoticon : PackUsage.Sticker;

	const setActiveGroupId = useSetAtom(activeGroupIdAtom);
	const mx = useMatrixClient();
	const emojiGroupLabels = useEmojiGroupLabels();
	const emojiGroupIcons = useEmojiGroupIcons();
	const imagePacks = useRelevantImagePacks(mx, usage, imagePackRooms);
	const recentEmojis = useRecentEmoji(mx, 21);

	const contentScrollRef = useRef<HTMLDivElement>(null);
	const emojiPreviewRef = useRef<HTMLDivElement>(null);
	const emojiPreviewTextRef = useRef<HTMLParagraphElement>(null);

	const theme = useTheme();

	const searchList = useMemo(() => {
		let list: Array<ExtendedPackImage | IEmoji> = [];
		list = list.concat(imagePacks.flatMap((pack) => pack.getImagesFor(usage)));
		if (emojiTab) list = list.concat(emojis);
		return list;
	}, [emojiTab, usage, imagePacks]);

	const [result, search, resetSearch] = useAsyncSearch(
		searchList,
		getSearchListItemStr,
		SEARCH_OPTIONS
	);

	const handleOnChange: ChangeEventHandler<HTMLInputElement> = useDebounce(
		useCallback(
			(evt) => {
				const term = evt.target.value;
				if (term) search(term);
				else resetSearch();
			},
			[search, resetSearch]
		),
		{ wait: 200 }
	);

	const syncActiveGroupId = useCallback(() => {
		const targetEl = contentScrollRef.current;
		if (!targetEl) return;
		const groupEls = Array.from(targetEl.querySelectorAll('div[data-group-id]')) as HTMLElement[];
		const groupEl = groupEls.find((el) => isIntersectingScrollView(targetEl, el));
		const groupId = groupEl?.getAttribute('data-group-id') ?? undefined;
		setActiveGroupId(groupId);
	}, [setActiveGroupId]);

	const handleOnScroll: UIEventHandler<HTMLDivElement> = useThrottle(syncActiveGroupId, {
		wait: 500,
	});

	const handleScrollToGroup = (groupId: string) => {
		setActiveGroupId(groupId);
		const groupElement = document.getElementById(getDOMGroupId(groupId));
		groupElement?.scrollIntoView();
	};

	const handleEmojiClick: MouseEventHandler = (evt) => {
		const targetEl = targetFromEvent(evt.nativeEvent, 'button');
		if (!targetEl) return;
		const emojiInfo = getEmojiItemInfo(targetEl);
		if (!emojiInfo) return;
		if (emojiInfo.type === EmojiType.Emoji) {
			onEmojiSelect?.(emojiInfo.data, emojiInfo.shortcode);
			if (!evt.altKey && !evt.shiftKey) {
				addRecentEmoji(mx, emojiInfo.data);
				requestClose();
			}
		}
		if (emojiInfo.type === EmojiType.CustomEmoji) {
			onCustomEmojiSelect?.(emojiInfo.data, emojiInfo.shortcode);
			if (!evt.altKey && !evt.shiftKey) requestClose();
		}
		if (emojiInfo.type === EmojiType.Sticker) {
			onStickerSelect?.(emojiInfo.data, emojiInfo.shortcode, emojiInfo.label);
			if (!evt.altKey && !evt.shiftKey) requestClose();
		}
	};

	const handleEmojiPreview = useCallback(
		(element: HTMLButtonElement) => {
			const emojiInfo = getEmojiItemInfo(element);
			if (!emojiInfo || !emojiPreviewTextRef.current) return;
			if (emojiInfo.type === EmojiType.Emoji && emojiPreviewRef.current) {
				emojiPreviewRef.current.textContent = emojiInfo.data;
			} else if (emojiInfo.type === EmojiType.CustomEmoji && emojiPreviewRef.current) {
				const img = document.createElement('img');
				img.className = css.CustomEmojiImg;
				img.setAttribute('src', mxcUrlToHttp(mx, emojiInfo.data) || emojiInfo.data);
				img.setAttribute('alt', emojiInfo.shortcode);
				emojiPreviewRef.current.textContent = '';
				emojiPreviewRef.current.appendChild(img);
			}
			emojiPreviewTextRef.current.textContent = `:${emojiInfo.shortcode}:`;
		},
		[mx]
	);

	const throttleEmojiHover = useThrottle(handleEmojiPreview, {
		wait: 200,
		immediate: true,
	});

	const handleEmojiHover: MouseEventHandler = (evt) => {
		const targetEl = targetFromEvent(evt.nativeEvent, 'button') as HTMLButtonElement | undefined;
		if (!targetEl) return;
		throttleEmojiHover(targetEl);
	};

	const handleEmojiFocus: FocusEventHandler = (evt) => {
		const targetEl = evt.target as HTMLButtonElement;
		handleEmojiPreview(targetEl);
	};

	// Reset scroll top on search and tab change
	useEffect(() => {
		syncActiveGroupId();
		contentScrollRef.current?.scrollTo({
			top: 0,
		});
	}, [result, emojiTab, syncActiveGroupId]);

	return (
		<FocusTrap
			focusTrapOptions={{
				returnFocusOnDeactivate,
				initialFocus: false,
				onDeactivate: requestClose,
				clickOutsideDeactivates: true,
				allowOutsideClick: true,
				isKeyForward: (evt: KeyboardEvent) =>
					!editableActiveElement() && isKeyHotkey(['arrowdown', 'arrowright'], evt),
				isKeyBackward: (evt: KeyboardEvent) =>
					!editableActiveElement() && isKeyHotkey(['arrowup', 'arrowleft'], evt),
			}}
		>
			<EmojiBoardLayout
				theme={theme}
				fullWidth={fullWidth}
				header={
					<Header>
						<Box direction="Column" gap="200">
							{onTabChange && <EmojiBoardTabs tab={tab} onTabChange={onTabChange} />}
							<SearchContainer>
								<SearchIconWrapper>
									<SearchIcon />
								</SearchIconWrapper>
								<SearchInputBase
									data-emoji-board-search
									autoFocus={!mobileOrTablet()}
									onChange={handleOnChange}
									placeholder={allowTextCustomEmoji ? getText('emojiboard.search_or_text_reaction') : getText('emojiboard.search')}
								/>
							</SearchContainer>
						</Box>
					</Header>
				}
				sidebar={
					<Sidebar>
						{emojiTab && recentEmojis.length > 0 && (
							<RecentEmojiSidebarStack onItemClick={handleScrollToGroup} />
						)}
						{imagePacks.length > 0 && (
							<ImagePackSidebarStack
								mx={mx}
								usage={usage}
								packs={imagePacks}
								onItemClick={handleScrollToGroup}
							/>
						)}
						{emojiTab && (
							<NativeEmojiSidebarStack
								groups={emojiGroups}
								icons={emojiGroupIcons}
								labels={emojiGroupLabels}
								onItemClick={handleScrollToGroup}
							/>
						)}
					</Sidebar>
				}
				footer={
					<>
						{emojiTab ? (
							<Footer>
								<Box
									display="InlineFlex"
									ref={emojiPreviewRef}
									className={css.EmojiPreview}
									alignItems="Center"
									justifyContent="Center"
								>
									😃
								</Box>
								<Text ref={emojiPreviewTextRef} size="H5" truncate>
									:smiley:
								</Text>
							</Footer>
						) : (
							imagePacks.length > 0 && (
								<Footer>
									<Text ref={emojiPreviewTextRef} size="H5" truncate>
										:smiley:
									</Text>
								</Footer>
							)
						)}
						{/* {!hideAdvert && (
                            <Box shrink="No" className={css.Footer} display='InlineFlex' justifyContent='SpaceBetween' gap="300" alignItems="Center">
                                <Text size="H5">
                                    Free cool emojis
                                </Text>
                                <div>
                                    <Button size='300' variant='Success' onClick={handleGetFreeEmojis}>Get</Button>
                                    &nbsp;
                                    <Button size='300' variant='Secondary' onClick={handleDismissFreeEmojis}>Dismiss</Button>
                                </div>
                            </Box>
                        )} */}
					</>
				}
			>
				<Content>
					<Scroll
						ref={contentScrollRef}
						size="400"
						onScroll={handleOnScroll}
						onKeyDown={preventScrollWithArrowKey}
						hideTrack
					>
						<Box
							onClick={handleEmojiClick}
							onMouseMove={handleEmojiHover}
							onFocus={handleEmojiFocus}
							direction="Column"
							gap="200"
						>
							{result && (
								<SearchEmojiGroup
									mx={mx}
									tab={tab}
									id={SEARCH_GROUP_ID}
									label={getText(result.items.length ? 'emojiboard.results' : 'emojiboard.no_results')}
									emojis={result.items}
								/>
							)}
							{emojiTab && recentEmojis.length > 0 && (
								<RecentEmojiGroup id={RECENT_GROUP_ID} label="Recent" emojis={recentEmojis} />
							)}
							{emojiTab && <CustomEmojiGroups mx={mx} groups={imagePacks} />}
							{stickerTab && <StickerGroups mx={mx} groups={imagePacks} />}
							{emojiTab && <NativeEmojiGroups groups={emojiGroups} labels={emojiGroupLabels} />}
						</Box>
					</Scroll>
				</Content>
			</EmojiBoardLayout>
		</FocusTrap>
	);
}
