import React, { useRef } from 'react';
import { Box, Text, config } from 'folds';
import { EventType, Room } from 'matrix-js-sdk';

import { useStateEvent } from '../../hooks/useStateEvent';
import { StateEvent } from '../../../types/matrix/room';
import { usePowerLevelsAPI, usePowerLevelsContext } from '../../hooks/usePowerLevels';
import { useMatrixClient } from '../../hooks/useMatrixClient';
// import { useEditor } from '../../components/editor';
import { RoomInputPlaceholder } from './RoomInputPlaceholder';
import { RoomTimeline } from './RoomTimeline';
import { RoomViewTyping } from './RoomViewTyping';
import { RoomTombstone } from './RoomTombstone';
import { RoomInput } from './RoomInput';
import { RoomViewFollowing } from './RoomViewFollowing';
import { Page } from '../../components/page';
import { RoomViewHeader } from './RoomViewHeader';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import HiddenRooms from '../../organisms/hidden-rooms/HiddenRooms';

export function RoomView({ room, eventId }: { room: Room; eventId?: string }) {
    const roomInputRef = useRef(null);
    const roomViewRef = useRef(null);

    const { roomId } = room;
    //   const editor = useEditor();

    const mx = useMatrixClient();

    const tombstoneEvent = useStateEvent(room, StateEvent.RoomTombstone);
    const powerLevels = usePowerLevelsContext();
    const [wallpaperURL] = useSetting(settingsAtom, 'extera_wallpaper');
    const { getPowerLevel, canSendEvent } = usePowerLevelsAPI(powerLevels);
    const hiddenRoomsRef = useRef(null);
    const myUserId = mx.getUserId();
    const canMessage = myUserId
        ? canSendEvent(EventType.RoomMessage, getPowerLevel(myUserId))
        : false;
    const taRef: React.RefObject<HTMLTextAreaElement> = useRef(null);

    var style = {};
    if (typeof wallpaperURL === 'string') {
        style = {
            backgroundImage: `url(${mx.mxcUrlToHttp(wallpaperURL)})`,
            backgroundSize: 'cover'
        };
    }

    return (
        <Page ref={roomViewRef} style={style}>
            <RoomViewHeader />
            <Box grow="Yes" direction="Column">
                <RoomTimeline
                    key={roomId}
                    room={room}
                    eventId={eventId}
                    roomInputRef={roomInputRef}
                    textAreaRef={taRef}
                //   editor={editor}
                />
                <RoomViewTyping room={room} />
            </Box>
            <Box shrink="No" direction="Column">
                <div style={{ padding: `0 ${config.space.S400}` }}>
                    {tombstoneEvent ? (
                        <RoomTombstone
                            roomId={roomId}
                            body={tombstoneEvent.getContent().body}
                            replacementRoomId={tombstoneEvent.getContent().replacement_room}
                        />
                    ) : (
                        <>
                            {canMessage && (
                                <RoomInput
                                    textAreaRef={taRef}
                                    room={room}
                                    //   editor={editor}
                                    roomId={roomId}
                                    fileDropContainerRef={roomViewRef}
                                    ref={roomInputRef}
                                />
                            )}
                            {/* {!canMessage && (
                                <RoomInputPlaceholder
                                    style={{ padding: config.space.S200 }}
                                    alignItems="Center"
                                    justifyContent="Center"
                                >
                                    <Text align="Center">You do not have permission to post in this room</Text>
                                </RoomInputPlaceholder>
                            )} */}
                        </>
                    )}
                </div>
                <RoomViewFollowing room={room} />
            </Box>
        </Page>
    );
}
