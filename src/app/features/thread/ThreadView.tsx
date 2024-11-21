import React, { CSSProperties, useEffect, useRef, useState } from 'react';
import { Box, Text, config } from 'folds';
import { CallEvent, EventTimeline, EventType, MatrixCall, MatrixEvent, MatrixEventEvent, Room, RoomEvent, Thread } from 'matrix-js-sdk';

import { useStateEvent } from '../../hooks/useStateEvent';
import { StateEvent } from '../../../types/matrix/room';
import { usePowerLevelsAPI, usePowerLevelsContext } from '../../hooks/usePowerLevels';
import { useMatrixClient } from '../../hooks/useMatrixClient';
// import { useEditor } from '../../components/editor';
import { RoomTombstone } from '../room/RoomTombstone';
import { RoomInput } from '../room/RoomInput';
import { Page } from '../../components/page';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import HiddenRooms from '../../organisms/hidden-rooms/HiddenRooms';
import { useAtomValue } from 'jotai';
import { mDirectAtom } from '../../state/mDirectList';
import { useRoomCall } from '../../hooks/useCall';
import { CallState } from 'matrix-js-sdk/lib/webrtc/call';
import { useModals } from '../../hooks/useModals';
import { v4 } from 'uuid';
import { generateConferenceID } from '../../../util/conferenceID';
import { getIntegrationManagerURL } from '../../hooks/useIntegrationManager';
import wallpaperDB from '../../utils/wallpaper';
import { ThreadViewHeader } from './ThreadViewHeader';
import { ThreadTimeline } from './ThreadTimeline';
import { ThreadViewTyping } from './ThreadViewTyping';
import { ThreadViewFollowing } from './ThreadViewFollowing';

export function ThreadView({ room, eventId, thread }: { room: Room; eventId?: string; thread: Thread; }) {
    const roomInputRef = useRef(null);
    const roomViewRef = useRef(null);

    const { roomId } = room;

    const mx = useMatrixClient();

    const tombstoneEvent = useStateEvent(room, StateEvent.RoomTombstone);
    const powerLevels = usePowerLevelsContext();
    const [newDesignInput] = useSetting(settingsAtom, 'newDesignInput');
    const { getPowerLevel, canSendEvent } = usePowerLevelsAPI(powerLevels);
    const myUserId = mx.getUserId();
    const canMessage = myUserId
        ? canSendEvent(EventType.RoomMessage, getPowerLevel(myUserId))
        : false;
    const taRef: React.RefObject<HTMLTextAreaElement> = useRef(null);
    const [style, setStyle] = useState<CSSProperties>({});

    useEffect(() => {
        wallpaperDB.getWallpaper().then((url) => {
            setStyle({
                backgroundImage: `url(${url})`,
                backgroundSize: 'cover'
            });
        });
    }, [wallpaperDB]);

    return (
        <Page ref={roomViewRef} style={style}>
            <ThreadViewHeader threadId={thread.id} />
            <Box grow="Yes" direction="Column">
                <ThreadTimeline
                    key={roomId}
                    room={room}
                    eventId={eventId}
                    roomInputRef={roomInputRef}
                    textAreaRef={taRef}
                    threadId={thread.id}
                />
                <ThreadViewTyping room={room} thread={thread} />
            </Box>
            <Box shrink="No" direction="Column">
                <div style={!newDesignInput ? { padding: `0 ${config.space.S400}` } : {}}>
                    {tombstoneEvent ? (
                        <RoomTombstone
                            roomId={roomId}
                            body={tombstoneEvent.getContent().body}
                            replacementRoomId={tombstoneEvent.getContent().replacement_room}
                            newDesign={newDesignInput}
                        />
                    ) : (
                        <>
                            {canMessage && (
                                <RoomInput
                                    textAreaRef={taRef}
                                    room={room}
                                    roomId={roomId}
                                    fileDropContainerRef={roomViewRef}
                                    newDesign={newDesignInput}
                                    ref={roomInputRef}
                                    threadId={thread.id}
                                />
                            )}
                        </>
                    )}
                </div>
                {!newDesignInput && <ThreadViewFollowing room={room} thread={thread} />}
            </Box>
        </Page>
    );
}
