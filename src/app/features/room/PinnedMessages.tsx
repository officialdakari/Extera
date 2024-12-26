import { EventTimeline, MatrixEvent, Room } from "matrix-js-sdk";
import React, { MouseEventHandler, useCallback, useMemo, useRef, useState } from "react";
import { useMatrixClient } from "../../hooks/useMatrixClient";
import { Chip, CircularProgress, DialogContent, IconButton, Typography } from "@mui/material";
import { VirtualTile } from "../../components/virtualizer";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRoomNavigate } from "../../hooks/useRoomNavigate";
import { HTMLReactParserOptions } from "html-react-parser";
import { getReactCustomHtmlParser } from "../../plugins/react-custom-html-parser";
import { getMxIdLocalPart, isRoomId, isUserId } from "../../utils/matrix";
import { openJoinAlias, openProfileViewer } from "../../../client/action/navigation";
import { useSetting } from "../../state/hooks/settings";
import { settingsAtom } from "../../state/settings";
import { RenderMatrixEvent, useMatrixEventRenderer } from "../../hooks/useMatrixEventRenderer";
import { GetContentCallback, MessageEvent, StateEvent } from "../../../types/matrix/room";
import HiddenContent from "../../components/hidden-content/HiddenContent";
import { RenderMessageContent } from "../../components/RenderMessageContent";
import { AvatarBase, DefaultPlaceholder, ImageContent, MessageNotDecryptedContent, MessageUnsupportedContent, ModernLayout, MSticker, RedactedContent, Reply, Time, Username } from "../../components/message";
import { ImageViewer } from "../../components/image-viewer";
import { Image } from "../../components/media";
import { Avatar, Box, config, Text } from "folds";
import { getText, translate } from "../../../lang";
import * as customHtmlCss from '../../styles/CustomHtml.css';
import { getEditedEvent, getMemberAvatarMxc, getMemberDisplayName, getStateEvent } from "../../utils/room";
import { SequenceCard } from "../../components/sequence-card";
import { UserAvatar } from "../../components/user-avatar";
import Icon from "@mdi/react";
import { mdiPinOff } from "@mdi/js";
import colorMXID from "../../../util/colorMXID";
import { useRoomEvent } from "../../hooks/useRoomEvent";
import { AsyncStatus, useAsyncCallback } from "../../hooks/useAsyncCallback";
import { RoomPinnedEventsEventContent } from "matrix-js-sdk/lib/types";
import { useRoomPinnedEvents } from "../../hooks/useRoomPinnedEvents";
import { EncryptedContent } from "./message";
import { usePowerLevelsAPI, usePowerLevelsContext } from "../../hooks/usePowerLevels";

