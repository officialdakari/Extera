import React, { FormEventHandler, MouseEventHandler, forwardRef, useEffect, useMemo, useState } from 'react';
import FocusTrap from 'focus-trap-react';
import {
    Box,
    Avatar,
    Text,
    Overlay,
    OverlayCenter,
    OverlayBackdrop,
    IconButton,
    Tooltip,
    TooltipProvider,
    Menu,
    MenuItem,
    toRem,
    config,
    Line,
    PopOut,
    RectCords,
    Modal,
    Header,
    Chip,
    Scroll,
    Input,
    Button,
} from 'folds';
import { useLocation, useNavigate } from 'react-router-dom';
import { EventTimeline, JoinRule, MatrixEvent, Room } from 'matrix-js-sdk';
import { useAtomValue } from 'jotai';

import { useStateEvent } from '../../hooks/useStateEvent';
import { PageHeader } from '../../components/page';
import { RoomAvatar, RoomIcon } from '../../components/room-avatar';
import { UseStateProvider } from '../../components/UseStateProvider';
import { RoomTopicViewer } from '../../components/room-topic-viewer';
import { GetContentCallback, StateEvent } from '../../../types/matrix/room';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useRoom } from '../../hooks/useRoom';
import { useSetSetting, useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { useSpaceOptionally } from '../../hooks/useSpace';
import {
    getHomeSearchPath,
    getOriginBaseUrl,
    getSpaceSearchPath,
    joinPathComponent,
    withOriginBaseUrl,
    withSearchParam,
} from '../../pages/pathUtils';
import { getCanonicalAliasOrRoomId, isRoomId, isUserId } from '../../utils/matrix';
import { _SearchPathSearchParams } from '../../pages/paths';
import * as css from './RoomViewHeader.css';
import { useRoomUnread } from '../../state/hooks/unread';
import { usePowerLevelsAPI, usePowerLevelsContext } from '../../hooks/usePowerLevels';
import { markAsRead } from '../../../client/action/notifications';
import { roomToUnreadAtom } from '../../state/room/roomToUnread';
import { openInviteUser, openJoinAlias, openProfileViewer, toggleRoomSettings } from '../../../client/action/navigation';
import { copyToClipboard } from '../../utils/dom';
import { LeaveRoomPrompt } from '../../components/leave-room-prompt';
import { useRoomAvatar, useRoomName, useRoomTopic } from '../../hooks/useRoomMeta';
import { mDirectAtom } from '../../state/mDirectList';
import { useClientConfig } from '../../hooks/useClientConfig';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { usePresences } from '../../hooks/usePresences';
import { getText } from '../../../lang';
import { RenderMessageContent } from '../../components/RenderMessageContent';
import { DefaultPlaceholder, ImageContent, MSticker } from '../../components/message';
import { ImageViewer } from '../../components/image-viewer';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { getReactCustomHtmlParser } from '../../plugins/react-custom-html-parser';
import { HTMLReactParserOptions } from 'html-react-parser';
import { Message } from './message';
import { Image } from '../../components/media';
import { mdiAccount, mdiAccountPlus, mdiArrowLeft, mdiCheckAll, mdiChevronLeft, mdiChevronRight, mdiClose, mdiCog, mdiDotsVertical, mdiLinkVariant, mdiMagnify, mdiPhone, mdiPin } from '@mdi/js';
import Icon from '@mdi/react';

type RoomMenuProps = {
    room: Room;
    linkPath: string;
    requestClose: () => void;
};
const RoomMenu = forwardRef<HTMLDivElement, RoomMenuProps>(
    ({ room, linkPath, requestClose }, ref) => {
        const mx = useMatrixClient();
        const { hashRouter } = useClientConfig();
        const unread = useRoomUnread(room.roomId, roomToUnreadAtom);
        const powerLevels = usePowerLevelsContext();
        const { getPowerLevel, canDoAction } = usePowerLevelsAPI(powerLevels);
        const canInvite = canDoAction('invite', getPowerLevel(mx.getUserId() ?? ''));

        const handleMarkAsRead = () => {
            markAsRead(room.roomId);
            requestClose();
        };

        const handleInvite = () => {
            openInviteUser(room.roomId);
            requestClose();
        };

        const handleCopyLink = () => {
            copyToClipboard(withOriginBaseUrl(getOriginBaseUrl(hashRouter), linkPath));
            requestClose();
        };

        const handleRoomSettings = () => {
            toggleRoomSettings(room.roomId);
            requestClose();
        };

        return (
            <Menu ref={ref} style={{ maxWidth: toRem(160), width: '100vw' }}>
                <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
                    <MenuItem
                        onClick={handleMarkAsRead}
                        size="300"
                        after={<Icon size={1} path={mdiCheckAll} />}
                        radii="300"
                        disabled={!unread}
                    >
                        <Text style={{ flexGrow: 1 }} as="span" size="T300">
                            {getText('room_header.mark_as_read')}
                        </Text>
                    </MenuItem>
                </Box>
                <Line variant="Surface" size="300" />
                <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
                    <MenuItem
                        onClick={handleInvite}
                        variant="Primary"
                        fill="None"
                        size="300"
                        after={<Icon size={1} path={mdiAccountPlus} />}
                        radii="300"
                        disabled={!canInvite}
                    >
                        <Text style={{ flexGrow: 1 }} as="span" size="T300">
                            {getText('room_header.invite')}
                        </Text>
                    </MenuItem>
                    <MenuItem
                        onClick={handleCopyLink}
                        size="300"
                        after={<Icon size={1} path={mdiLinkVariant} />}
                        radii="300"
                    >
                        <Text style={{ flexGrow: 1 }} as="span" size="T300">
                            {getText('room_header.copy_link')}
                        </Text>
                    </MenuItem>
                    <MenuItem
                        onClick={handleRoomSettings}
                        size="300"
                        after={<Icon size={1} path={mdiCog} />}
                        radii="300"
                    >
                        <Text style={{ flexGrow: 1 }} as="span" size="T300">
                            {getText('room_header.settings')}
                        </Text>
                    </MenuItem>
                </Box>
                <Line variant="Surface" size="300" />
                <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
                    <UseStateProvider initial={false}>
                        {(promptLeave, setPromptLeave) => (
                            <>
                                <MenuItem
                                    onClick={() => setPromptLeave(true)}
                                    variant="Critical"
                                    fill="None"
                                    size="300"
                                    after={<Icon size={1} path={mdiArrowLeft} />}
                                    radii="300"
                                    aria-pressed={promptLeave}
                                >
                                    <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
                                        {getText('room_header.leave')}
                                    </Text>
                                </MenuItem>
                                {promptLeave && (
                                    <LeaveRoomPrompt
                                        roomId={room.roomId}
                                        onDone={requestClose}
                                        onCancel={() => setPromptLeave(false)}
                                    />
                                )}
                            </>
                        )}
                    </UseStateProvider>
                </Box>
            </Menu>
        );
    }
);

type RoomViewHeaderProps = {
    handleCall: any;
};

export function RoomViewHeader({
    handleCall
}: RoomViewHeaderProps) {
    const navigate = useNavigate();
    const mx = useMatrixClient();
    const screenSize = useScreenSizeContext();
    const room = useRoom();
    const space = useSpaceOptionally();
    const [menuAnchor, setMenuAnchor] = useState<RectCords>();
    const mDirects = useAtomValue(mDirectAtom);

    const encryptionEvent = useStateEvent(room, StateEvent.RoomEncryption);
    const encryptedRoom = !!encryptionEvent;
    const avatarMxc = useRoomAvatar(room, mDirects.has(room.roomId));
    const name = useRoomName(room);
    const topic = useRoomTopic(room);
    const [statusMessage, setStatusMessage] = useState('');
    const [showPinned, setShowPinned] = useState(false);
    const [pinned, setPinned]: [any[], any] = useState([]);
    const avatarUrl = avatarMxc ? mx.mxcUrlToHttp(avatarMxc, 96, 96, 'crop') ?? undefined : undefined;

    const setPeopleDrawer = useSetSetting(settingsAtom, 'isPeopleDrawer');
    const location = useLocation();
    const currentPath = joinPathComponent(location);

    const handleSearchClick = () => {
        const searchParams: _SearchPathSearchParams = {
            rooms: room.roomId,
        };
        const path = space
            ? getSpaceSearchPath(getCanonicalAliasOrRoomId(mx, space.roomId))
            : getHomeSearchPath();
        navigate(withSearchParam(path, searchParams));
    };

    const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
        if (!menuAnchor)
            setMenuAnchor(evt.currentTarget.getBoundingClientRect());
        else
            setMenuAnchor(undefined);
    };

    const handleAvClick = () => {
        toggleRoomSettings(room.roomId);
    };

    const [messageLayout] = useSetting(settingsAtom, 'messageLayout');
    const [messageSpacing] = useSetting(settingsAtom, 'messageSpacing');
    const { navigateRoom, navigateSpace } = useRoomNavigate();
    const [mediaAutoLoad] = useSetting(settingsAtom, 'mediaAutoLoad');

    const htmlReactParserOptions = useMemo<HTMLReactParserOptions>(
        () =>
            getReactCustomHtmlParser(mx, room, {
                handleSpoilerClick: (evt) => {
                    const target = evt.currentTarget;
                    if (target.getAttribute('aria-pressed') === 'true') {
                        evt.stopPropagation();
                        target.setAttribute('aria-pressed', 'false');
                        target.style.cursor = 'initial';
                    }
                },
                handleMentionClick: (evt) => {
                    const target = evt.currentTarget;
                    const mentionId = target.getAttribute('data-mention-id');
                    if (typeof mentionId !== 'string') return;
                    if (isUserId(mentionId)) {
                        openProfileViewer(mentionId, room.roomId);
                        return;
                    }
                    if (isRoomId(mentionId) && mx.getRoom(mentionId)) {
                        if (mx.getRoom(mentionId)?.isSpaceRoom()) navigateSpace(mentionId);
                        else navigateRoom(mentionId);
                        return;
                    }
                    openJoinAlias(mentionId);
                },
            }),
        [mx, room, navigateRoom, navigateSpace]
    );

    const [pinnedPages, setPinnedPages] = useState(1);
    const [jumpAnchor, setJumpAnchor] = useState<RectCords>();
    const [pageNo, setPageNo] = useState(1);
    const [loadingPinList, setLoadingPinList] = useState(true);

    // officialdakari 24.07.2024 - надо зарефакторить это всё, но мне пока лень

    const updatePinnedList = async () => {
        const pinnedMessages = [];
        const timeline = room.getLiveTimeline();
        const state = timeline.getState(EventTimeline.FORWARDS);
        const pinnedEvents = state?.getStateEvents('m.room.pinned_events');

        setLoadingPinList(true);

        if (!pinnedEvents || pinnedEvents.length < 1) {
            return setPinned(
                [
                    <Text>
                        {getText('pinned.none')}
                    </Text>
                ]
            );
        }

        var { pinned }: { pinned: string[] } = pinnedEvents[pinnedEvents.length - 1].getContent();
        pinned = pinned.reverse();
        setPinnedPages(Math.ceil(pinned.length / 10));
        const index = (pageNo - 1) * 10;
        // todo optimize this
        setPinned([
            <DefaultPlaceholder />,
            <DefaultPlaceholder />,
            <DefaultPlaceholder />,
            <DefaultPlaceholder />,
            <DefaultPlaceholder />,
            <DefaultPlaceholder />,
            <DefaultPlaceholder />,
            <DefaultPlaceholder />,
            <DefaultPlaceholder />,
            <DefaultPlaceholder />,
            <DefaultPlaceholder />,
            <DefaultPlaceholder />,
            <DefaultPlaceholder />,
            <DefaultPlaceholder />
        ]);
        for (const eventId of pinned.slice(index, index + 10)) {
            var mEvent: MatrixEvent = room.findEventById(eventId) ?? new MatrixEvent(await mx.fetchRoomEvent(room.roomId, eventId));
            console.log(eventId, mEvent);
            if (!mEvent) continue;
            pinnedMessages.push(
                <Message
                    key={mEvent.getId()}
                    data-message-id={mEvent.getId()}
                    room={room}
                    mEvent={mEvent}
                    edit={false}
                    canDelete={false}
                    canSendReaction={false}
                    collapse={false}
                    highlight={false}
                    messageSpacing={messageSpacing}
                    messageLayout={messageLayout}
                    onReactionToggle={(evt: any) => null}
                    onReplyClick={(evt: any) => null}
                    onUserClick={(evt: any) => null}
                    onUsernameClick={(evt: any) => null}
                >
                    {mEvent.getType() == 'm.room.message' && <RenderMessageContent
                        displayName={mEvent.sender?.rawDisplayName || mEvent.sender?.userId || getText('generic.unknown')}
                        msgType={mEvent.getContent().msgtype ?? ''}
                        ts={mEvent.getTs()}
                        edited={false}
                        getContent={mEvent.getContent.bind(mEvent) as GetContentCallback}
                        mediaAutoLoad={true}
                        urlPreview={false}
                        htmlReactParserOptions={htmlReactParserOptions}
                    />}
                    {mEvent.getType() == 'm.sticker' && <MSticker
                        content={mEvent.getContent()}
                        renderImageContent={(props) => (
                            <ImageContent
                                {...props}
                                autoPlay={mediaAutoLoad}
                                renderImage={(p) => <Image loading="lazy" />}
                                renderViewer={(p) => <ImageViewer {...p} />}
                            />
                        )}
                    />}
                </Message>
            );
        }
        setPinned(pinnedMessages);
        setLoadingPinList(false);
    };

    const handlePinnedClick = () => {
        setPageNo(1);
        setShowPinned(true);
        updatePinnedList();
    };

    const handlePinnedClose = () => {
        setShowPinned(false);
    };

    const getPresenceFn = usePresences();

    const handlePrevPage = () => {
        if (pageNo <= 1 || loadingPinList) return;
        setPageNo(pageNo - 1);
        updatePinnedList();
    };

    const handleNextPage = () => {
        if (pageNo >= pinnedPages || loadingPinList) return;
        setPageNo(pageNo + 1);
        updatePinnedList();
    };

    const handleJumpSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
        evt.preventDefault();
        const jumpInput = evt.currentTarget.jumpInput as HTMLInputElement;
        if (!jumpInput) return;
        const jumpTo = parseInt(jumpInput.value, 10);
        setPageNo(Math.max(1, Math.min(pinnedPages, jumpTo)));
        setJumpAnchor(undefined);
        updatePinnedList();
    };

    const handleOpenJump: MouseEventHandler<HTMLButtonElement> = (evt) => {
        setJumpAnchor(evt.currentTarget.getBoundingClientRect());
    };

    useEffect(() => {
        const isDm = room.getDMInviter() || room.getJoinedMemberCount() == 2;
        if (isDm) {
            const userId = room.guessDMUserId();
            const presence = getPresenceFn(userId);
            if (presence)
                setStatusMessage(presence.presenceStatusMsg ?? presence.presence ?? 'offline');
        }
    }, [mx]);

    return (
        <PageHeader>
            <Overlay open={showPinned} backdrop={<OverlayBackdrop />}>
                <OverlayCenter>
                    <FocusTrap
                        focusTrapOptions={{
                            initialFocus: false,
                            onDeactivate: handlePinnedClose,
                            clickOutsideDeactivates: true
                        }}
                    >
                        <Modal variant="Surface" size="500">
                            <Header
                                style={{
                                    padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
                                    borderBottomWidth: config.borderWidth.B300,
                                }}
                                variant="Surface"
                                size="500"
                            >
                                <Box grow="Yes">
                                    <Text size="H4">{getText('pinned.title')}</Text>
                                </Box>
                                <IconButton size="300" onClick={handlePinnedClose} radii="300">
                                    <Icon size={1} path={mdiClose} />
                                </IconButton>
                            </Header>
                            <Box tabIndex={-1} direction='Column' style={{ height: 'inherit' }}>
                                <Scroll>
                                    {pinned}
                                </Scroll>
                            </Box>
                            <Header
                                as='footer'
                                className={css.PinListFooter}
                            >
                                <Chip
                                    variant="Secondary"
                                    radii="300"
                                    before={<Icon size={1} path={mdiChevronLeft} />}
                                    onClick={handlePrevPage}
                                    aria-disabled={pageNo <= 1 || loadingPinList}
                                >
                                    <Text size="B300">{getText('btn.prev')}</Text>
                                </Chip>
                                <Box grow="Yes" justifyContent="Center" alignItems="Center" gap="200">
                                    <PopOut
                                        anchor={jumpAnchor}
                                        align="Center"
                                        position="Top"
                                        content={
                                            <FocusTrap
                                                focusTrapOptions={{
                                                    initialFocus: false,
                                                    onDeactivate: () => setJumpAnchor(undefined),
                                                    clickOutsideDeactivates: true,
                                                }}
                                            >
                                                <Menu variant="Surface">
                                                    <Box
                                                        as="form"
                                                        onSubmit={handleJumpSubmit}
                                                        style={{ padding: config.space.S200 }}
                                                        direction="Column"
                                                        gap="200"
                                                    >
                                                        <Input
                                                            name="jumpInput"
                                                            size="300"
                                                            variant="Background"
                                                            defaultValue={pageNo}
                                                            min={1}
                                                            max={pinnedPages}
                                                            step={1}
                                                            outlined
                                                            type="number"
                                                            radii="300"
                                                            aria-label={getText('aria.page_number')}
                                                        />
                                                        <Button type="submit" size="300" variant="Primary" radii="300">
                                                            <Text size="B300">{getText('btn.jump_to_page')}</Text>
                                                        </Button>
                                                    </Box>
                                                </Menu>
                                            </FocusTrap>
                                        }
                                    >
                                        <Chip
                                            onClick={handleOpenJump}
                                            variant="SurfaceVariant"
                                            aria-pressed={jumpAnchor !== undefined || loadingPinList}
                                            radii="300"
                                        >
                                            <Text size="B300">{`${pageNo}/${pinnedPages}`}</Text>
                                        </Chip>
                                    </PopOut>
                                </Box>
                                <Chip
                                    variant="Primary"
                                    radii="300"
                                    after={<Icon size={1} path={mdiChevronRight} />}
                                    onClick={handleNextPage}
                                    aria-disabled={pageNo >= pinnedPages || loadingPinList}
                                >
                                    <Text size="B300">{getText('btn.next')}</Text>
                                </Chip>
                            </Header>
                        </Modal>
                    </FocusTrap>
                </OverlayCenter>
            </Overlay>
            <Box grow="Yes" gap="300">
                <Box grow="Yes" alignItems="Center" gap="300">
                    <Avatar onClick={handleAvClick} size="300">
                        <RoomAvatar
                            roomId={room.roomId}
                            src={avatarUrl}
                            alt={name}
                            renderFallback={() => (
                                <RoomIcon size="200" joinRule={room.getJoinRule() ?? JoinRule.Restricted} filled />
                            )}
                        />
                    </Avatar>
                    <Box direction="Column">
                        <Text size={(topic ?? statusMessage) ? 'H5' : 'H3'} truncate>
                            {name}
                        </Text>
                        {(topic ?? statusMessage) && (
                            <UseStateProvider initial={false}>
                                {(viewTopic, setViewTopic) => (
                                    <>
                                        <Overlay open={viewTopic} backdrop={<OverlayBackdrop />}>
                                            <OverlayCenter>
                                                <FocusTrap
                                                    focusTrapOptions={{
                                                        initialFocus: false,
                                                        clickOutsideDeactivates: true,
                                                        onDeactivate: () => setViewTopic(false),
                                                    }}
                                                >
                                                    <RoomTopicViewer
                                                        name={name}
                                                        topic={topic ?? statusMessage}
                                                        requestClose={() => setViewTopic(false)}
                                                    />
                                                </FocusTrap>
                                            </OverlayCenter>
                                        </Overlay>
                                        <Text
                                            as="button"
                                            type="button"
                                            onClick={() => setViewTopic(true)}
                                            className={css.HeaderTopic}
                                            size="T200"
                                            priority="300"
                                            truncate
                                        >
                                            {topic ?? statusMessage}
                                        </Text>
                                    </>
                                )}
                            </UseStateProvider>
                        )}
                    </Box>
                </Box>
                <Box shrink="No">
                    {!encryptedRoom && (
                        <TooltipProvider
                            position="Bottom"
                            offset={4}
                            tooltip={
                                <Tooltip>
                                    <Text>{getText('tooltip.search')}</Text>
                                </Tooltip>
                            }
                        >
                            {(triggerRef) => (
                                <IconButton ref={triggerRef} onClick={handleSearchClick}>
                                    <Icon size={1} path={mdiMagnify} />
                                </IconButton>
                            )}
                        </TooltipProvider>
                    )}
                    <TooltipProvider
                        position="Bottom"
                        offset={4}
                        tooltip={
                            <Tooltip>
                                <Text>{getText('tooltip.pinned')}</Text>
                            </Tooltip>
                        }
                    >
                        {(triggerRef) => (
                            <IconButton ref={triggerRef} onClick={handlePinnedClick}>
                               <Icon size={1} path={mdiPin} />
                            </IconButton>
                        )}
                    </TooltipProvider>
                    {screenSize === ScreenSize.Desktop && (
                        <TooltipProvider
                            position="Bottom"
                            offset={4}
                            tooltip={
                                <Tooltip>
                                    <Text>{getText('tooltip.members')}</Text>
                                </Tooltip>
                            }
                        >
                            {(triggerRef) => (
                                <IconButton ref={triggerRef} onClick={() => setPeopleDrawer((drawer) => !drawer)}>
                                    <Icon size={1} path={mdiAccount} />
                                </IconButton>
                            )}
                        </TooltipProvider>
                    )}
                    {mDirects.has(room.roomId) && (
                        <IconButton onClick={handleCall}>
                            <Icon size={1} path={mdiPhone} />
                        </IconButton>
                    )}
                    <TooltipProvider
                        position="Bottom"
                        align="End"
                        offset={4}
                        tooltip={
                            <Tooltip>
                                <Text>{getText('tooltip.more_options')}</Text>
                            </Tooltip>
                        }
                    >
                        {(triggerRef) => (
                            <IconButton onClick={handleOpenMenu} ref={triggerRef} aria-pressed={!!menuAnchor}>
                                <Icon size={1} path={mdiDotsVertical} />
                            </IconButton>
                        )}
                    </TooltipProvider>
                    <PopOut
                        anchor={menuAnchor}
                        position="Bottom"
                        align="End"
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
                                <RoomMenu
                                    room={room}
                                    linkPath={currentPath}
                                    requestClose={() => setMenuAnchor(undefined)}
                                />
                            </FocusTrap>
                        }
                    />
                </Box>
            </Box>
        </PageHeader>
    );
}