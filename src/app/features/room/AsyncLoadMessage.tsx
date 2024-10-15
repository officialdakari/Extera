import React, { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useMatrixClient } from "../../hooks/useMatrixClient";
import { MatrixEvent, Room } from "matrix-js-sdk";
import { Message } from "./message";
import { RenderMessageContent } from "../../components/RenderMessageContent";
import { getText } from "../../../lang";
import { GetContentCallback } from "../../../types/matrix/room";
import { DefaultPlaceholder, ImageContent, MSticker } from "../../components/message";
import { Image } from "../../components/media";
import { ImageViewer } from "../../components/image-viewer";
import { useSetting } from "../../state/hooks/settings";
import { settingsAtom } from "../../state/settings";
import { useRoomNavigate } from "../../hooks/useRoomNavigate";
import { HTMLReactParserOptions } from "html-react-parser";
import { getReactCustomHtmlParser } from "../../plugins/react-custom-html-parser";
import { isRoomId, isUserId } from "../../utils/matrix";
import { openJoinAlias, openProfileViewer } from "../../../client/action/navigation";
import { CircularProgress } from "@mui/material";

type AsyncLoadMessageProps = {
    eventId: string;
    room: Room;
};
export default function AsyncLoadMessage({ eventId, room }: AsyncLoadMessageProps) {
    const mx = useMatrixClient();
    const [message, setMessage] = useState<ReactNode>(<DefaultPlaceholder />);

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

    const load = useCallback(async () => {
        try {
            const mEvent = room.findEventById(eventId) || new MatrixEvent(await mx.fetchRoomEvent(room.roomId, eventId));
            setMessage(
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
                    onReplyClick={() => null}
                    onDiscussClick={() => null}
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
            setMessage(
                null
            );
        }
    }, [mx, room, eventId, messageLayout, messageSpacing, mediaAutoLoad, setMessage]);

    load();

    return message;
}