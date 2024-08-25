import {
    Avatar,
    Box,
    Button,
    Dialog,
    Header,
    IconButton,
    Input,
    Line,
    Menu,
    MenuItem,
    Modal,
    Overlay,
    OverlayBackdrop,
    OverlayCenter,
    PopOut,
    RectCords,
    Spinner,
    Text,
    as,
    color,
    config,
} from 'folds';
import React, {
    FormEventHandler,
    MouseEvent,
    MouseEventHandler,
    ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import FocusTrap from 'focus-trap-react';
import { useHover, useFocusWithin } from 'react-aria';
import { EventTimeline, MatrixEvent, RelationType, Room, RoomEvent } from 'matrix-js-sdk';
import { Relations } from 'matrix-js-sdk/lib/models/relations';
import classNames from 'classnames';
import {
    AvatarBase,
    BubbleLayout,
    CompactLayout,
    DefaultPlaceholder,
    ImageContent,
    MSticker,
    MessageBase,
    ModernLayout,
    Reply,
    Time,
    Username,
} from '../../../components/message';
import colorMXID from '../../../../util/colorMXID';
import {
    canEditEvent,
    getEventEdits,
    getMemberAvatarMxc,
    getMemberDisplayName,
} from '../../../utils/room';
import { getCanonicalAliasOrRoomId, getMxIdLocalPart, isRoomId, isUserId } from '../../../utils/matrix';
import { MessageLayout, MessageSpacing, settingsAtom } from '../../../state/settings';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useRecentEmoji } from '../../../hooks/useRecentEmoji';
import * as css from './styles.css';
import { EventReaders } from '../../../components/event-readers';
import { TextViewer } from '../../../components/text-viewer';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { EmojiBoard } from '../../../components/emoji-board';
import { ReactionViewer } from '../reaction-viewer';
import { MessageEditor } from './MessageEditor';
import { UserAvatar } from '../../../components/user-avatar';
import { useSpaceOptionally } from '../../../hooks/useSpace';
import { useDirectSelected } from '../../../hooks/router/useDirectSelected';
import {
    getDirectRoomPath,
    getHomeRoomPath,
    getOriginBaseUrl,
    getSpaceRoomPath,
    withOriginBaseUrl,
} from '../../../pages/pathUtils';
import { copyToClipboard } from '../../../utils/dom';
import { useClientConfig } from '../../../hooks/useClientConfig';
import { useSetting } from '../../../state/hooks/settings';
import { RenderMessageContent } from '../../../components/RenderMessageContent';
import { GetContentCallback } from '../../../../types/matrix/room';
import { HTMLReactParserOptions } from 'html-react-parser';
import { openJoinAlias, openProfileViewer } from '../../../../client/action/navigation';
import { getReactCustomHtmlParser } from '../../../plugins/react-custom-html-parser';
import { useRoomNavigate } from '../../../hooks/useRoomNavigate';
import { ImageViewer } from '../../../components/image-viewer';
import { Image } from '../../../components/media';
import { getText } from '../../../../lang';
import Icon from '@mdi/react';
import { mdiAccount, mdiAlertCircleOutline, mdiCheck, mdiCheckAll, mdiClose, mdiCodeBraces, mdiDelete, mdiDotsVertical, mdiEmoticon, mdiEmoticonPlus, mdiLinkVariant, mdiPencil, mdiPin, mdiPinOff, mdiReply, mdiRestore } from '@mdi/js';
import { useBackButton } from '../../../hooks/useBackButton';

export type ReactionHandler = (keyOrMxc: string, shortcode: string) => void;

type MessageQuickReactionsProps = {
    onReaction: ReactionHandler;
};
export const MessageQuickReactions = as<'div', MessageQuickReactionsProps>(
    ({ onReaction, ...props }, ref) => {
        const mx = useMatrixClient();
        const recentEmojis = useRecentEmoji(mx, 4);

        if (recentEmojis.length === 0) return <span />;
        return (
            <>
                <Box
                    style={{ padding: config.space.S200 }}
                    alignItems="Center"
                    justifyContent="Center"
                    gap="200"
                    {...props}
                    ref={ref}
                >
                    {recentEmojis.map((emoji) => (
                        <IconButton
                            key={emoji.unicode}
                            className={css.MessageQuickReaction}
                            size="300"
                            variant="SurfaceVariant"
                            radii="Pill"
                            title={emoji.shortcode}
                            aria-label={emoji.shortcode}
                            onClick={() => onReaction(emoji.unicode, emoji.shortcode)}
                        >
                            <Text size="T500">{emoji.unicode}</Text>
                        </IconButton>
                    ))}
                </Box>
                <Line size="300" />
            </>
        );
    }
);

export const MessageAllReactionItem = as<
    'button',
    {
        room: Room;
        relations: Relations;
        onClose?: () => void;
    }
>(({ room, relations, onClose, ...props }, ref) => {
    const [open, setOpen] = useState(false);

    const handleClose = () => {
        setOpen(false);
        onClose?.();
    };

    return (
        <>
            <Overlay
                onContextMenu={(evt: any) => {
                    evt.stopPropagation();
                }}
                open={open}
                backdrop={<OverlayBackdrop />}
            >
                <OverlayCenter>
                    <FocusTrap
                        focusTrapOptions={{
                            initialFocus: false,
                            returnFocusOnDeactivate: false,
                            onDeactivate: () => handleClose(),
                            clickOutsideDeactivates: true,
                        }}
                    >
                        <Modal variant="Surface" size="300">
                            <ReactionViewer
                                room={room}
                                relations={relations}
                                requestClose={() => setOpen(false)}
                            />
                        </Modal>
                    </FocusTrap>
                </OverlayCenter>
            </Overlay>
            <MenuItem
                size="300"
                after={<Icon size={1} path={mdiEmoticon} />}
                radii="300"
                onClick={() => setOpen(true)}
                {...props}
                ref={ref}
                aria-pressed={open}
            >
                <Text className={css.MessageMenuItemText} as="span" size="T300" truncate>
                    {getText('msg_menu.view_reactions')}
                </Text>
            </MenuItem>
        </>
    );
});