type PinnedMessageProps = {
    renderContent: RenderMatrixEvent<[MatrixEvent, string, GetContentCallback]>;
    requestOpen: (roomId: string, eventId: string) => void;
    room: Room;
    eventId: string;
    canUnpin: boolean;
};
function PinnedMessage({ room, eventId, renderContent, requestOpen, canUnpin }: PinnedMessageProps) {
    const mx = useMatrixClient();
    const event = useRoomEvent(room, eventId);

    const handleOpenClick: MouseEventHandler = (evt) => {
        evt.preventDefault();
        const evtId = evt.currentTarget.getAttribute('data-event-id');
        if (!evtId) return;
        requestOpen(room.roomId, evtId);
    };

    const [unpinState, unpin] = useAsyncCallback(
        useCallback(() => {
            const pinEvent = getStateEvent(room, StateEvent.RoomPinnedEvents);
            const content = pinEvent?.getContent<RoomPinnedEventsEventContent>() ?? { pinned: [] };
            const newContent: RoomPinnedEventsEventContent = {
                pinned: content.pinned.filter((id) => id !== eventId),
            };

            //@ts-ignore
            return mx.sendStateEvent(room.roomId, StateEvent.RoomPinnedEvents, newContent);
        }, [room, eventId, mx])
    );

    const renderOptions = () => (
        <Box shrink="No" gap="200" alignItems="Center">
            <Chip label={getText('btn.open')} data-event-id={eventId} onClick={handleOpenClick} variant='filled' color='primary' />
            {canUnpin && (
                <IconButton
                    data-event-id={eventId}
                    onClick={unpinState.status === AsyncStatus.Loading ? undefined : unpin}
                    disabled={unpinState.status === AsyncStatus.Loading}
                >
                    {unpinState.status === AsyncStatus.Loading ? (
                        <CircularProgress />
                    ) : (
                        <Icon size={1} path={mdiPinOff} />
                    )}
                </IconButton>
            )}
        </Box>
    );

    if (event === undefined) return <DefaultPlaceholder />;
    if (event === null)
        return (
            <Box gap="300" justifyContent="SpaceBetween" alignItems="Center">
                <Box>
                    <Typography color='error'>{getText('error.message')}</Typography>
                </Box>
                {renderOptions()}
            </Box>
        );

    const sender = event.getSender()!;
    const displayName = getMemberDisplayName(room, sender) ?? getMxIdLocalPart(sender) ?? sender;
    const senderAvatarMxc = getMemberAvatarMxc(room, sender);
    const getContent = (() => event.getContent()) as GetContentCallback;
    return (
        <ModernLayout
            before={
                <AvatarBase>
                    <Avatar size="300">
                        <UserAvatar
                            userId={sender}
                            src={
                                senderAvatarMxc
                                    ? mx.mxcUrlToHttp(senderAvatarMxc, 48, 48, 'crop', false, false, true) ??
                                    undefined
                                    : undefined
                            }
                            alt={displayName}
                        />
                    </Avatar>
                </AvatarBase>
            }
        >
            <Box gap="300" justifyContent="SpaceBetween" alignItems="Center" grow="Yes">
                <Box gap="200" alignItems="Baseline">
                    <Username style={{ color: colorMXID(sender) }}>
                        <Text as="span" truncate>
                            <b>{displayName}</b>
                        </Text>
                    </Username>
                    <Time ts={event.getTs()} />
                </Box>
                {renderOptions()}
            </Box>
            {event.replyEventId && (
                <Reply
                    mx={mx}
                    room={room}
                    eventId={event.replyEventId}
                    onClick={handleOpenClick}
                />
            )}
            {renderContent(event.getType(), false, event, displayName, getContent)}
        </ModernLayout>
    );
}

