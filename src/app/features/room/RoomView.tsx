import React, { useEffect, useRef, useState } from 'react';
import { Box, Text, config } from 'folds';
import { CallEvent, EventTimeline, EventType, MatrixCall, MatrixEvent, MatrixEventEvent, Room, RoomEvent } from 'matrix-js-sdk';

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
import { useModals } from '../../hooks/useModals';
import { v4 } from 'uuid';
import { generateConferenceID } from '../../../util/conferenceID';
import { getIntegrationManagerURL } from '../../hooks/useIntegrationManager';

export function RoomView({ room, eventId, threadRootId }: { room: Room; eventId?: string; threadRootId?: string; }) {
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
        if (callWindow) return console.error('A call is already going on');
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

    const modals = useModals();

    const openWidget = async (ev: MatrixEvent) => {
        const profile = myUserId ? mx.getUser(myUserId) : null;
        const content = ev.getContent();
        if (typeof content.url !== 'string') return;
        const data = {
            matrix_user_id: myUserId,
            matrix_room_id: room.roomId,
            matrix_display_name: profile?.displayName ?? myUserId,
            matrix_avatar_url: profile?.avatarUrl && mx.mxcUrlToHttp(profile?.avatarUrl),
            ...content.data
        };
        var url = `${content.url}`; // Should not be a reference
        for (const key in data) {
            if (typeof data[key] === 'string') {
                url = url.replaceAll(`$${key}`, data[key]);
            }
        }
        if (!url.startsWith('https://')) return;
        const r = await getIntegrationManagerURL(mx, room);
        if (url.startsWith('https://scalar.vector.im') && r?.token) url += `&scalar_token=${r.token}`;
        modals.addModal({
            allowClose: true,
            title: content.name ?? 'Widget',
            node: (
                <iframe
                    style={{ border: 'none', width: '100%', height: '100%' }}
                    allow="autoplay; camera; clipboard-write; compute-pressure; display-capture; hid; microphone; screen-wake-lock"
                    allowFullScreen
                    data-widget-room-id={ev.getRoomId()}
                    data-widget-event-id={ev.getId()}
                    data-widget-name={content.name}
                    data-widget-room-name={room.name}
                    data-widget={true}
                    src={url}
                />
            ),
            externalUrl: url
        });
    };

    const handleVideoCall = async (dontCreate?: boolean) => {
        const timeline = room.getLiveTimeline();
        const state = timeline.getState(EventTimeline.FORWARDS);
        const widgetsEvents = [
            ...(state?.getStateEvents('m.widget') ?? []),
            ...(state?.getStateEvents('im.vector.modular.widgets') ?? [])
        ];

        const ev = widgetsEvents.find(x => x.getContent().type === 'jitsi' || x.getContent().type === 'm.jitsi');
        console.debug(ev);
        if (ev) return openWidget(ev);
        if (dontCreate === true) return;
        const conferenceId = generateConferenceID();
        const id = `m.jitsi_${myUserId}_${Date.now()}`;
        // @ts-ignore
        const sent = await mx.sendStateEvent(room.roomId, 'im.vector.modular.widgets', {
            creatorUserId: myUserId,
            data: {
                conferenceId,
                domain: 'meet.element.io',
                isAudioOnly: false
            },
            id,
            name: 'Jitsi Meet',
            type: 'jitsi',
            url: `https://officialdakari.ru/jitsi.html?confId=${conferenceId}#conferenceDomain=$domain&conferenceId=$conferenceId&isAudioOnly=$isAudioOnly&displayName=$matrix_display_name&avatarUrl=$matrix_avatar_url&userId=$matrix_user_id&roomId=$matrix_room_id&theme=$theme`
        }, id);
        handleVideoCall(true);
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

                    console.debug('Invited to a call!!!', content.offer);

                    const call = mx.callEventHandler?.calls.get(content.call_id);

                    if (!call) return console.debug('No call found', content.call_id, mx.callEventHandler?.calls);
                    if (call.state !== CallState.Ringing) return console.debug('Not ringing state');
                    clearInterval(interval);

                    // TODO: Implement a better "Busy" logic.
                    if (callWindow) {
                        call.reject();
                        return;
                    }

                    console.debug(`Call offer!!!`, content.offer);

                    setMxCall(call);
                    setCallWindow(
                        <RoomCall room={room} call={call} onHangup={onHangup} invitation={true} video={content.offer.sdp.includes('video')} />
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
            <RoomViewHeader handleVideoCall={handleVideoCall} handleCall={handleCall} />
            <Box grow="Yes" direction="Column">
                <RoomTimeline
                    key={roomId}
                    room={room}
                    eventId={eventId}
                    roomInputRef={roomInputRef}
                    textAreaRef={taRef}
                    threadRootId={threadRootId}
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
                                    threadRootId={threadRootId}
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
