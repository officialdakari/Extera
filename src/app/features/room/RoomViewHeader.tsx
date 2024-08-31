import React, { FormEventHandler, MouseEventHandler, ReactNode, forwardRef, useEffect, useMemo, useState } from 'react';
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
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { EventTimeline, EventType, JoinRule, MatrixEvent, Room } from 'matrix-js-sdk';
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
import { mdiAccount, mdiAccountPlus, mdiArrowLeft, mdiCheckAll, mdiChevronLeft, mdiChevronRight, mdiClose, mdiCog, mdiDotsVertical, mdiLinkVariant, mdiMagnify, mdiPhone, mdiPin, mdiPlus, mdiVideo, mdiVideoOff, mdiWidgets } from '@mdi/js';
import Icon from '@mdi/react';
import { WidgetItem } from '../../components/widget/WidgetItem';
import { useModals } from '../../hooks/useModals';
import { confirmDialog } from '../../molecules/confirm-dialog/ConfirmDialog';
import { getIntegrationManagerURL } from '../../hooks/useIntegrationManager';
import { nameInitials } from '../../utils/common';
import { roomToParentsAtom } from '../../state/room/roomToParents';

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
        const { getPowerLevel, canDoAction, canSendEvent } = usePowerLevelsAPI(powerLevels);
        const canInvite = canDoAction('invite', getPowerLevel(mx.getUserId() ?? ''));
        const myUserId = mx.getUserId();
        const timeline = room.getLiveTimeline();
        const state = timeline.getState(EventTimeline.FORWARDS);
        const widgetsEvents = [
            ...(state?.getStateEvents('m.widget') ?? []),
            ...(state?.getStateEvents('im.vector.modular.widgets') ?? [])
        ];
        const videoCallEvent = widgetsEvents.find(x => x.getContent().type === 'jitsi' || x.getContent().type === 'm.jitsi');

        const canRedact = myUserId
            ? canDoAction('redact', getPowerLevel(myUserId))
            : false;

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

        const endJitsi = () => {
            const evs = widgetsEvents.filter(x => x.getContent().type === 'jitsi' || x.getContent().type === 'm.jitsi');
            for (const ev of evs) {
                const eventId = ev.getId();
                if (!eventId) continue;
                mx.redactEvent(room.roomId, eventId);
            }
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
                    {canRedact && videoCallEvent && (
                        <MenuItem
                            onClick={endJitsi}
                            variant="Critical"
                            fill="None"
                            size="300"
                            after={<Icon size={1} path={mdiVideoOff} />}
                            radii="300"
                            disabled={!canInvite}
                        >
                            <Text style={{ flexGrow: 1 }} as="span" size="T300">
                                {getText('room_header.end_meeting')}
                            </Text>
                        </MenuItem>
                    )}
                </Box>
            </Menu>
        );
    }
);

type RoomViewHeaderProps = {
    handleCall: any;
    handleVideoCall: any;
};

