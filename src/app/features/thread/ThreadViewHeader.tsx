import React, { FormEventHandler, MouseEventHandler, ReactNode, forwardRef, useEffect, useMemo, useState } from 'react';
import FocusTrap from 'focus-trap-react';
import {
    Box,
    Avatar,
    Text,
    toRem,
    config,
    RectCords,
    Scroll,
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
import * as css from './ThreadViewHeader.css';
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
import { Message } from '../room/message';
import { Image } from '../../components/media';
import { mdiAccount, mdiAccountPlus, mdiArrowLeft, mdiCheckAll, mdiChevronLeft, mdiChevronRight, mdiClose, mdiCog, mdiDotsVertical, mdiLinkVariant, mdiMagnify, mdiPhone, mdiPin, mdiPlus, mdiVideo, mdiVideoOff, mdiWidgets } from '@mdi/js';
import Icon from '@mdi/react';
import { WidgetItem } from '../../components/widget/WidgetItem';
import { useModals } from '../../hooks/useModals';
import { confirmDialog } from '../../molecules/confirm-dialog/ConfirmDialog';
import { getIntegrationManagerURL } from '../../hooks/useIntegrationManager';
import { nameInitials } from '../../utils/common';
import { roomToParentsAtom } from '../../state/room/roomToParents';
import { AppBar, Dialog, DialogContent, DialogContentText, DialogTitle, Divider, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Pagination, Toolbar, Tooltip, Typography } from '@mui/material';
import { ArrowBack, CallEnd, Close, DoneAll, Link, MessageOutlined, MoreVert, People, PersonAdd, Phone, PushPin, Search, Settings, VideoCall, Widgets } from '@mui/icons-material';

type RoomMenuProps = {
    room: Room;
    linkPath: string;
    requestClose: () => void;
    anchorEl: HTMLElement | null;
};

type ThreadViewHeaderProps = {
    threadId: string;
};

export function ThreadViewHeader({
    threadId
}: ThreadViewHeaderProps) {
    const navigate = useNavigate();
    const { threadRootId } = useParams();
    const mx = useMatrixClient();
    const screenSize = useScreenSizeContext();
    const room = useRoom();
    const space = useSpaceOptionally();
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
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
            setMenuAnchor(evt.currentTarget);
        else
            setMenuAnchor(null);
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
            try {
                const mEvent: MatrixEvent = room.findEventById(eventId) ?? new MatrixEvent(await mx.fetchRoomEvent(room.roomId, eventId));
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
                        showGoTo
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
            } catch (error) {
                console.error(`Failed loading ${eventId}`, error);
            }
        }
        setPinned(pinnedMessages);
        setLoadingPinList(false);
    };

    const handlePinnedClick = () => {
        setPageNo(1);
        setShowPinned(true);
    };

    const getPresenceFn = usePresences();

    const handleOpenJump: MouseEventHandler<HTMLButtonElement> = (evt) => {
        setJumpAnchor(evt.currentTarget.getBoundingClientRect());
    };

    const handleBack: MouseEventHandler<HTMLButtonElement> = (evt) => {
        history.back();
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

    useEffect(() => {
        updatePinnedList();
    }, [pageNo]);

    return (
        <>
            <Dialog
                open={showPinned}
                onClose={() => setShowPinned(false)}
                scroll='body'
            >
                <AppBar sx={{ position: 'relative' }}>
                    <Toolbar>
                        <Typography flexGrow={1} component='div' variant='h6'>
                            {getText('pinned.title')}
                        </Typography>
                        <IconButton
                            onClick={() => setShowPinned(false)}
                        >
                            <Close />
                        </IconButton>
                    </Toolbar>
                </AppBar>
                <DialogContent sx={{ minWidth: '500px', minHeight: '300px' }}>
                    {pinned}
                </DialogContent>
                <Pagination count={pinnedPages} page={pageNo} onChange={(evt, page) => setPageNo(page)} sx={{ marginBottom: '10px' }} />
            </Dialog>
            <AppBar position='relative'>
                <Toolbar>
                    <Box grow="Yes" gap="300">
                        <Box shrink="No">
                            <IconButton
                                onClick={handleBack}
                            >
                                <ArrowBack />
                            </IconButton>
                        </Box>
                        <Box grow="Yes" alignItems="Center" gap="300">
                            <Avatar onClick={handleAvClick} size="400">
                                <MessageOutlined />
                            </Avatar>
                            <Box direction="Column">
                                <Text size={(topic ?? statusMessage) ? 'H5' : 'H3'} truncate>
                                    {name}
                                </Text>
                                {(topic ?? statusMessage) && (
                                    <UseStateProvider initial={false}>
                                        {(viewTopic, setViewTopic) => (
                                            <>
                                                <Dialog
                                                    open={viewTopic}
                                                    onClose={() => setViewTopic(false)}
                                                >
                                                    <RoomTopicViewer
                                                        name={name}
                                                        topic={topic ?? statusMessage}
                                                        requestClose={() => setViewTopic(false)}
                                                    />
                                                </Dialog>
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
                                <Tooltip title={getText('tooltip.search')}>
                                    <IconButton onClick={handleSearchClick}>
                                        <Search />
                                    </IconButton>
                                </Tooltip>
                            )}
                            <Tooltip title={getText('tooltip.pinned')}>
                                <IconButton onClick={handlePinnedClick}>
                                    <PushPin />
                                </IconButton>
                            </Tooltip>
                            {screenSize === ScreenSize.Desktop && (
                                <Tooltip title={getText('tooltip.members')}>
                                    <IconButton onClick={() => setPeopleDrawer((drawer) => !drawer)}>
                                        <People />
                                    </IconButton>
                                </Tooltip>
                            )}
                            {/* <Tooltip title={getText('tooltip.more_options')}>
                                <IconButton onClick={handleOpenMenu} aria-pressed={!!menuAnchor}>
                                    <MoreVert />
                                </IconButton>
                            </Tooltip> */}
                        </Box>
                    </Box>
                </Toolbar>
            </AppBar>
        </>
    );
}