export const MessageReadReceiptItem = as<
    'button',
    {
        room: Room;
        eventId: string;
        onClose?: () => void;
    }
>(({ room, eventId, onClose, ...props }, ref) => {
    const [open, setOpen] = useState(false);

    const handleClose = () => {
        setOpen(false);
        onClose?.();
    };

    useBackButton(handleClose);

    return (
        <>
            <Overlay open={open} backdrop={<OverlayBackdrop />}>
                <OverlayCenter>
                    <FocusTrap
                        focusTrapOptions={{
                            initialFocus: false,
                            onDeactivate: handleClose,
                            clickOutsideDeactivates: true,
                        }}
                    >
                        <Modal variant="Surface" size="300">
                            <EventReaders room={room} eventId={eventId} requestClose={handleClose} />
                        </Modal>
                    </FocusTrap>
                </OverlayCenter>
            </Overlay>
            <MenuItem
                size="300"
                after={<Icon size={1} path={mdiCheckAll} />}
                radii="300"
                onClick={() => setOpen(true)}
                {...props}
                ref={ref}
                aria-pressed={open}
            >
                <Text className={css.MessageMenuItemText} as="span" size="T300" truncate>
                    {getText('msg_menu.read_receipts')}
                </Text>
            </MenuItem>
        </>
    );
});

export const MessageSourceCodeItem = as<
    'button',
    {
        room: Room;
        mEvent: MatrixEvent;
        onClose?: () => void;
    }
>(({ room, mEvent, onClose, ...props }, ref) => {
    const [open, setOpen] = useState(false);

    const getContent = (evt: MatrixEvent) =>
        evt.isEncrypted()
            ? {
                [`<== DECRYPTED_EVENT ==>`]: evt.getEffectiveEvent(),
                [`<== ORIGINAL_EVENT ==>`]: evt.event,
            }
            : evt.event;

    const getEventText = (): string => {
        const evtId = mEvent.getId()!;
        const evtTimeline = room.getTimelineForEvent(evtId);
        const edits =
            evtTimeline &&
            getEventEdits(evtTimeline.getTimelineSet(), evtId, mEvent.getType())?.getRelations();

        if (!edits) return JSON.stringify(getContent(mEvent), null, 2);

        const content: Record<string, unknown> = {
            '<== MAIN_EVENT ==>': getContent(mEvent),
        };

        edits.forEach((editEvt, index) => {
            content[`<== REPLACEMENT_EVENT_${index + 1} ==>`] = getContent(editEvt);
        });

        return JSON.stringify(content, null, 2);
    };

    const handleClose = () => {
        setOpen(false);
        onClose?.();
    };

    useBackButton(handleClose);

    return (
        <>
            <Overlay open={open} backdrop={<OverlayBackdrop />}>
                <OverlayCenter>
                    <FocusTrap
                        focusTrapOptions={{
                            initialFocus: false,
                            onDeactivate: handleClose,
                            clickOutsideDeactivates: true,
                        }}
                    >
                        <Modal variant="Surface" size="500">
                            <TextViewer
                                name="Source Code"
                                langName="json"
                                text={getEventText()}
                                requestClose={handleClose}
                            />
                        </Modal>
                    </FocusTrap>
                </OverlayCenter>
            </Overlay>
            <MenuItem
                size="300"
                after={<Icon size={1} path={mdiCodeBraces} />}
                radii="300"
                onClick={() => setOpen(true)}
                {...props}
                ref={ref}
                aria-pressed={open}
            >
                <Text className={css.MessageMenuItemText} as="span" size="T300" truncate>
                    {getText('msg_menu.view_source')}
                </Text>
            </MenuItem>
        </>
    );
});

export const MessagePinItem = as<
    'button',
    {
        room: Room;
        mEvent: MatrixEvent;
        onClose?: () => void;
    }
>(({ room, mEvent, onClose, ...props }, ref) => {
    const mx = useMatrixClient();
    const timeline = room.getLiveTimeline();
    const state = timeline.getState(EventTimeline.FORWARDS);
    const eventId = mEvent.getId();
    const pinnedEvents = state?.getStateEvents('m.room.pinned_events');
    var isPinned = false;
    var pinned: string[] = [];

    if (pinnedEvents && pinnedEvents.length > 0 && typeof eventId === 'string') {
        pinned = pinnedEvents[pinnedEvents.length - 1].getContent().pinned;
        isPinned = pinned.includes(eventId);
    }

    const handlePin = async () => {
        if (onClose) onClose();
        if (!eventId) return;
        pinned.push(eventId);
        await mx.sendStateEvent(room.roomId, 'm.room.pinned_events', {
            pinned
        });
    };

    const handleUnpin = async () => {
        if (onClose) onClose();
        if (!eventId) return;
        pinned = pinned.filter(x => x !== eventId);
        await mx.sendStateEvent(room.roomId, 'm.room.pinned_events', {
            pinned
        });
    };

    return (
        <MenuItem
            size="300"
            after={<Icon size={1} path={isPinned ? mdiPinOff : mdiPin} />}
            radii="300"
            {...props}
            ref={ref}
            onClick={isPinned ? handleUnpin : handlePin}
        >
            <Text className={css.MessageMenuItemText} as="span" size="T300">
                {getText(isPinned ? 'msg_menu.unpin' : 'msg_menu.pin')}
            </Text>
        </MenuItem>
    );
});

