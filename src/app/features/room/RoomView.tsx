import React, { useRef, useState } from 'react';
import { Box, Text, config } from 'folds';
import { CallEvent, EventType, MatrixCall, Room } from 'matrix-js-sdk';

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
import { sendExteraProfile } from '../../../client/action/room';
import { RoomCall } from './RoomCall';
import { useAtomValue } from 'jotai';
import { mDirectAtom } from '../../state/mDirectList';

export function RoomView({ room, eventId }: { room: Room; eventId?: string }) {
    const roomInputRef = useRef(null);
    const roomViewRef = useRef(null);

    const { roomId } = room;

    const mx = useMatrixClient();

    const tombstoneEvent = useStateEvent(room, StateEvent.RoomTombstone);
    const powerLevels = usePowerLevelsContext();
    const [wallpaperURL] = useSetting(settingsAtom, 'extera_wallpaper');
    const [newDesignInput] = useSetting(settingsAtom, 'newDesignInput');
    const { getPowerLevel, canSendEvent } = usePowerLevelsAPI(powerLevels);
    const myUserId = mx.getUserId();
    const mDirects = useAtomValue(mDirectAtom);
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

    const [showCallWindow, setShowCallWindow] = useState(false);
    const [call, setCall] = useState<MatrixCall | undefined>(undefined);

    const handleCall = async () => {
        const newCall = mx.createCall(room.roomId);
        if (!newCall) return alert('Calls are not supported in your browser!');
        setCall(newCall);

        if (!newCall) return;
        
        setShowCallWindow(true);

        await newCall.placeVoiceCall();

        newCall.on(CallEvent.Hangup, () => {
            setCall(undefined);
            setShowCallWindow(false);
        });
    };

    const onHangup = () => {
        setCall(undefined);
        setShowCallWindow(false);
    };

    sendExteraProfile(roomId);

    return (
        <Page ref={roomViewRef} style={style}>
            <RoomViewHeader handleCall={handleCall} />
            {mDirects.has(room.roomId) && showCallWindow && call && (
                <RoomCall room={room} call={call} onHangup={onHangup} />
            )}
            <Box grow="Yes" direction="Column">
                <RoomTimeline
                    key={roomId}
                    room={room}
                    eventId={eventId}
                    roomInputRef={roomInputRef}
                    textAreaRef={taRef}
                />
                <RoomViewTyping room={room} />
            </Box>
            <Box shrink="No" direction="Column">
                {newDesignInput && (<RoomViewFollowing room={room} />)}
                <div style={!newDesignInput ? { padding: `0 ${config.space.S400}` } : {}}>
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
                                    roomId={roomId}
                                    fileDropContainerRef={roomViewRef}
                                    newDesign={newDesignInput}
                                    ref={roomInputRef}
                                />
                            )}
                        </>
                    )}
                </div>
                {!newDesignInput && (<RoomViewFollowing room={room} />)}
            </Box>
        </Page>
    );
}
