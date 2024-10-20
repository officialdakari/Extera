import {
    Avatar,
    Box,
    Line,
    Text,
    as,
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
import { useHover, useFocusWithin } from 'react-aria';
import { ClientEvent, EventStatus, EventTimeline, MatrixError, MatrixEvent, MatrixEventEvent, RelationType, Room, RoomEvent, TimelineEvents } from 'matrix-js-sdk';
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
import { copyToClipboard } from '../../../utils/dom';
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
import { mdiAccount, mdiAlertCircleOutline, mdiArrowRight, mdiCancel, mdiCheck, mdiCheckAll, mdiCheckOutline, mdiClock, mdiClockOutline, mdiClose, mdiCloseCircle, mdiCodeBraces, mdiDelete, mdiDotsVertical, mdiDownload, mdiEmoticon, mdiEmoticonPlus, mdiExclamation, mdiExclamationThick, mdiLinkVariant, mdiMessage, mdiMessageOutline, mdiPencil, mdiPin, mdiPinOff, mdiReload, mdiRepeat, mdiReply, mdiRestore, mdiShare, mdiTranslate } from '@mdi/js';
import { useBackButton } from '../../../hooks/useBackButton';
import { translateContent } from '../../../utils/translation';
import { VerificationBadge } from '../../../components/verification-badge/VerificationBadge';
import { saveFile } from '../../../utils/saveFile';
import { getFileSrcUrl } from '../../../components/message/content/util';
import { FALLBACK_MIMETYPE } from '../../../utils/mimeTypes';
import { Alert, AppBar, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, IconButton, Link, ListItemIcon, ListItemText, Menu, MenuItem, TextField, Toolbar, Typography, useTheme } from '@mui/material';
import { AddReactionOutlined, ArrowBack, Cancel, CancelOutlined, Check, Close, DataObject, Delete, DeleteOutline, DoneAll, Download, Edit, EmojiEmotions, FlagOutlined, LinkOutlined, MessageOutlined, Replay, ReplyOutlined, Restore, Translate } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import { useSwipeLeft } from '../../../hooks/useSwipeLeft';
import { Feature, ServerSupport } from 'matrix-js-sdk/lib/feature';
import { useAtomValue } from 'jotai';
import { mDirectAtom } from '../../../state/mDirectList';
import { useRoomEventReaders } from '../../../hooks/useRoomEventReaders';

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
                            title={emoji.shortcode}
                            aria-label={emoji.shortcode}
                            onClick={() => onReaction(emoji.unicode, emoji.shortcode)}
                        >
                            {emoji.unicode}
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
            <Dialog open={open} onClose={handleClose}>
                <DialogContent>
                    <ReactionViewer relations={relations} requestClose={handleClose} room={room} />
                </DialogContent>
            </Dialog>
            <MenuItem
                onClick={() => setOpen(true)}
                selected={open}
            >
                <ListItemIcon>
                    <EmojiEmotions />
                </ListItemIcon>
                <ListItemText>
                    {getText('msg_menu.view_reactions')}
                </ListItemText>
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
            <Dialog
                open={open}
                onClose={handleClose}
            >
                <AppBar position='relative'>
                    <Toolbar>
                        <Typography
                            variant='h6'
                            component='div'
                            flexGrow={1}
                        >
                            {getText('event_readers.seen_by')}
                        </Typography>
                        <IconButton onClick={handleClose} edge='end'>
                            <Close />
                        </IconButton>
                    </Toolbar>
                </AppBar>
                <DialogContent sx={{ minWidth: '500px' }}>
                    <EventReaders room={room} eventId={eventId} requestClose={handleClose} />
                </DialogContent>
            </Dialog>
            <MenuItem
                onClick={() => setOpen(true)}
                selected={open}
            >
                <ListItemIcon>
                    <DoneAll />
                </ListItemIcon>
                <ListItemText>
                    {getText('msg_menu.read_receipts')}
                </ListItemText>
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
            <Dialog
                onClose={handleClose}
                open={open}
            >
                <TextViewer
                    name="Source Code"
                    langName="json"
                    text={getEventText()}
                    requestClose={handleClose}
                />
            </Dialog>
            <MenuItem
                onClick={() => setOpen(true)}
                selected={open}
            >
                <ListItemIcon>
                    <DataObject />
                </ListItemIcon>
                <ListItemText>
                    {getText('msg_menu.view_source')}
                </ListItemText>
            </MenuItem>
        </>
    );
});

