/* eslint-disable no-restricted-syntax */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Box, config } from 'folds';
import { CallEvent, EventTimeline, EventType, MatrixEvent, MatrixEventEvent, Room, RoomEvent } from 'matrix-js-sdk';

import { CallState } from 'matrix-js-sdk/lib/webrtc/call';
import { useStateEvent } from '../../hooks/useStateEvent';
import { StateEvent } from '../../../types/matrix/room';
import { usePowerLevelsAPI, usePowerLevelsContext } from '../../hooks/usePowerLevels';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { RoomTimeline } from './RoomTimeline';
import { RoomViewTyping } from './RoomViewTyping';
import { RoomTombstone } from './RoomTombstone';
import { RoomInput } from './RoomInput';
import { RoomViewFollowing } from './RoomViewFollowing';
import { Page } from '../../components/page';
import { RoomViewHeader } from './RoomViewHeader';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { sendExteraProfile } from '../../../client/action/room';
import { RoomCall } from './RoomCall';
import { useRoomCall } from '../../hooks/useCall';
import { useModals } from '../../hooks/useModals';
import { generateConferenceID } from '../../../util/conferenceID';
import { getIntegrationManagerURL } from '../../hooks/useIntegrationManager';
import { mxcUrlToHttp } from '../../utils/matrix';
import WidgetIFrame from '../widget/WidgetIFrame';
import { getWallpaper } from '../../utils/wallpaper';

export function RoomView({ room, eventId }: { room: Room; eventId?: string; }) {
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

	const [callWindow, setCallWindow] = useRoomCall();

	const onHangup = useCallback(() => {
		setCallWindow(undefined);
	}, [setCallWindow]);

	const handleCall = useCallback(async () => {
		if (callWindow) return;
		const newCall = mx.createCall(room.roomId);
		if (!newCall) {
			alert('Calls are not supported in your browser!');
			return;
		}

		if (!newCall) return;

		await newCall.placeVoiceCall();

		newCall.on(CallEvent.Hangup, () => {
			setCallWindow(undefined);
		});

		setCallWindow(
			<RoomCall room={room} call={newCall} onHangup={onHangup} />
		);
	}, [mx, room, callWindow, onHangup, setCallWindow]);

	const modals = useModals();

	const openWidget = useCallback(async (ev: MatrixEvent) => {
		const profile = myUserId ? mx.getUser(myUserId) : null;
		const content = ev.getContent();
		if (typeof content.url !== 'string') return;
		const data = {
			matrix_user_id: myUserId,
			matrix_room_id: room.roomId,
			matrix_display_name: profile?.displayName ?? myUserId,
			matrix_avatar_url: profile?.avatarUrl && mxcUrlToHttp(mx, profile?.avatarUrl, undefined, undefined, undefined, true),
			...content.data
		};
		let url = `${content.url}`; // Should not be a reference
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
				<WidgetIFrame
					roomId={ev.getRoomId() || ''}
					eventId={ev.getId() || ''}
					widgetName={content.name || 'Widget'}
					roomName={room.name}
					url={url}
				/>
			),
			externalUrl: url
		});
	}, [mx, myUserId, room, modals]);

	const handleVideoCall = useCallback(async (dontCreate?: boolean) => {
		const timeline = room.getLiveTimeline();
		const state = timeline.getState(EventTimeline.FORWARDS);
		const widgetsEvents = [
			...(state?.getStateEvents('m.widget') ?? []),
			...(state?.getStateEvents('im.vector.modular.widgets') ?? [])
		];

		const ev = widgetsEvents.find(x => x.getContent().type === 'jitsi' || x.getContent().type === 'm.jitsi');
		console.debug(ev);
		if (ev) {
			openWidget(ev);
			return;
		}
		if (dontCreate === true) return;
		const conferenceId = generateConferenceID();
		const id = `m.jitsi_${myUserId}_${Date.now()}`;
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		await mx.sendStateEvent(room.roomId, 'im.vector.modular.widgets', {
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
	}, [room, mx, myUserId, openWidget]);

	useEffect(() => {
		const listener = async (event: MatrixEvent) => {
			await mx.decryptEventIfNeeded(event);
			// eslint-disable-next-line @typescript-eslint/no-shadow
			const room = mx.getRoom(event.getRoomId());
			const content = event.getContent();
			if (room && event.getType() === EventType.CallInvite && content.offer && typeof content.call_id === 'string') {
				let i = 0;
				const interval = setInterval(() => {
					if (i >= 10) {
						clearInterval(interval);
						return;
					}
					i += 1;

					console.debug('Invited to a call!!!', content.offer);

					const call = mx.callEventHandler?.calls.get(content.call_id);

					if (!call) {
						console.debug('No call found', content.call_id, mx.callEventHandler?.calls);
						return;
					}
					if (call.state !== CallState.Ringing) {
						console.debug('Not ringing state');
						return;
					}
					clearInterval(interval);

					// TODO: Implement a better "Busy" logic.
					if (callWindow) {
						call.reject();
						return;
					}

					console.debug(`Call offer!!!`, content.offer);

					setCallWindow(
						<RoomCall room={room} call={call} onHangup={onHangup} video={content.offer.sdp.includes('video')} />
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
	}, [mx, onHangup, setCallWindow, callWindow]);

	const url = useMemo(() => getWallpaper(), []);

	sendExteraProfile(roomId);

	return (
		<Page
			ref={roomViewRef}
			style={{
				backgroundImage: `url(${url})`,
				backgroundSize: 'cover'
			}}
		>
			<RoomViewHeader handleVideoCall={handleVideoCall} handleCall={handleCall} />
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
				<div style={!newDesignInput ? { padding: `0 ${config.space.S400}` } : {}}>
					{tombstoneEvent ? (
						<RoomTombstone
							roomId={roomId}
							body={tombstoneEvent.getContent().body}
							replacementRoomId={tombstoneEvent.getContent().replacement_room}
							newDesign={newDesignInput}
						/>
					) : (
						canMessage && (
							<RoomInput
								textAreaRef={taRef}
								room={room}
								roomId={roomId}
								fileDropContainerRef={roomViewRef}
								newDesign={newDesignInput}
								ref={roomInputRef}
							/>
						)
					)}
				</div>
				{!newDesignInput && (<RoomViewFollowing room={room} />)}
			</Box>
		</Page>
	);
}