export function RoomViewHeader({
    handleCall,
    handleVideoCall
}: RoomViewHeaderProps) {
    const navigate = useNavigate();
    const {threadRootId} = useParams();
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
    const [showWidgets, setShowWidgets] = useState(false);
    const [pinned, setPinned] = useState<ReactNode[]>([]);
    const [widgets, setWidgets] = useState<ReactNode[]>([]);
    const avatarUrl = avatarMxc ? mx.mxcUrlToHttp(avatarMxc, 96, 96, 'crop') ?? undefined : undefined;
    const roomToParents = useAtomValue(roomToParentsAtom);
    const powerLevels = usePowerLevelsContext();
    const { getPowerLevel, canSendEvent, canSendStateEvent, canDoAction } = usePowerLevelsAPI(powerLevels);
    const myUserId = mx.getUserId();
    const timeline = room.getLiveTimeline();
    const state = timeline.getState(EventTimeline.FORWARDS);
    const widgetsEvents = [
        ...(state?.getStateEvents('m.widget') ?? []),
        ...(state?.getStateEvents('im.vector.modular.widgets') ?? [])
    ];
    const canEditWidgets = myUserId
        ? canSendStateEvent('im.vector.modular.widgets', getPowerLevel(myUserId))
        : false;

    const canRedact = myUserId
        ? canDoAction('redact', getPowerLevel(myUserId))
        : false;

    const videoCallEvent = widgetsEvents.find(x => x.getContent().type === 'jitsi' || x.getContent().type === 'm.jitsi');

    const showVideoCallButton = canEditWidgets || videoCallEvent;

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
    const modals = useModals();

    // officialdakari 24.07.2024 - надо зарефакторить это всё, но мне пока лень

    const handleWidgetsClick = async () => {
        const userId = mx.getUserId();
        if (typeof userId !== 'string') return;
        const profile = mx.getUser(userId);
        const timeline = room.getLiveTimeline();
        const state = timeline.getState(EventTimeline.FORWARDS);
        const widgets = [
            ...(state?.getStateEvents('m.widget') ?? []),
            ...(state?.getStateEvents('im.vector.modular.widgets') ?? [])
        ];
        const widgetList: ReactNode[] = [];
        console.log(widgets);
        if (!widgets || widgets.length < 1) {
            setWidgets(
                [
                    <Text>{getText('widgets.none')}</Text>
                ]
            );
        } else {
            for (const ev of widgets) {
                const content = ev.getContent();
                if (typeof content.url !== 'string') continue;
                const data = {
                    matrix_user_id: userId,
                    matrix_room_id: room.roomId,
                    matrix_display_name: profile?.displayName ?? userId,
                    matrix_avatar_url: profile?.avatarUrl && mx.mxcUrlToHttp(profile?.avatarUrl),
                    ...content.data
                };
                var url = `${content.url}`; // Should not be a reference
                for (const key in data) {
                    if (typeof data[key] === 'string') {
                        url = url.replaceAll(`$${key}`, data[key]);
                    }
                }
                if (!url.startsWith('https://')) continue;
                const r = await getIntegrationManagerURL(mx, room);
                if (url.startsWith('https://scalar.vector.im') && r?.token) url += `&scalar_token=${r.token}`;
                const openWidget = () => {
                    setShowWidgets(false);
                    modals.addModal({
                        allowClose: true,
                        title: content.name ?? 'Widget',
                        node: (
                            <iframe
                                style={{ border: 'none', width: '100%', height: '100%' }}
                                allow="autoplay; camera; clipboard-write; compute-pressure; display-capture; hid; microphone; screen-wake-lock"
                                allowFullScreen
                                data-widget-room-id={ev.getRoomId()}
                                data-widget-event-id={ev.getId()}
                                data-widget-name={content.name}
                                data-widget-room-name={room.name}
                                data-widget={true}
                                src={url}
                            />
                        ),
                        externalUrl: url
                    });
                };
                const removeWidget = async () => {
                    setShowWidgets(false);
                    if (!(await confirmDialog(
                        getText('confirm.remove_widget.title'),
                        getText('confirm.remove_widget.question'),
                        getText('btn.widget.remove'),
                        'danger'
                    ))) return;
                    const evId = ev.getId();
                    if (!evId) return;
                    mx.redactEvent(room.roomId, evId);
                };
                console.debug(`Can redact: ${canRedact}`);
                widgetList.push(
                    <WidgetItem onClick={openWidget} onRemove={canRedact ? removeWidget : undefined} name={typeof content.name === 'string' ? content.name : undefined} url={url} type={content.type} />
                );
            }
        }
        setWidgets(widgetList);
        setShowWidgets(true);
    };

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
                    onDiscussClick={(evt: any) => null}
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

    const handleWidgetsClose = () => {
        setShowWidgets(false);
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

    const handleBack: MouseEventHandler<HTMLButtonElement> = (evt) => {
        history.back();
    };

    const handleScalar = async () => {
        setShowWidgets(false);
        const r = await getIntegrationManagerURL(mx, room);
        if (!r?.url) return;
        const { url } = r;
        modals.addModal({
            allowClose: true,
            title: 'Integrations',
            node: (
                <iframe
                    style={{ border: 'none', width: '100%', height: '100%' }}
                    allow="autoplay; camera; clipboard-write; compute-pressure; display-capture; hid; microphone; screen-wake-lock"
                    allowFullScreen
                    data-integration-manager={true}
                    src={url}
                />
            ),
            externalUrl: url
        });
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
            <Overlay open={showWidgets} backdrop={<OverlayBackdrop />}>
                <OverlayCenter>
                    <FocusTrap
                        focusTrapOptions={{
                            initialFocus: false,
                            onDeactivate: handleWidgetsClose,
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
                                    <Text size="H4">{getText('widgets.title')}</Text>
                                </Box>
                                <IconButton size="300" onClick={handleScalar} radii="300">
                                    <Icon size={1} path={mdiPlus} />
                                </IconButton>
                                <IconButton size="300" onClick={handleWidgetsClose} radii="300">
                                    <Icon size={1} path={mdiClose} />
                                </IconButton>
                            </Header>
                            <Box tabIndex={-1} direction='Column' style={{ width: 'auto', height: 'inherit' }}>
                                {widgets}
                            </Box>
                        </Modal>
                    </FocusTrap>
                </OverlayCenter>
            </Overlay>
            <Box grow="Yes" gap="300">
                <Box shrink="No">
                    <IconButton
                        variant="Background"
                        fill="None"
                        size="300"
                        radii="300"
                        onClick={handleBack}
                    >
                        <Icon size={1} path={mdiArrowLeft} />
                    </IconButton>
                </Box>
                <Box grow="Yes" alignItems="Center" gap="300">
                    <Avatar onClick={handleAvClick} size="300">
                        <RoomAvatar
                            roomId={room.roomId}
                            src={avatarUrl}
                            alt={name}
                            renderFallback={() => nameInitials(name)}
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
                                <Text>{getText('tooltip.widgets')}</Text>
                            </Tooltip>
                        }
                    >
                        {(triggerRef) => (
                            <IconButton ref={triggerRef} onClick={handleWidgetsClick}>
                                <Icon size={1} path={mdiWidgets} />
                            </IconButton>
                        )}
                    </TooltipProvider>
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
                    {!mDirects.has(room.roomId) && showVideoCallButton && (
                        <IconButton onClick={handleVideoCall}>
                            <Icon size={1} path={mdiVideo} />
                        </IconButton>
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