export const MessageFileDownloadItem = as<
    'button',
    {
        room: Room;
        mEvent: MatrixEvent;
        onClose?: () => void;
    }
>(({ room, mEvent, onClose, ...props }, ref) => {
    const mx = useMatrixClient();
    const content = mEvent.getContent();
    const { url, filename, body } = content;
    const fileName = filename ?? body;
    const mxc = url ?? content.file?.url;
    const fileInfo = content?.info;
    const handleClick = async () => {
        const httpUrl = mx.mxcUrlToHttp(mxc, undefined, undefined, undefined, false, true, true);
        if (!httpUrl) return onClose?.();
        const Url = await getFileSrcUrl(
            httpUrl,
            fileInfo?.mimetype ?? FALLBACK_MIMETYPE,
            content.file,
            mx
        );
        saveFile(Url, fileName);
        onClose?.();
    };
    return (
        <MenuItem
            disabled={typeof mxc !== 'string' || typeof fileName !== 'string' || !url.startsWith('mxc://')}
            onClick={handleClick}
        >
            <ListItemIcon>
                <Download />
            </ListItemIcon>
            <ListItemText>
                {getText('msg_menu.download')}
            </ListItemText>
        </MenuItem>
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
        // @ts-ignore
        await mx.sendStateEvent(room.roomId, 'm.room.pinned_events', {
            pinned
        });
    };

    const handleUnpin = async () => {
        if (onClose) onClose();
        if (!eventId) return;
        pinned = pinned.filter(x => x !== eventId);
        // @ts-ignore
        await mx.sendStateEvent(room.roomId, 'm.room.pinned_events', {
            pinned
        });
    };

    return (
        <MenuItem
            onClick={isPinned ? handleUnpin : handlePin}
        >
            <ListItemIcon>
                <Icon size={1} path={isPinned ? mdiPinOff : mdiPin} />
            </ListItemIcon>
            <ListItemText>
                {getText(isPinned ? 'msg_menu.unpin' : 'msg_menu.pin')}
            </ListItemText>
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
        //if (onClose) onClose();
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
                onReplyClick={() => { }}
                onDiscussClick={() => { }}
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
                            renderImage={(p) => <Image {...p} loading="lazy" />}
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
            <Dialog
                open={open}
                onClose={handleClose}
            >
                <DialogTitle>{getText('recovered.title')}</DialogTitle>
                <DialogContent>
                    {message}
                </DialogContent>
            </Dialog>
            <MenuItem
                onClick={handleClick}
                selected={open}
            >
                <ListItemIcon>
                    <Restore />
                </ListItemIcon>
                <ListItemText>
                    {getText('msg_menu.recover')}
                </ListItemText>
            </MenuItem>
        </>
    );
});