export const MessageRecoverItem = as<
    'button',
    {
        room: Room;
        mEvent: MatrixEvent;
        onClose?: () => void;
    }
>(({ room, mEvent, onClose, ...props }, ref) => {
    const mx = useMatrixClient();
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

    const [open, setOpen] = useState(false);
    const [message, setMessage]: [any, any] = useState(
        <DefaultPlaceholder />
    );
    const [messageLayout] = useSetting(settingsAtom, 'messageLayout');
    const [messageSpacing] = useSetting(settingsAtom, 'messageSpacing');

    const findReported = async () => {
        const token = mx.getAccessToken();
        const base = mx.baseUrl;
        const response1 = await fetch(`${base}/_synapse/admin/v1/event_reports?dir=b&from=0&limit=10&order_by=received_ts`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        if (!response1.ok) return null;
        const re1j = await response1.json();
        console.log(re1j);
        const { event_reports }: { event_reports: any[] } = re1j;
        console.log(event_reports);
        const report = event_reports.find(x => x.event_id == mEvent.getId());
        console.log(report);
        if (!report) return null;
        const { id } = report;
        const response2 = await fetch(`${base}/_synapse/admin/v1/event_reports/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        if (!response2.ok) return null;
        const { event_json } = await response2.json();
        return event_json;
    };

    const handleClick = async () => {
        setOpen(true);
        if (!(await mx.isSynapseAdministrator())) {
            return setMessage(
                getText('error.recover')
            );
        }
        const roomId = room.roomId;
        const eventId = mEvent.getId();
        if (!roomId) return console.log('room id null');
        if (!eventId) return console.log('no event id');
        var json = await findReported();
        if (!json) {
            await mx.reportEvent(roomId, eventId, -100, 'Extera Redacted Event Recover');
        }
        json = await findReported();
        if (!json) return;
        const event = new MatrixEvent(json);
        setMessage(
            <Message
                key={event.getId()}
                data-message-id={eventId}
                room={room}
                mEvent={event}
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
                {event.getType() == 'm.room.message' && <RenderMessageContent
                    displayName={event.sender?.rawDisplayName || event.sender?.userId || getText('generic.unknown')}
                    msgType={event.getContent().msgtype ?? ''}
                    ts={event.getTs()}
                    edited={false}
                    getContent={event.getContent.bind(event) as GetContentCallback}
                    mediaAutoLoad={true}
                    urlPreview={false}
                    htmlReactParserOptions={htmlReactParserOptions}
                />}
                {event.getType() == 'm.sticker' && <MSticker
                    content={event.getContent()}
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
    };

    const handleClose = () => {
        setOpen(false);
        setMessage(null);
        onClose?.();
    };

    useBackButton(handleClose);

    return (
        <>
            <Overlay open={open} backdrop={<OverlayBackdrop />}>
                <OverlayCenter>
                    <FocusTrap
                        focusTrapOptions={{
                            initialFocus: false,
                            onDeactivate: handleClose,
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
                                    <Text size="H4">{getText('recovered.title')}</Text>
                                </Box>
                                <IconButton size="300" onClick={handleClose} radii="300">
                                    <Icon size={1} path={mdiClose} />
                                </IconButton>
                            </Header>
                            {message}
                        </Modal>
                    </FocusTrap>
                </OverlayCenter>
            </Overlay>
            <MenuItem
                size="300"
                after={<Icon size={1} path={mdiRestore} />}
                radii="300"
                onClick={handleClick}
                {...props}
                ref={ref}
                aria-pressed={open}
            >
                <Text className={css.MessageMenuItemText} as="span" size="T300" truncate>
                    {getText('msg_menu.recover')}
                </Text>
            </MenuItem>
        </>
    );
});

export const MessageCopyLinkItem = as<
    'button',
    {
        room: Room;
        mEvent: MatrixEvent;
        onClose?: () => void;
    }
>(({ room, mEvent, onClose, ...props }, ref) => {
    const mx = useMatrixClient();

    const handleCopy = () => {
        const roomIdOrAlias = getCanonicalAliasOrRoomId(mx, room.roomId);
        copyToClipboard(`https://matrix.to/#/${roomIdOrAlias}/${mEvent.getId()}`);
        onClose?.();
    };
    return (
        <MenuItem
            size="300"
            after={<Icon size={1} path={mdiLinkVariant} />}
            radii="300"
            onClick={handleCopy}
            {...props}
            ref={ref}
        >
            <Text className={css.MessageMenuItemText} as="span" size="T300" truncate>
                {getText('msg_menu.copy_link')}
            </Text>
        </MenuItem>
    );
});

export const MessageDeleteItem = as<
    'button',
    {
        room: Room;
        mEvent: MatrixEvent;
        onClose?: () => void;
    }
>(({ room, mEvent, onClose, ...props }, ref) => {
    const mx = useMatrixClient();
    const [open, setOpen] = useState(false);

    const [deleteState, deleteMessage] = useAsyncCallback(
        useCallback(
            (eventId: string, reason?: string) => {
                mx.relations(room.roomId, eventId, RelationType.Replace)
                    .then(({events}) => {
                        for (const ev of events) {
                            const evId = ev.getId();
                            if (!evId) continue;
                            mx.redactEvent(room.roomId, evId, undefined, {reason});
                        }
                    });
                return mx.redactEvent(room.roomId, eventId, undefined, {
                    reason
                });
            },
            [mx, room]
        )
    );

    const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
        evt.preventDefault();
        const eventId = mEvent.getId();
        if (
            !eventId ||
            deleteState.status === AsyncStatus.Loading ||
            deleteState.status === AsyncStatus.Success
        )
            return;
        const target = evt.target as HTMLFormElement | undefined;
        const reasonInput = target?.reasonInput as HTMLInputElement | undefined;
        const reason = reasonInput && reasonInput.value.trim();
        deleteMessage(eventId, reason);
    };

    const handleClose = () => {
        setOpen(false);
        onClose?.();
    };

    return (
        <>
            <Overlay open={open} backdrop={<OverlayBackdrop />}>
                <OverlayCenter>
                    <FocusTrap
                        focusTrapOptions={{
                            initialFocus: false,
                            onDeactivate: handleClose,
                            clickOutsideDeactivates: true,
                        }}
                    >
                        <Dialog variant="Surface">
                            <Header
                                style={{
                                    padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
                                    borderBottomWidth: config.borderWidth.B300,
                                }}
                                variant="Surface"
                                size="500"
                            >
                                <Box grow="Yes">
                                    <Text size="H4">{getText('msg_redact.title')}</Text>
                                </Box>
                                <IconButton size="300" onClick={handleClose} radii="300">
                                    <Icon size={1} path={mdiClose} />
                                </IconButton>
                            </Header>
                            <Box
                                as="form"
                                onSubmit={handleSubmit}
                                style={{ padding: config.space.S400 }}
                                direction="Column"
                                gap="400"
                            >
                                <Text priority="400">
                                    {getText('msg_redact.subtitle')}
                                </Text>
                                <Box direction="Column" gap="100">
                                    <Text size="L400">
                                        {getText('msg_redact.reason.1')}
                                        <Text as="span" size="T200">
                                            {getText('msg_redact.reason.2')}
                                        </Text>
                                    </Text>
                                    <Input name="reasonInput" variant="Background" autoComplete='off' />
                                    {deleteState.status === AsyncStatus.Error && (
                                        <Text style={{ color: color.Critical.Main }} size="T300">
                                            {getText('error.redact_msg')}
                                        </Text>
                                    )}
                                </Box>
                                <Button
                                    type="submit"
                                    variant="Critical"
                                    before={
                                        deleteState.status === AsyncStatus.Loading ? (
                                            <Spinner fill="Solid" variant="Critical" size="200" />
                                        ) : undefined
                                    }
                                    aria-disabled={deleteState.status === AsyncStatus.Loading}
                                >
                                    <Text size="B400">
                                        {getText(deleteState.status === AsyncStatus.Loading ? 'msg_redact.processing' : 'btn.msg_redact')}
                                    </Text>
                                </Button>
                            </Box>
                        </Dialog>
                    </FocusTrap>
                </OverlayCenter>
            </Overlay>
            <Button
                variant="Critical"
                fill="None"
                size="300"
                after={<Icon size={1} path={mdiDelete} />}
                radii="300"
                onClick={() => setOpen(true)}
                aria-pressed={open}
                {...props}
                ref={ref}
            >
                <Text className={css.MessageMenuItemText} as="span" size="T300" truncate>
                    {getText('msg_menu.redact')}
                </Text>
            </Button>
        </>
    );
});

export const MessageReportItem = as<
    'button',
    {
        room: Room;
        mEvent: MatrixEvent;
        onClose?: () => void;
    }
>(({ room, mEvent, onClose, ...props }, ref) => {
    const mx = useMatrixClient();
    const [open, setOpen] = useState(false);

    const [reportState, reportMessage] = useAsyncCallback(
        useCallback(
            (eventId: string, score: number, reason: string) =>
                mx.reportEvent(room.roomId, eventId, score, reason),
            [mx, room]
        )
    );

    const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
        evt.preventDefault();
        const eventId = mEvent.getId();
        if (
            !eventId ||
            reportState.status === AsyncStatus.Loading ||
            reportState.status === AsyncStatus.Success
        )
            return;
        const target = evt.target as HTMLFormElement | undefined;
        const reasonInput = target?.reasonInput as HTMLInputElement | undefined;
        const reason = reasonInput && reasonInput.value.trim();
        if (reasonInput) reasonInput.value = '';
        reportMessage(eventId, reason ? -100 : -50, reason || 'No reason provided');
    };

    const handleClose = () => {
        setOpen(false);
        onClose?.();
    };

    return (
        <>
            <Overlay open={open} backdrop={<OverlayBackdrop />}>
                <OverlayCenter>
                    <FocusTrap
                        focusTrapOptions={{
                            initialFocus: false,
                            onDeactivate: handleClose,
                            clickOutsideDeactivates: true,
                        }}
                    >
                        <Dialog variant="Surface">
                            <Header
                                style={{
                                    padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
                                    borderBottomWidth: config.borderWidth.B300,
                                }}
                                variant="Surface"
                                size="500"
                            >
                                <Box grow="Yes">
                                    <Text size="H4">{getText('msg_report.title')}</Text>
                                </Box>
                                <IconButton size="300" onClick={handleClose} radii="300">
                                    <Icon size={1} path={mdiClose} />
                                </IconButton>
                            </Header>
                            <Box
                                as="form"
                                onSubmit={handleSubmit}
                                style={{ padding: config.space.S400 }}
                                direction="Column"
                                gap="400"
                            >
                                <Text priority="400">
                                    {getText('msg_report.subtitle')}
                                </Text>
                                <Box direction="Column" gap="100">
                                    <Text size="L400">{getText('msg_report.reason')}</Text>
                                    <Input name="reasonInput" variant="Background" required />
                                    {reportState.status === AsyncStatus.Error && (
                                        <Text style={{ color: color.Critical.Main }} size="T300">
                                            {getText('error.msg_report')}
                                        </Text>
                                    )}
                                    {reportState.status === AsyncStatus.Success && (
                                        <Text style={{ color: color.Success.Main }} size="T300">
                                            {getText('success.msg_report')}
                                        </Text>
                                    )}
                                </Box>
                                <Button
                                    type="submit"
                                    variant="Critical"
                                    before={
                                        reportState.status === AsyncStatus.Loading ? (
                                            <Spinner fill="Solid" variant="Critical" size="200" />
                                        ) : undefined
                                    }
                                    aria-disabled={
                                        reportState.status === AsyncStatus.Loading ||
                                        reportState.status === AsyncStatus.Success
                                    }
                                >
                                    <Text size="B400">
                                        {getText(reportState.status === AsyncStatus.Loading ? 'msg_report.processing' : 'btn.msg_report')}
                                    </Text>
                                </Button>
                            </Box>
                        </Dialog>
                    </FocusTrap>
                </OverlayCenter>
            </Overlay>
            <Button
                variant="Critical"
                fill="None"
                size="300"
                after={<Icon size={1} path={mdiAlertCircleOutline} />}
                radii="300"
                onClick={() => setOpen(true)}
                aria-pressed={open}
                {...props}
                ref={ref}
            >
                <Text className={css.MessageMenuItemText} as="span" size="T300">
                    {getText('btn.msg_report')}
                </Text>
            </Button>
        </>
    );
});