type PinnedMessagesProps = {
    room: Room;
};
export default function PinnedMessages({ room }: PinnedMessagesProps) {
    const mx = useMatrixClient();

    const { navigateRoom, navigateSpace } = useRoomNavigate();

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

    const [mediaAutoLoad] = useSetting(settingsAtom, 'mediaAutoLoad');
    const [urlPreview] = useSetting(settingsAtom, 'urlPreview');
    const myUserId = mx.getUserId()!;

    const powerLevels = usePowerLevelsContext();
    const { canSendStateEvent, getPowerLevel } = usePowerLevelsAPI(powerLevels);
    const canPinEvents = canSendStateEvent(StateEvent.RoomPinnedEvents, getPowerLevel(myUserId));

    const renderMatrixEvent = useMatrixEventRenderer<[MatrixEvent, string, GetContentCallback]>(
        {
            [MessageEvent.RoomMessage]: (event, displayName, getContent) => {
                const hideReason = (event.getContent()['space.0x1a8510f2.msc3368.tags'] ?? [])[0];

                return (
                    <HiddenContent reason={hideReason}>
                        <RenderMessageContent
                            displayName={displayName}
                            msgType={event.getContent().msgtype ?? ''}
                            ts={event.getTs()}
                            getContent={getContent}
                            mediaAutoLoad={mediaAutoLoad}
                            urlPreview={urlPreview}
                            htmlReactParserOptions={htmlReactParserOptions}
                            outlineAttachment
                        />
                    </HiddenContent>
                );
            },
            [MessageEvent.RoomMessageEncrypted]: (event, displayName) => {
                const eventId = event.getId()!;
                const evtTimeline = room.getTimelineForEvent(eventId);

                const mEvent = evtTimeline?.getEvents().find((e) => e.getId() === eventId);

                if (!mEvent || !evtTimeline) {
                    return (
                        <Box grow="Yes" direction="Column">
                            <Text size="T400" priority="300">
                                <code className={customHtmlCss.Code}>{event.getType()}</code>
                                {' event'}
                            </Text>
                        </Box>
                    );
                }

                return (
                    <EncryptedContent mEvent={mEvent}>
                        {() => {
                            if (mEvent.isRedacted()) return <RedactedContent />;
                            if (mEvent.getType() === MessageEvent.Sticker)
                                return (
                                    <MSticker
                                        content={mEvent.getContent()}
                                        renderImageContent={(props) => (
                                            <ImageContent
                                                {...props}
                                                autoPlay={mediaAutoLoad}
                                                renderImage={(p) => <Image {...p} loading="lazy" />}
                                                renderViewer={(p) => <ImageViewer {...p} />}
                                            />
                                        )}
                                    />
                                );
                            if (mEvent.getType() === MessageEvent.RoomMessage) {
                                const editedEvent = getEditedEvent(eventId, mEvent, evtTimeline.getTimelineSet());
                                const getContent = (() =>
                                    editedEvent?.getContent()['m.new_content'] ??
                                    mEvent.getContent()) as GetContentCallback;

                                return (
                                    <RenderMessageContent
                                        displayName={displayName}
                                        msgType={mEvent.getContent().msgtype ?? ''}
                                        ts={mEvent.getTs()}
                                        edited={!!editedEvent}
                                        getContent={getContent}
                                        mediaAutoLoad={mediaAutoLoad}
                                        urlPreview={urlPreview}
                                        htmlReactParserOptions={htmlReactParserOptions}
                                    />
                                );
                            }
                            if (mEvent.getType() === MessageEvent.RoomMessageEncrypted)
                                return (
                                    <Text>
                                        <MessageNotDecryptedContent />
                                    </Text>
                                );
                            return (
                                <Text>
                                    <MessageUnsupportedContent />
                                </Text>
                            );
                        }}
                    </EncryptedContent>
                );
            },
            [MessageEvent.Sticker]: (event, displayName, getContent) => {
                if (event.isRedacted()) {
                    return (
                        <RedactedContent reason={event.getUnsigned().redacted_because?.content.reason} />
                    );
                }
                return (
                    <MSticker
                        content={getContent()}
                        renderImageContent={(props) => (
                            <ImageContent
                                {...props}
                                autoPlay={mediaAutoLoad}
                                renderImage={(p) => <Image {...p} loading="lazy" />}
                                renderViewer={(p) => <ImageViewer {...p} />}
                            />
                        )}
                    />
                );
            }
        },
        undefined,
        (event) => {
            if (event.isRedacted()) {
                return <RedactedContent reason={event.getUnsigned().redacted_because?.content.reason} />;
            }
            return (
                <Box grow="Yes" direction="Column">
                    <Text size="T400" priority="300">
                        {translate('unknown_event', <code className={customHtmlCss.Code}>{event.getType()}</code>)}
                    </Text>
                </Box>
            );
        }
    );

    const handleOpenClick: MouseEventHandler<HTMLButtonElement> = (evt) => {
        const eventId = evt.currentTarget.getAttribute('data-event-id');
        if (!eventId) return;
        navigateRoom(room.roomId, eventId);
    };

    const scrollRef = useRef<HTMLDivElement>(null);
    const pinnedEvents = useRoomPinnedEvents(room);
    const sortedPinnedEvent = useMemo(() => Array.from(pinnedEvents).reverse(), [pinnedEvents]);
    const virtualizer = useVirtualizer({
        count: pinnedEvents.length,
        estimateSize: () => 39,
        getScrollElement: () => scrollRef.current,
        overscan: 10
    });

    const vItems = virtualizer.getVirtualItems();

    return (
        <DialogContent>
            <div
                style={{
                    position: 'relative',
                    height: virtualizer.getTotalSize(),
                }}
                ref={scrollRef}
            >
                {vItems.map((item, i) => {
                    const eventId = sortedPinnedEvent[item.index];
                    if (!eventId) return null;
                    return (
                        <VirtualTile
                            virtualItem={item}
                            style={{ paddingBottom: config.space.S200 }}
                            ref={virtualizer.measureElement}
                            key={item.index}
                        >
                            <SequenceCard
                                style={{ padding: config.space.S400 }}
                                variant="SurfaceVariant"
                                direction="Column"
                            >
                                <PinnedMessage
                                    canUnpin={false}
                                    eventId={pinnedEvents[item.index]}
                                    renderContent={renderMatrixEvent}
                                    room={room}
                                    requestOpen={navigateRoom}
                                />
                            </SequenceCard>
                        </VirtualTile>
                    );
                })}
            </div>
        </DialogContent>
    );
}