export const MessageTranslateItem = as<
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

    const handleClick = async () => {
        setOpen(true);
        //if (onClose) onClose();
        const eventId = mEvent.getId();
        const translatedContent = await translateContent(mEvent.getContent());
        const getContent = () => translatedContent;
        setMessage(
            <Message
                key={mEvent.getId()}
                data-message-id={eventId}
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
                onReplyClick={() => { }}
                onDiscussClick={() => { }}
                onUserClick={(evt: any) => null}
                onUsernameClick={(evt: any) => null}
            >
                {mEvent.getType() == 'm.room.message' && <RenderMessageContent
                    displayName={mEvent.sender?.rawDisplayName || mEvent.sender?.userId || getText('generic.unknown')}
                    msgType={translatedContent.msgtype ?? ''}
                    ts={mEvent.getTs()}
                    edited={false}
                    getContent={getContent as GetContentCallback}
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
    };

    const handleClose = () => {
        setOpen(false);
        setMessage(null);
        onClose?.();
    };

    useBackButton(handleClose);

    return (
        <>
            <Dialog
                open={open}
                onClose={handleClose}
            >
                <DialogTitle>{getText('translated.title')}</DialogTitle>
                <DialogContent>
                    {message}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>{getText('btn.close')}</Button>
                </DialogActions>
            </Dialog>
            <MenuItem
                onClick={handleClick}
                selected={open}
            >
                <ListItemIcon>
                    <Translate />
                </ListItemIcon>
                <ListItemText>
                    {getText('msg_menu.translate')}
                </ListItemText>
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
            onClick={handleCopy}
        >
            <ListItemIcon>
                <LinkOutlined />
            </ListItemIcon>
            <ListItemText>
                {getText('msg_menu.copy_link')}
            </ListItemText>
        </MenuItem>
    );
});

export const MessageCancelItem = as<
    'button',
    {
        room: Room;
        mEvent: MatrixEvent;
        onClose?: () => void;
    }
>(({ room, mEvent, onClose, ...props }, ref) => {
    const mx = useMatrixClient();

    const onClick = () => {
        mx.cancelPendingEvent(mEvent);
        onClose?.();
    };

    return (
        <MenuItem
            onClick={onClick}
        >
            <ListItemIcon>
                <CancelOutlined />
            </ListItemIcon>
            <ListItemText>
                {getText('msg_menu.cancel')}
            </ListItemText>
        </MenuItem>
    );
});

export const MessageRetryItem = as<
    'button',
    {
        room: Room;
        mEvent: MatrixEvent;
        onClose?: () => void;
    }
