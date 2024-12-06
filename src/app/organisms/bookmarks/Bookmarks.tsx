import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMatrixClient } from "../../hooks/useMatrixClient";
import { useAccountData } from "../../hooks/useAccountData";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AppBar, Dialog, DialogContent, IconButton, Toolbar, Typography } from "@mui/material";
import { getText } from "../../../lang";
import { VirtualTile } from "../../components/virtualizer";
import AsyncLoadMessage from "../../features/room/AsyncLoadMessage";
import { IEvent, MatrixEvent } from "matrix-js-sdk";
import { Message } from "../../features/room/message";
import { useRoomNavigate } from "../../hooks/useRoomNavigate";
import { useSetting } from "../../state/hooks/settings";
import { HTMLReactParserOptions } from "html-react-parser";
import { Room } from "../../features/room";
import { settingsAtom } from "../../state/settings";
import { getReactCustomHtmlParser } from "../../plugins/react-custom-html-parser";
import { openJoinAlias, openProfileViewer } from "../../../client/action/navigation";
import { isRoomId, isUserId } from "../../utils/matrix";
import { RenderMessageContent } from "../../components/RenderMessageContent";
import { ImageContent, MSticker } from "../../components/message";
import { GetContentCallback } from "../../../types/matrix/room";
import { Image } from "../../components/media";
import { ImageViewer } from "../../components/image-viewer";
import { Close } from "@mui/icons-material";
import { BackButtonHandler } from "../../hooks/useBackButton";

export default function Bookmarks({
    requestClose
}: {
    requestClose: () => void
}) {
    const mx = useMatrixClient();
    const { navigateRoom, navigateSpace } = useRoomNavigate();
    const [mediaAutoLoad] = useSetting(settingsAtom, 'mediaAutoLoad');
    const [messageLayout] = useSetting(settingsAtom, 'messageLayout');
    const [messageSpacing] = useSetting(settingsAtom, 'messageSpacing');
    const bookmarkEvent = useAccountData('xyz.extera.bookmarks');
    const [bookmarks, setBookmarks] = useState<Record<string, Partial<IEvent>>>(bookmarkEvent?.getContent() || {});
    const [eventIds, setEventIds] = useState<string[]>([]);
    useEffect(() => {
        setBookmarks(bookmarkEvent?.getContent() || {});;
        setEventIds(Object.keys(bookmarkEvent?.getContent() || {}));
    }, [bookmarkEvent]);

    const scrollDiv = useRef<HTMLDivElement>(null);
    const virtualiser = useVirtualizer({
        count: eventIds.length,
        overscan: 10,
        estimateSize: () => 40,
        getScrollElement: () => scrollDiv.current
    });

    return (
        <Dialog open fullScreen>
            <BackButtonHandler callback={requestClose} id='bookmarks' />
            <AppBar position='static'>
                <Toolbar>
                    <Typography variant='h6' component='div' flexGrow={1}>
                        {getText('title.bookmarks')}
                    </Typography>
                    <IconButton onClick={requestClose} edge='end'>
                        <Close />
                    </IconButton>
                </Toolbar>
            </AppBar>
            <DialogContent>
                <div
                    style={{
                        position: 'relative',
                        height: virtualiser.getTotalSize(),
                    }}
                    ref={scrollDiv}
                >
                    {virtualiser.getVirtualItems().map((vItem, i) => {
                        const evId = eventIds[i];
                        const evt = bookmarks[evId];
                        const room = mx.getRoom(evt.room_id);
                        const ev = new MatrixEvent(evt);
                        const htmlReactParserOptions = getReactCustomHtmlParser(mx, room!, {
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
                                    openProfileViewer(mentionId, room?.roomId || ev.getRoomId());
                                    return;
                                }
                                if (isRoomId(mentionId) && mx.getRoom(mentionId)) {
                                    if (mx.getRoom(mentionId)?.isSpaceRoom()) navigateSpace(mentionId);
                                    else navigateRoom(mentionId);
                                    return;
                                }
                                openJoinAlias(mentionId);
                            },
                        });
                        return (
                            <VirtualTile
                                virtualItem={vItem}
                                ref={virtualiser.measureElement}
                                key={vItem.index}
                            >
                                <Message
                                    key={evId}
                                    data-message-id={evId}
                                    room={room!}
                                    mEvent={ev}
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
                                    {ev.getType() == 'm.room.message' && <RenderMessageContent
                                        displayName={ev.sender?.rawDisplayName || ev.sender?.userId || getText('generic.unknown')}
                                        msgType={ev.getContent().msgtype ?? ''}
                                        ts={ev.getTs()}
                                        edited={false}
                                        getContent={ev.getContent.bind(ev) as GetContentCallback}
                                        mediaAutoLoad={true}
                                        urlPreview={false}
                                        htmlReactParserOptions={htmlReactParserOptions}
                                    />}
                                    {ev.getType() == 'm.sticker' && <MSticker
                                        content={ev.getContent()}
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
                            </VirtualTile>
                        );
                    })}
                </div>
            </DialogContent>
        </Dialog>
    );
}