export type MessageProps = {
    room: Room;
    mEvent: MatrixEvent;
    collapse: boolean;
    highlight: boolean;
    edit?: boolean;
    canDelete?: boolean;
    canPin?: boolean;
    canSendReaction?: boolean;
    imagePackRooms?: Room[];
    relations?: Relations;
    messageLayout: MessageLayout;
    messageSpacing: MessageSpacing;
    onUserClick: MouseEventHandler<HTMLButtonElement>;
    onUsernameClick: MouseEventHandler<HTMLButtonElement>;
    onReplyClick: MouseEventHandler<HTMLButtonElement>;
    onEditId?: (eventId?: string) => void;
    onReactionToggle: (targetEventId: string, key: string, shortcode?: string) => void;
    reply?: ReactNode;
    reactions?: ReactNode;
};
export const Message = as<'div', MessageProps>(
    (
        {
            className,
            room,
            mEvent,
            collapse,
            highlight,
            edit,
            canDelete,
            canPin,
            canSendReaction,
            imagePackRooms,
            relations,
            messageLayout,
            messageSpacing,
            onUserClick,
            onUsernameClick,
            onReplyClick,
            onReactionToggle,
            onEditId,
            reply,
            reactions,
            children,
            ...props
        },
        ref
    ) => {
        const mx = useMatrixClient();
        const senderId = mEvent.getSender() ?? '';
        const userId = mx.getUserId() ?? '';
        const [hover, setHover] = useState(false);
        const { hoverProps } = useHover({ onHoverChange: setHover });
        const { focusWithinProps } = useFocusWithin({ onFocusWithinChange: setHover });
        const [tgRename] = useSetting(settingsAtom, 'extera_renameTgBot');
        const [menuAnchor, setMenuAnchor] = useState<RectCords>();
        const [emojiBoardAnchor, setEmojiBoardAnchor] = useState<RectCords>();

        const content = mEvent.getContent();

        var senderDisplayName =
            getMemberDisplayName(room, senderId) ?? getMxIdLocalPart(senderId) ?? senderId;
        var senderAvatarMxc = getMemberAvatarMxc(room, senderId);

        if (tgRename && room.name != 'Telegram bridge bot' && mEvent.getContent().msgtype != 'm.notice') {
            if (senderDisplayName == 'Telegram bridge bot') {
                senderDisplayName = room.name;
                senderAvatarMxc = room.getMxcAvatarUrl() ?? senderAvatarMxc;
            }
        }

        const headerJSX = !collapse && (
            <Box
                gap="300"
                direction={messageLayout === 1 ? 'RowReverse' : 'Row'}
                justifyContent="SpaceBetween"
                alignItems="Baseline"
                grow="Yes"
            >
                {(messageLayout !== 2 || senderId !== userId) && (
                    <Username
                        as="button"
                        style={{ color: colorMXID(senderId) }}
                        data-user-id={senderId}
                        onContextMenu={onUserClick}
                        onClick={onUsernameClick}
                    >
                        <Text as="span" size={messageLayout === 2 ? 'T300' : 'T400'} truncate>
                            <b>{senderDisplayName}</b>
                        </Text>
                    </Username>
                )}
                <Box shrink="No" gap="100">
                    {messageLayout === 0 && hover && (
                        <>
                            <Text as="span" size="T200" priority="300">
                                {senderId}
                            </Text>
                            <Text as="span" size="T200" priority="300">
                                |
                            </Text>
                        </>
                    )}
                    {messageLayout !== 2 &&
                        <Time ts={mEvent.getTs()} compact={messageLayout === 1} />}
                </Box>
            </Box>
        );

        const buttons: any[] | undefined = typeof content['ru.officialdakari.extera.buttons'] == 'object' &&
            content['ru.officialdakari.extera.buttons'].filter &&
            content['ru.officialdakari.extera.buttons'].filter(
                (x: any) => typeof x.id == 'string' && typeof x.name == 'string'
            );

        const handleBtnClick = async (evt: MouseEvent<HTMLButtonElement>) => {
            const b = evt.currentTarget;
            b.disabled = true;
            if (typeof b.dataset.id !== 'string') return;
            await mx.sendEvent(room.roomId, 'ru.officialdakari.extera.button_click', {
                "m.relates_to": {
                    event_id: mEvent.getId(),
                    rel_type: 'ru.officialdakari.extera.button_click'
                },
                button_id: b.dataset.id
            });
            b.disabled = false;
        };

        const footerJSX = !collapse && buttons && buttons.length > 0 && (
            <div style={{ marginTop: '10px' }}>
                {buttons.length > 16 ?
                    (
                        <Text>{getText('msg.too_many_buttons')}</Text>
                    ) :
                    (
                        buttons.map((btn: any) =>
                            <>
                                <Button onClick={handleBtnClick} size='300' data-id={btn.id}>
                                    {btn.name}
                                </Button>
                                &nbsp;
                            </>
                        )
                    )
                }
            </div>
        );

        const avatarJSX = !collapse && messageLayout !== 1 && (
            <AvatarBase>
                <Avatar
                    className={css.MessageAvatar}
                    as="button"
                    size="300"
                    data-user-id={senderId}
                    onClick={onUserClick}
                >
                    <UserAvatar
                        userId={senderId}
                        src={
                            senderAvatarMxc
                                ? mx.mxcUrlToHttp(senderAvatarMxc, 48, 48, 'crop') ?? undefined
                                : undefined
                        }
                        alt={senderDisplayName}
                        renderFallback={() => <Icon size={1} path={mdiAccount} />}
                    />
                </Avatar>
            </AvatarBase>
        );

        const childrenRef = useRef<HTMLDivElement>(null);

        const msgContentJSX = (
            <Box direction="Column" alignSelf="Start" style={{ maxWidth: '100%' }}>
                <div style={{ width: `${childrenRef.current?.clientWidth}px`, maxWidth: `${childrenRef.current?.clientWidth}px` }}>
                    {reply}
                </div>
                {edit && onEditId ? (
                    <MessageEditor
                        style={{
                            maxWidth: '100%',
                            width: '100vw',
                        }}
                        roomId={room.roomId}
                        room={room}
                        mEvent={mEvent}
                        imagePackRooms={imagePackRooms}
                        onCancel={() => onEditId()}
                    />
                ) : (
                    <div ref={childrenRef}>
                        {children}
                    </div>
                )}
                {reactions}
            </Box>
        );

        const handleContextMenu: MouseEventHandler<HTMLDivElement> = (evt) => {
            if (evt.altKey || !window.getSelection()?.isCollapsed || edit) return;
            const tag = (evt.target as any).tagName;
            if (typeof tag === 'string' && tag.toLowerCase() === 'a') return;
            evt.preventDefault();
            setMenuAnchor({
                x: evt.clientX,
                y: evt.clientY,
                width: 0,
                height: 0,
            });
        };

        const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
            const target = evt.currentTarget.parentElement?.parentElement ?? evt.currentTarget;
            setMenuAnchor(target.getBoundingClientRect());
        };

        const closeMenu = () => {
            setMenuAnchor(undefined);
        };

        const handleOpenEmojiBoard: MouseEventHandler<HTMLButtonElement> = (evt) => {
            const target = evt.currentTarget.parentElement?.parentElement ?? evt.currentTarget;
            setEmojiBoardAnchor(target.getBoundingClientRect());
        };

        const handleAddReactions: MouseEventHandler<HTMLButtonElement> = () => {
            const rect = menuAnchor;
            closeMenu();
            // open it with timeout because closeMenu
            // FocusTrap will return focus from emojiBoard

            setTimeout(() => {
                setEmojiBoardAnchor(rect);
            }, 100);
        };

        const handleEndPoll: MouseEventHandler<HTMLButtonElement> = () => {
            const roomId = mEvent.getRoomId();
            const eventId = mEvent.getId();
            if (!roomId || !eventId) return;
            closeMenu();
            mx.sendEvent(roomId, 'org.matrix.msc3381.poll.end', {
                body: '',
                'org.matrix.msc1767.text': 'Ended poll',
                'm.relates_to': {
                    rel_type: 'm.reference',
                    event_id: eventId
                }
            });
        };

        const [delivered, setDelivered] = useState(mEvent.getId()?.startsWith('$'));

        useEffect(() => {
            const listener = (event: MatrixEvent) => {
                if (event.getId() === mEvent.getId()) {
                    setDelivered(true);
                }
            };

            if (!delivered) {
                mx.on(RoomEvent.LocalEchoUpdated, listener);
                return () => {
                    mx.off(RoomEvent.LocalEchoUpdated, listener);
                };
            }
        });

        return (
            <MessageBase
                className={classNames(delivered ? css.MessageBase : css.MessageBaseSending, className)}
                tabIndex={0}
                space={messageSpacing}
                collapse={collapse}
                highlight={highlight}
                selected={!!menuAnchor || !!emojiBoardAnchor}
                {...props}
                {...hoverProps}
                {...focusWithinProps}
                ref={ref}
            >
                {!edit && (hover || !!menuAnchor || !!emojiBoardAnchor) && (
                    <div className={css.MessageOptionsBase}>
                        <Menu className={css.MessageOptionsBar} variant="SurfaceVariant">
                            <Box gap="100">
                                {canSendReaction && (
                                    <PopOut
                                        position="Bottom"
                                        align={emojiBoardAnchor?.width === 0 ? 'Start' : 'End'}
                                        offset={emojiBoardAnchor?.width === 0 ? 0 : undefined}
                                        anchor={emojiBoardAnchor}
                                        content={
                                            <EmojiBoard
                                                imagePackRooms={imagePackRooms ?? []}
                                                returnFocusOnDeactivate={false}
                                                allowTextCustomEmoji
                                                onEmojiSelect={(key) => {
                                                    onReactionToggle(mEvent.getId()!, key);
                                                    setEmojiBoardAnchor(undefined);
                                                }}
                                                onCustomEmojiSelect={(mxc, shortcode) => {
                                                    onReactionToggle(mEvent.getId()!, mxc, shortcode);
                                                    setEmojiBoardAnchor(undefined);
                                                }}
                                                requestClose={() => {
                                                    setEmojiBoardAnchor(undefined);
                                                }}
                                            />
                                        }
                                    >
                                        <IconButton
                                            onClick={handleOpenEmojiBoard}
                                            variant="SurfaceVariant"
                                            size="300"
                                            radii="300"
                                            aria-pressed={!!emojiBoardAnchor}
                                        >
                                            <Icon size={1} path={mdiEmoticonPlus} />
                                        </IconButton>
                                    </PopOut>
                                )}
                                <IconButton
                                    onClick={onReplyClick}
                                    data-event-id={mEvent.getId()}
                                    variant="SurfaceVariant"
                                    size="300"
                                    radii="300"
                                >
                                    <Icon size={1} path={mdiReply} />
                                </IconButton>
                                {canEditEvent(mx, mEvent) && onEditId && (
                                    <IconButton
                                        onClick={() => onEditId(mEvent.getId())}
                                        variant="SurfaceVariant"
                                        size="300"
                                        radii="300"
                                    >
                                        <Icon size={1} path={mdiPencil} />
                                    </IconButton>
                                )}
                                <PopOut
                                    anchor={menuAnchor}
                                    position="Bottom"
                                    align={menuAnchor?.width === 0 ? 'Start' : 'End'}
                                    offset={menuAnchor?.width === 0 ? 0 : undefined}
                                    content={
                                        <FocusTrap
                                            focusTrapOptions={{
                                                initialFocus: false,
                                                onDeactivate: () => setMenuAnchor(undefined),
                                                clickOutsideDeactivates: true,
                                                isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
                                                isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
                                            }}
                                        >
                                            <Menu>
                                                {canSendReaction && (
                                                    <MessageQuickReactions
                                                        onReaction={(key, shortcode) => {
                                                            onReactionToggle(mEvent.getId()!, key, shortcode);
                                                            closeMenu();
                                                        }}
                                                    />
                                                )}
                                                <Box direction="Column" gap="100" className={css.MessageMenuGroup}>
                                                    {mEvent.getType() == 'org.matrix.msc3381.poll.start' && mEvent.sender?.userId == (mx.getUserId() ?? '') && (
                                                        <MenuItem
                                                            size="300"
                                                            after={<Icon size={1} path={mdiCheck} />}
                                                            radii="300"
                                                            onClick={handleEndPoll}
                                                        >
                                                            <Text
                                                                className={css.MessageMenuItemText}
                                                                as="span"
                                                                size="T300"
                                                                truncate
                                                            >
                                                                {getText('msg_menu.end_poll')}
                                                            </Text>
                                                        </MenuItem>
                                                    )}
                                                    {canSendReaction && (
                                                        <MenuItem
                                                            size="300"
                                                            after={<Icon size={1} path={mdiEmoticonPlus} />}
                                                            radii="300"
                                                            onClick={handleAddReactions}
                                                        >
                                                            <Text
                                                                className={css.MessageMenuItemText}
                                                                as="span"
                                                                size="T300"
                                                                truncate
                                                            >
                                                                {getText('msg_menu.add_reaction')}
                                                            </Text>
                                                        </MenuItem>
                                                    )}
                                                    {relations && (
                                                        <MessageAllReactionItem
                                                            room={room}
                                                            relations={relations}
                                                            onClose={closeMenu}
                                                        />
                                                    )}
                                                    <MenuItem
                                                        size="300"
                                                        after={<Icon size={1} path={mdiReply} />}
                                                        radii="300"
                                                        data-event-id={mEvent.getId()}
                                                        onClick={(evt: any) => {
                                                            onReplyClick(evt);
                                                            closeMenu();
                                                        }}
                                                    >
                                                        <Text
                                                            className={css.MessageMenuItemText}
                                                            as="span"
                                                            size="T300"
                                                            truncate
                                                        >
                                                            {getText('msg_menu.reply')}
                                                        </Text>
                                                    </MenuItem>
                                                    {canEditEvent(mx, mEvent) && onEditId && (
                                                        <MenuItem
                                                            size="300"
                                                            after={<Icon size={1} path={mdiPencil} />}
                                                            radii="300"
                                                            data-event-id={mEvent.getId()}
                                                            onClick={() => {
                                                                onEditId(mEvent.getId());
                                                                closeMenu();
                                                            }}
                                                        >
                                                            <Text
                                                                className={css.MessageMenuItemText}
                                                                as="span"
                                                                size="T300"
                                                                truncate
                                                            >
                                                                {getText('msg_menu.edit')}
                                                            </Text>
                                                        </MenuItem>
                                                    )}
                                                    <MessageReadReceiptItem
                                                        room={room}
                                                        eventId={mEvent.getId() ?? ''}
                                                        onClose={closeMenu}
                                                    />
                                                    <MessageSourceCodeItem room={room} mEvent={mEvent} onClose={closeMenu} />
                                                    {
                                                        canPin && <MessagePinItem room={room} mEvent={mEvent} onClose={closeMenu} />
                                                    }
                                                    <MessageCopyLinkItem room={room} mEvent={mEvent} onClose={closeMenu} />
                                                    {
                                                        mEvent.isRedacted() && <MessageRecoverItem room={room} mEvent={mEvent} onClose={closeMenu} />
                                                    }
                                                </Box>
                                                {((!mEvent.isRedacted() && canDelete) ||
                                                    mEvent.getSender() !== mx.getUserId()) && (
                                                        <>
                                                            <Line size="300" />
                                                            <Box direction="Column" gap="100" className={css.MessageMenuGroup}>
                                                                {!mEvent.isRedacted() && canDelete && (
                                                                    <MessageDeleteItem
                                                                        room={room}
                                                                        mEvent={mEvent}
                                                                        onClose={closeMenu}
                                                                    />
                                                                )}
                                                                {mEvent.getSender() !== mx.getUserId() && (
                                                                    <MessageReportItem
                                                                        room={room}
                                                                        mEvent={mEvent}
                                                                        onClose={closeMenu}
                                                                    />
                                                                )}
                                                            </Box>
                                                        </>
                                                    )}
                                            </Menu>
                                        </FocusTrap>
                                    }
                                >
                                    <IconButton
                                        variant="SurfaceVariant"
                                        size="300"
                                        radii="300"
                                        onClick={handleOpenMenu}
                                        aria-pressed={!!menuAnchor}
                                    >
                                        <Icon size={1} path={mdiDotsVertical} />
                                    </IconButton>
                                </PopOut>
                            </Box>
                        </Menu>
                    </div>
                )}
                {messageLayout === 1 && (
                    <CompactLayout before={headerJSX} onContextMenu={handleContextMenu}>
                        {msgContentJSX}
                        {footerJSX}
                    </CompactLayout>
                )}
                {messageLayout === 2 && (
                    <BubbleLayout before={userId !== senderId && avatarJSX} rightAligned={userId === senderId} after={<Time ts={mEvent.getTs()} compact={false} />} onContextMenu={handleContextMenu}>
                        {headerJSX}
                        {msgContentJSX}
                        {footerJSX}
                    </BubbleLayout>
                )}
                {messageLayout !== 1 && messageLayout !== 2 && (
                    <ModernLayout before={avatarJSX} onContextMenu={handleContextMenu}>
                        {headerJSX}
                        {msgContentJSX}
                        {footerJSX}
                    </ModernLayout>
                )}
            </MessageBase>
        );
    }
);