>(({ room, mEvent, onClose, ...props }, ref) => {
    const mx = useMatrixClient();

    const onClick = () => {
        mx.resendEvent(mEvent, room);
        onClose?.();
    };

    return (
        <MenuItem
            onClick={onClick}
        >
            <ListItemIcon>
                <Replay />
            </ListItemIcon>
            <ListItemText>
                {getText('msg_menu.retry')}
            </ListItemText>
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
                if (mx.canSupport.get(Feature.RelationBasedRedactions) !== ServerSupport.Unsupported) {
                    return mx.redactEvent(room.roomId, eventId, undefined, {
                        reason,
                        with_rel_types: [RelationType.Replace]
                    });
                } else {
                    mx.relations(room.roomId, eventId, RelationType.Replace)
                        .then(({ events }) => {
                            for (const ev of events) {
                                const evId = ev.getId();
                                if (!evId) continue;
                                mx.redactEvent(room.roomId, evId, undefined, { reason });
                            }
                        });
                    return mx.redactEvent(room.roomId, eventId, undefined, {
                        reason
                    });
                }
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

    useEffect(() => {
        if (deleteState.status === AsyncStatus.Success) {
            setOpen(false);
            onClose?.();
        }
    }, [deleteState.status, onClose]);

    useBackButton(handleClose);

    return (
        <>
            <Dialog
                open={open}
                onClose={handleClose}
                PaperProps={{
                    component: 'form',
                    onSubmit: handleSubmit
                }}
            >
                <DialogTitle>
                    {getText('msg_redact.title')}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {getText('msg_redact.subtitle')}
                    </DialogContentText>
                    <TextField
                        label={`${getText('msg_redact.reason.1')} ${getText('msg_redact.reason.2')}`}
                        autoComplete='off'
                        name='reasonInput'
                        fullWidth
                    />
                    {deleteState.status === AsyncStatus.Error && (
                        <Alert severity='error'>
                            {getText('error.redact_msg')}
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>{getText('btn.cancel')}</Button>
                    <Button disabled={deleteState.status === AsyncStatus.Loading} type='submit' color='error'>{getText('btn.msg_redact')}</Button>
                </DialogActions>
            </Dialog>
            <MenuItem
                onClick={() => setOpen(true)}
                selected={open}
            >
                <ListItemIcon>
                    <DeleteOutline color='error' />
                </ListItemIcon>
                <ListItemText>
                    <Typography color='error'>
                        {getText('msg_menu.redact')}
                    </Typography>
                </ListItemText>
            </MenuItem>
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

    const handleClose = () => {
        setOpen(false);
        onClose?.();
    };

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

    useEffect(() => {
        if (reportState.status === AsyncStatus.Success) {
            setOpen(false);
            onClose?.();
        }
    }, [reportState.status, onClose]);

    return (
        <>
            <Dialog
                open={open}
                onClose={handleClose}
                PaperProps={{
                    component: 'form',
                    onSubmit: handleSubmit
                }}
            >
                <DialogTitle>
                    {getText('msg_report.title')}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {getText('msg_report.subtitle')}
                    </DialogContentText>
                    <TextField
                        label={getText('msg_report.reason')}
                        required
                        autoComplete='off'
                        name='reasonInput'
                        fullWidth
                    />
                    {reportState.status === AsyncStatus.Error && (
                        <Alert severity='error'>
                            {getText('error.redact_msg')}
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>{getText('btn.cancel')}</Button>
                    <LoadingButton loading={reportState.status === AsyncStatus.Loading} type='submit' color='error'>{getText('btn.msg_report')}</LoadingButton>
                </DialogActions>
            </Dialog>
            <MenuItem
                onClick={() => setOpen(true)}
                selected={open}
            >
                <ListItemIcon>
                    <FlagOutlined color='error' />
                </ListItemIcon>
                <ListItemText>
                    <Typography color='error'>
                        {getText('btn.msg_report')}
                    </Typography>
                </ListItemText>
            </MenuItem>
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
    onReplyClick: () => void;
    onDiscussClick: () => void;
    onEditId?: (eventId?: string) => void;
    onReactionToggle: (targetEventId: string, key: string, shortcode?: string) => void;
    reply?: ReactNode;
    thread?: ReactNode;
    reactions?: ReactNode;
    showGoTo?: boolean;
    replySwipeAnimation?: boolean;
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
            onDiscussClick,
            onReactionToggle,
            onEditId,
            reply,
            thread,
            reactions,
            children,
            showGoTo,
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
        const { navigateRoom } = useRoomNavigate();
        const [tgRename] = useSetting(settingsAtom, 'extera_renameTgBot');
        const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
        const [emojiBoardAnchor, setEmojiBoardAnchor] = useState<HTMLElement | null>(null);
        const user = mx.getUser(senderId);
        const localPart = getMxIdLocalPart(senderId);
        const content = mEvent.getContent();
        const mDirects = useAtomValue(mDirectAtom);
        const theme = useTheme();
        const readers = useRoomEventReaders(room, mEvent.getId());

        const { animate, isTouchingSide, onTouchEnd, onTouchMove, onTouchStart } = useSwipeLeft(() => onReplyClick());

        var senderDisplayName =
            getMemberDisplayName(room, senderId) ?? user?.displayName ?? localPart ?? senderId;
        var senderAvatarMxc = getMemberAvatarMxc(room, senderId);

        if (tgRename && room.name != 'Telegram bridge bot' && mEvent.getContent().msgtype != 'm.notice') {
            if (['telegram', 'telegrambot'].includes(localPart!)) {
                senderDisplayName = room.name;
                senderAvatarMxc = room.getMxcAvatarUrl() ?? senderAvatarMxc;
            }
        }

        const [status, setStatus] = useState(mEvent.status || EventStatus.SENT);

        useEffect(() => {
            const listener = (event: MatrixEvent) => {
                if (event.getId() === mEvent.getId()) {
                    setStatus(mEvent.status || EventStatus.SENT);
                    console.log(event.status);
                }
            };

            mx.on(RoomEvent.LocalEchoUpdated, listener);
            return () => {
                mx.off(RoomEvent.LocalEchoUpdated, listener);
            };
        }, [mx, mEvent]);

        const isBridged = useMemo(() => {
            return (content['fi.mau.telegram.source']) ? true : false;
        }, [content, mEvent, mx]);

        const hideHeader = useMemo(() => messageLayout === 2 && mDirects.has(room.roomId), [messageLayout, room, mDirects]);

        const childrenRef = useRef<HTMLDivElement>(null);
        const maxWidthStyle = messageLayout === 2 && (!['m.text', 'm.notice'].includes(mEvent.getContent().msgtype ?? '')) ? { maxWidth: `${childrenRef.current?.clientWidth}px` } : undefined;

        const headerJSX = !collapse && !hideHeader && (
            <Box
                gap="300"
                direction={messageLayout === 1 ? 'RowReverse' : 'Row'}
                justifyContent="SpaceBetween"
                alignItems="Baseline"
                grow="Yes"
                style={maxWidthStyle}
            >
                {(messageLayout !== 2 || senderId !== userId) && (
                    <Box shrink='Yes' grow='No'>
                        <Username
                            as="button"
                            style={{ color: colorMXID(senderId) }}
                            data-user-id={senderId}
                            onContextMenu={onUserClick}
                            onClick={onUsernameClick}
                        >
                            {/* {isBridged && <Icon path={mdiShare} size={0.8} style={{ verticalAlign: 'bottom' }} />} */}
                            <Text as="span" size={messageLayout === 2 ? 'T300' : 'T400'} truncate>
                                <b>{senderDisplayName}</b>
                            </Text>
                            {mEvent.sender?.userId && <VerificationBadge userId={mEvent.sender?.userId} userName={senderDisplayName} />}
                        </Username>
                    </Box>
                )}
                <Box shrink="No" grow='No' gap="100">
                    {/* {messageLayout === 2 && senderId !== userId && (
                        <Time className={css.MessageTimestamp} ts={mEvent.getTs()} compact={true} />
                    )} */}
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

        const hasBeenRead = readers.find(x => x !== senderId) ? true : false;
        const hasBeenSent = status === EventStatus.SENT;
        const sending = [EventStatus.ENCRYPTING, EventStatus.QUEUED, EventStatus.SENDING].includes(status!);
        const failed = status === EventStatus.NOT_SENT;
        const cancelled = status === EventStatus.CANCELLED;

        const metaJSX = (
            <Box gap='100'>
                <Time compact ts={mEvent.getTs()} />
                {userId === senderId &&
                    <Icon
                        color={theme.palette.text.secondary}
                        path={
                            // Good luck figuring out
                            sending
                                ? mdiClockOutline
                                :
                                failed
                                    ? mdiAlertCircleOutline
                                    :
                                    cancelled
                                        ? mdiClose
                                        :
                                        hasBeenRead
                                            ? mdiCheckAll
                                            : mdiCheck
                        }
                        size={0.75}
                    />
                }
            </Box>
        );

        const handleBtnClick = async (evt: MouseEvent<HTMLButtonElement>) => {
            const b = evt.currentTarget;
            b.disabled = true;
            if (typeof b.dataset.id !== 'string') return;
            // @ts-ignore
            await mx.sendEvent(room.roomId, 'xyz.extera.button_click', {
                "m.relates_to": {
                    event_id: mEvent.getId(),
                    rel_type: 'xyz.extera.button_click'
                },
                button_id: b.dataset.id
            });
            b.disabled = false;
        };

        const footerJSX = null;

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

        const buttons: any[] | undefined = typeof content['xyz.extera.buttons'] == 'object' &&
            content['xyz.extera.buttons'].filter &&
            content['xyz.extera.buttons'].filter(
                (x: any) => typeof x.id == 'string' && typeof x.name == 'string'
            );

        const msgContentJSX = (
            <Box direction="Column" alignSelf="Start" style={{ maxWidth: '100%' }}>
                <span style={maxWidthStyle}>
                    {reply}
                </span>
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
                    <div ref={childrenRef} style={{ width: 'fit-content', maxWidth: '100%' }}>
                        {children}
                    </div>
                )}
                {thread}
                {buttons && buttons.length <= 16 && (
                    <div>
                        {buttons.map((btn: any) =>
                            <>
                                <Button onClick={handleBtnClick} variant={btn.variant ?? 'outlined'} color={btn.color ?? 'primary'}>
                                    {btn.name}
                                </Button>
                                &nbsp;
                            </>
                        )}
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
            setMenuAnchor(evt.currentTarget);
        };

        const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
            const target = evt.currentTarget.parentElement?.parentElement ?? evt.currentTarget;
            setMenuAnchor(target);
        };

        const closeMenu = () => {
            setMenuAnchor(null);
        };

        const handleOpenEmojiBoard: MouseEventHandler<HTMLButtonElement> = (evt) => {
            const target = evt.currentTarget.parentElement ?? evt.currentTarget;
            setEmojiBoardAnchor(target);
        };

        const handleAddReactions: MouseEventHandler<HTMLLIElement> = (evt) => {
            const target = evt.currentTarget.parentElement?.parentElement ?? evt.currentTarget;
            setEmojiBoardAnchor(target);
        };

        const handleEndPoll: MouseEventHandler<HTMLLIElement> = () => {
            const roomId = mEvent.getRoomId();
            const eventId = mEvent.getId();
            if (!roomId || !eventId) return;
            closeMenu();
            // @ts-ignore
            mx.sendEvent(roomId, 'org.matrix.msc3381.poll.end', {
                'org.matrix.msc1767.text': 'Ended poll',
                'm.relates_to': {
                    rel_type: 'm.reference',
                    event_id: eventId
                },
                // @ts-ignore
                body: 'Ended poll'
            });
        };

        const isTouch = 'ontouchstart' in window;
        const isSticker = useMemo(
            () => mEvent.getType() === 'm.sticker',
            [mEvent]
        );

        return (
            <MessageBase
                className={classNames(hasBeenSent ? css.MessageBase : sending ? css.MessageBaseSending : failed ? css.MessageBaseFailed : css.MessageBase, className)}
                tabIndex={0}
                data-message-status={status}
                space={messageSpacing}
                collapse={collapse}
                highlight={highlight}
                selected={!!menuAnchor || !!emojiBoardAnchor}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                onTouchMove={onTouchMove}
                replySwipeAnimation={animate}
                {...props}
                {...hoverProps}
                {...focusWithinProps}
                ref={ref}
            >
                {!edit && (hover || !!menuAnchor || !!emojiBoardAnchor) && (
                    <div
                        className={css.MessageOptionsBase}
                        style={!isTouch ? {
                            backgroundColor: theme.palette.background.paper,
                            borderColor: theme.palette.divider,
                            borderWidth: '1px',
                            borderRadius: theme.shape.borderRadius,
                        } : {}}
                    >
                        {!isTouch && (
                            <>
                                {status === EventStatus.SENT && (
                                    <>
                                        {canSendReaction && (
                                            <>
                                                <Menu anchorEl={emojiBoardAnchor} open={!!emojiBoardAnchor}>
                                                    <EmojiBoard
                                                        imagePackRooms={imagePackRooms ?? []}
                                                        returnFocusOnDeactivate={false}
                                                        allowTextCustomEmoji
                                                        onEmojiSelect={(key) => {
                                                            onReactionToggle(mEvent.getId()!, key);
                                                            setEmojiBoardAnchor(null);
                                                        }}
                                                        onCustomEmojiSelect={(mxc, shortcode) => {
                                                            onReactionToggle(mEvent.getId()!, mxc, shortcode);
                                                            setEmojiBoardAnchor(null);
                                                        }}
                                                        requestClose={() => {
                                                            setEmojiBoardAnchor(null);
                                                        }}
                                                    />
                                                </Menu>
                                                <IconButton
                                                    onClick={handleOpenEmojiBoard}
                                                    aria-pressed={!!emojiBoardAnchor}
                                                >
                                                    <Icon size={1} path={mdiEmoticonPlus} />
                                                </IconButton>
                                            </>
                                        )}
                                        <IconButton
                                            onClick={onReplyClick}
                                            data-event-id={mEvent.getId()}
                                        >
                                            <Icon size={1} path={mdiReply} />
                                        </IconButton>
                                        <IconButton
                                            onClick={onDiscussClick}
                                            data-event-id={mEvent.getId()}
                                        >
                                            <Icon size={1} path={mdiMessage} />
                                        </IconButton>
                                        {canEditEvent(mx, mEvent) && onEditId && (
                                            <IconButton
                                                onClick={() => onEditId(mEvent.getId())}
                                            >
                                                <Icon size={1} path={mdiPencil} />
                                            </IconButton>
                                        )}
                                    </>
                                )}
                                <IconButton
                                    onClick={handleOpenMenu}
                                    aria-pressed={!!menuAnchor}
                                >
                                    <Icon size={1} path={mdiDotsVertical} />
                                </IconButton>
                            </>
                        )}
                        <Menu open={!!menuAnchor} anchorEl={menuAnchor} onClose={closeMenu}>
                            {(status !== EventStatus.SENT) && (
                                <MenuItem>
                                    <ListItemText>
                                        {getText('loading')}
                                    </ListItemText>
                                </MenuItem>
                            )}
                            {status === EventStatus.SENT && (
                                <>
                                    {canSendReaction && (
                                        <MessageQuickReactions
                                            onReaction={(key, shortcode) => {
                                                onReactionToggle(mEvent.getId()!, key, shortcode);
                                                closeMenu();
                                            }}
                                        />
                                    )}
                                    <div style={{ margin: '4px' }}>
                                        {new Date(mEvent.getTs()).toLocaleString()}
                                    </div>
                                    <Line size='300' />
                                </>
                            )}
                            {status === EventStatus.SENT && (
                                <>
                                    {mEvent.getType() == 'org.matrix.msc3381.poll.start' && mEvent.sender?.userId == (mx.getUserId() ?? '') && (
                                        <MenuItem
                                            onClick={handleEndPoll}
                                        >
                                            <ListItemIcon>
                                                <CancelOutlined />
                                            </ListItemIcon>
                                            <ListItemText>
                                                {getText('msg_menu.end_poll')}
                                            </ListItemText>
                                        </MenuItem>
                                    )}
                                    {canSendReaction && (
                                        <MenuItem
                                            onClick={handleAddReactions}
                                        >
                                            <ListItemIcon>
                                                <AddReactionOutlined />
                                            </ListItemIcon>
                                            <ListItemText>
                                                {getText('msg_menu.add_reaction')}
                                            </ListItemText>
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
                                        data-event-id={mEvent.getId()}
                                        onClick={(evt: any) => {
                                            closeMenu();
                                            onReplyClick();
                                        }}
                                    >
                                        <ListItemIcon>
                                            <ReplyOutlined />
                                        </ListItemIcon>
                                        <ListItemText>
                                            {getText('msg_menu.reply')}
                                        </ListItemText>
                                    </MenuItem>
                                    <MenuItem
                                        data-event-id={mEvent.getId()}
                                        onClick={(evt: any) => {
                                            closeMenu();
                                            onDiscussClick();
                                        }}
                                    >
                                        <ListItemIcon>
                                            <MessageOutlined />
                                        </ListItemIcon>
                                        <ListItemText>
                                            {getText('msg_menu.discuss')}
                                        </ListItemText>
                                    </MenuItem>
                                    {
                                        typeof content.url === 'string' && content.msgtype && ['m.file', 'm.audio', 'm.image', 'm.video'].includes(content.msgtype) && (
                                            <MessageFileDownloadItem room={room} mEvent={mEvent} onClose={closeMenu} />
                                        )
                                    }
                                    {canEditEvent(mx, mEvent) && onEditId && (
                                        <MenuItem
                                            data-event-id={mEvent.getId()}
                                            onClick={() => {
                                                onEditId(mEvent.getId());
                                                closeMenu();
                                            }}
                                        >
                                            <ListItemIcon>
                                                <Edit />
                                            </ListItemIcon>
                                            <ListItemText>
                                                {getText('msg_menu.edit')}
                                            </ListItemText>
                                        </MenuItem>
                                    )}
                                    {showGoTo && (
                                        <MenuItem
                                            data-event-id={mEvent.getId()}
                                            onClick={() => {
                                                navigateRoom(room.roomId, mEvent.getId());
                                                closeMenu();
                                            }}
                                        >
                                            <ListItemIcon>
                                                <ArrowBack />
                                            </ListItemIcon>
                                            <ListItemText>
                                                {getText('msg_menu.goto')}
                                            </ListItemText>
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
                                        !mEvent.isRedacted() && <MessageTranslateItem room={room} mEvent={mEvent} onClose={closeMenu} />
                                    }
                                    {
                                        mEvent.isRedacted() && <MessageRecoverItem room={room} mEvent={mEvent} onClose={closeMenu} />
                                    }
                                </>
                            )}
                            {((!mEvent.isRedacted() && canDelete) ||
                                mEvent.getSender() !== mx.getUserId()) && status === EventStatus.SENT && (
                                    <>
                                        <Divider />
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
                                    </>
                                )}
                            {[EventStatus.ENCRYPTING, EventStatus.NOT_SENT, EventStatus.QUEUED].includes(status) && (
                                <MessageCancelItem
                                    room={room}
                                    mEvent={mEvent}
                                    onClose={closeMenu}
                                />
                            )}
                            {(status === EventStatus.CANCELLED || status === EventStatus.NOT_SENT) && (
                                <MessageRetryItem
                                    room={room}
                                    mEvent={mEvent}
                                    onClose={closeMenu}
                                />
                            )}
                        </Menu>
                    </div>
                )
                }
                {messageLayout === 1 && (
                    <CompactLayout before={headerJSX} onContextMenu={handleContextMenu}>
                        {msgContentJSX}
                        {footerJSX}
                    </CompactLayout>
                )}
                {
                    messageLayout === 2 && (
                        <BubbleLayout after={metaJSX} transparent={isSticker} before={userId !== senderId && avatarJSX} rightAligned={userId === senderId} onContextMenu={handleContextMenu}>
                            {headerJSX}
                            {msgContentJSX}
                            {footerJSX}
                        </BubbleLayout>
                    )
                }
                {
                    messageLayout !== 1 && messageLayout !== 2 && (
                        <ModernLayout before={avatarJSX} onContextMenu={handleContextMenu}>
                            {headerJSX}
                            {msgContentJSX}
                            {footerJSX}
                        </ModernLayout>
                    )
                }
            </MessageBase >
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
        const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
        const stateEvent = typeof mEvent.getStateKey() === 'string';
        const isTouchDevice = 'ontouchstart' in window;

        const handleContextMenu: MouseEventHandler<HTMLDivElement> = (evt) => {
            if (evt.altKey || !window.getSelection()?.isCollapsed) return;
            const tag = (evt.target as any).tagName;
            if (typeof tag === 'string' && tag.toLowerCase() === 'a') return;
            evt.preventDefault();
            setMenuAnchor(evt.currentTarget);
        };

        const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
            const target = evt.currentTarget.parentElement?.parentElement ?? evt.currentTarget;
            setMenuAnchor(target);
        };

        const closeMenu = () => {
            setMenuAnchor(null);
        };

        return (
            <>
                <Menu open={!!menuAnchor} anchorEl={menuAnchor} onClose={closeMenu}>
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
                                <Divider />
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
                            </>
                        )}
                </Menu>
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
                    <div onContextMenu={handleContextMenu}>{children}</div>
                </MessageBase>
            </>
        );
    }
);
