import React, { useEffect, useRef, useState } from 'react';
import { Box, Text, config } from 'folds';
import { CallEvent, EventType, MatrixCall, MatrixEvent, MatrixEventEvent, Room, RoomEvent } from 'matrix-js-sdk';

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
import { useRoomCall } from '../../hooks/useCall';
import { CallState } from 'matrix-js-sdk/lib/webrtc/call';

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
    const [mxCall, setMxCall] = useState<MatrixCall | undefined>(undefined);

    const [callWindow, setCallWindow] = useRoomCall();

    const handleCall = async () => {
        if (callWindow) return;
        const newCall = mx.createCall(room.roomId);
        if (!newCall) return alert('Calls are not supported in your browser!');
        setMxCall(newCall);

        if (!newCall) return;

        await newCall.placeVoiceCall();

        newCall.on(CallEvent.Hangup, () => {
            setMxCall(undefined);
            setCallWindow(undefined);
        });

        setCallWindow(
            <RoomCall room={room} call={newCall} onHangup={onHangup} />
        );
    };

    const onHangup = () => {
        setMxCall(undefined);
        setCallWindow(undefined);
    };

    useEffect(() => {
        const listener = async (event: MatrixEvent) => {
            await mx.decryptEventIfNeeded(event);
            const room = mx.getRoom(event.getRoomId());
            const content = event.getContent();
            if (room && event.getType() === EventType.CallInvite && content.offer && typeof content.call_id === 'string') {
                var i = 0;
                var interval = setInterval(() => {

                    if (i > 10) return clearInterval(interval);
                    i++;

                    const call = mx.callEventHandler?.calls.get(content.call_id);

                    if (!call) return console.debug('No call found', content.call_id, mx.callEventHandler?.calls);
                    if (call.state !== CallState.Ringing) return console.debug('Not ringing state');
                    clearInterval(interval);

                    // TODO: Implement a better "Busy" logic.
                    if (callWindow) {
                        call.reject();
                        return;
                    }

                    setMxCall(call);
                    setCallWindow(
                        <RoomCall room={room} call={call} onHangup={onHangup} invitation={true} />
                    );
                }, 1000);
            }
        };

        mx.on(MatrixEventEvent.Decrypted, listener);
        mx.on(RoomEvent.Timeline, listener);
        return () => {
            mx.off(MatrixEventEvent.Decrypted, listener);
            mx.off(RoomEvent.Timeline, listener);
        };
    }, [mx]);

    sendExteraProfile(roomId);

    return (
        <Page ref={roomViewRef} style={style}>
            <RoomViewHeader handleCall={handleCall} />
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