export type EventProps = {
    room: Room;
    mEvent: MatrixEvent;
    highlight: boolean;
    canDelete?: boolean;
    messageSpacing: MessageSpacing;
};
export const Event = as<'div', EventProps>(
    ({ className, room, mEvent, highlight, canDelete, messageSpacing, children, ...props }, ref) => {
        const mx = useMatrixClient();
        const [hover, setHover] = useState(false);
        const { hoverProps } = useHover({ onHoverChange: setHover });
        const { focusWithinProps } = useFocusWithin({ onFocusWithinChange: setHover });
        const [menuAnchor, setMenuAnchor] = useState<RectCords>();
        const stateEvent = typeof mEvent.getStateKey() === 'string';

        const handleContextMenu: MouseEventHandler<HTMLDivElement> = (evt) => {
            if (evt.altKey || !window.getSelection()?.isCollapsed) return;
            const tag = (evt.target as any).tagName;
            if (typeof tag === 'string' && tag.toLowerCase() === 'a') return;
            evt.preventDefault();
            setMenuAnchor({
                x: evt.clientX,
                y: evt.clientY,
                width: 0,
                height: 0,
            });
        };

        const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
            const target = evt.currentTarget.parentElement?.parentElement ?? evt.currentTarget;
            setMenuAnchor(target.getBoundingClientRect());
        };

        const closeMenu = () => {
            setMenuAnchor(undefined);
        };

        return (
            <MessageBase
                className={classNames(css.MessageBase, className)}
                tabIndex={0}
                space={messageSpacing}
                autoCollapse
                highlight={highlight}
                selected={!!menuAnchor}
                {...props}
                {...hoverProps}
                {...focusWithinProps}
                ref={ref}
            >
                {(hover || !!menuAnchor) && (
                    <div className={css.MessageOptionsBase}>
                        <Menu className={css.MessageOptionsBar} variant="SurfaceVariant">
                            <Box gap="100">
                                <PopOut
                                    anchor={menuAnchor}
                                    position="Bottom"
                                    align={menuAnchor?.width === 0 ? 'Start' : 'End'}
                                    offset={menuAnchor?.width === 0 ? 0 : undefined}
                                    content={
                                        <FocusTrap
                                            focusTrapOptions={{
                                                initialFocus: false,
                                                onDeactivate: () => setMenuAnchor(undefined),
                                                clickOutsideDeactivates: true,
                                                isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
                                                isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
                                            }}
                                        >
                                            <Menu {...props} ref={ref}>
                                                <Box direction="Column" gap="100" className={css.MessageMenuGroup}>
                                                    <MessageReadReceiptItem
                                                        room={room}
                                                        eventId={mEvent.getId() ?? ''}
                                                        onClose={closeMenu}
                                                    />
                                                    <MessageSourceCodeItem room={room} mEvent={mEvent} onClose={closeMenu} />
                                                    <MessageCopyLinkItem room={room} mEvent={mEvent} onClose={closeMenu} />
                                                </Box>
                                                {((!mEvent.isRedacted() && canDelete && !stateEvent) ||
                                                    (mEvent.getSender() !== mx.getUserId() && !stateEvent)) && (
                                                        <>
                                                            <Line size="300" />
                                                            <Box direction="Column" gap="100" className={css.MessageMenuGroup}>
                                                                {!mEvent.isRedacted() && canDelete && (
                                                                    <MessageDeleteItem
                                                                        room={room}
                                                                        mEvent={mEvent}
                                                                        onClose={closeMenu}
                                                                    />
                                                                )}
                                                                {mEvent.getSender() !== mx.getUserId() && (
                                                                    <MessageReportItem
                                                                        room={room}
                                                                        mEvent={mEvent}
                                                                        onClose={closeMenu}
                                                                    />
                                                                )}
                                                            </Box>
                                                        </>
                                                    )}
                                            </Menu>
                                        </FocusTrap>
                                    }
                                >
                                    <IconButton
                                        variant="SurfaceVariant"
                                        size="300"
                                        radii="300"
                                        onClick={handleOpenMenu}
                                        aria-pressed={!!menuAnchor}
                                    >
                                        <Icon size={1} path={mdiDotsVertical} />
                                    </IconButton>
                                </PopOut>
                            </Box>
                        </Menu>
                    </div>
                )}
                <div onContextMenu={handleContextMenu}>{children}</div>
            </MessageBase>
        );
    }
);
