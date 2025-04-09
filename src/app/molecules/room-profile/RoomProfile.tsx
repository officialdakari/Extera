import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import './RoomProfile.scss';

import { Button, TextField, Typography } from '@mui/material';
import { MatrixEvent, RoomStateEvent } from 'matrix-js-sdk';
import cons from '../../../client/state/cons';
import colorMXID from '../../../util/colorMXID';

import Text from '../../atoms/text/Text';
import Avatar from '../../atoms/avatar/Avatar';
import ImageUpload from '../image-upload/ImageUpload';

import { useStore } from '../../hooks/useStore';
import { useForceUpdate } from '../../hooks/useForceUpdate';
import { confirmDialog } from '../confirm-dialog/ConfirmDialog';
import { mDirectAtom } from '../../state/mDirectList';
import { getText } from '../../../lang';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { StateEvent } from '../../../types/matrix/room';

function RoomProfile({ roomId, isEditing, setIsEditing }: { roomId: string, isEditing?: boolean, setIsEditing?: (a: boolean) => void }) {
	const isMountStore = useStore();
	const [, forceUpdate] = useForceUpdate();
	const [status, setStatus] = useState({
		msg: null,
		type: cons.status.PRE_FLIGHT,
	});

	const mx = useMatrixClient();
	const mDirects = useAtomValue(mDirectAtom);
	const isDM = useMemo(() => mDirects.has(roomId), [mDirects, roomId]);
	const room = useMemo(() => mx.getRoom(roomId)!, [mx, roomId]);
	const { currentState } = room;

	const avatarSrc: string | null = useMemo(
		() => isDM
			// this is terrible lmao
			? room.getAvatarUrl(mx.baseUrl, 36, 36, 'crop', false) || room.getAvatarFallbackMember()?.getAvatarUrl(mx.baseUrl, 36, 36, 'crop', false, false) || null
			: room.getAvatarUrl(mx.baseUrl, 36, 36, 'crop', false),
		[mx, isDM, room]
	);
	const roomName = useMemo(() => room.name, [room]);
	const roomTopic = useMemo(() => currentState.getStateEvents('m.room.topic')[0]?.getContent().topic, [currentState]);

	const userId = useMemo(() => mx.getUserId()!, [mx]);

	const canChangeAvatar = useMemo(() => room.currentState.maySendStateEvent('m.room.avatar', userId), [room, userId]);
	const canChangeName = useMemo(() => room.currentState.maySendStateEvent('m.room.name', userId), [room, userId]);
	const canChangeTopic = useMemo(() => room.currentState.maySendStateEvent('m.room.topic', userId), [room, userId]);
	// const canChangeBanner = currentState.maySendStateEvent('page.codeberg.everypizza.room.banner', userId);

	useEffect(() => {
		isMountStore.setItem(true);
		const handleStateEvent = (mEvent: MatrixEvent) => {
			if (mEvent.event.room_id !== roomId) return;
			forceUpdate();
		};

		mx.on(RoomStateEvent.Events, handleStateEvent);
		return () => {
			mx.removeListener(RoomStateEvent.Events, handleStateEvent);
			isMountStore.setItem(false);
			setStatus({
				msg: null,
				type: cons.status.PRE_FLIGHT,
			});
			setIsEditing?.(false);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [roomId]);

	const handleOnSubmit = useCallback(
		async (e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			const { currentTarget } = e;

			const roomNameInput = (currentTarget.elements.namedItem('room-name') as HTMLInputElement);
			const roomTopicInput = (currentTarget.elements.namedItem('room-topic') as HTMLInputElement);

			try {
				if (canChangeName) {
					const newName = roomNameInput.value;
					if (newName !== roomName && roomName.trim() !== '') {
						setStatus({
							msg: getText('room_profile.saving_name'),
							type: cons.status.IN_FLIGHT,
						});
						await mx.setRoomName(roomId, newName);
					}
				}
				if (canChangeTopic) {
					const newTopic = roomTopicInput.value;
					if (newTopic !== roomTopic) {
						if (isMountStore.getItem()) {
							setStatus({
								msg: getText('room_profile.saving_topic'),
								type: cons.status.IN_FLIGHT,
							});
						}
						await mx.setRoomTopic(roomId, newTopic);
					}
				}
				if (!isMountStore.getItem()) return;
				setStatus({
					msg: getText('room_profile.saved'),
					type: cons.status.SUCCESS,
				});
			} catch (err: any) {
				if (!isMountStore.getItem()) return;
				setStatus({
					msg: err.message || getText('error.room_profile'),
					type: cons.status.ERROR,
				});
			}
		},
		[canChangeName, canChangeTopic, isMountStore, mx, roomId, roomName, roomTopic]
	);

	const handleCancelEditing = useCallback(
		() => {
			setStatus({
				msg: null,
				type: cons.status.PRE_FLIGHT,
			});
			setIsEditing?.(false);
		},
		[setIsEditing]
	);

	const handleAvatarUpload = async (url?: string) => {
		if (!url) {
			const isConfirmed = await confirmDialog(
				getText('confirm.remove_room_avatar.title'),
				getText('confirm.remove_room_avatar.desc'),
				getText('btn.remove_room_avatar'),
				'warning'
			);
			if (isConfirmed) {
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				await mx.sendStateEvent(roomId, StateEvent.RoomAvatar, { url }, '');
			}
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
		} else await mx.sendStateEvent(roomId, StateEvent.RoomAvatar, { url }, '');
		// Who the heck thought that adding only beacon state events would be a good idea?
		// Why not `| string`?
	};

	const renderEditNameAndTopic = useCallback(
		() => (
			<form className="room-profile__edit-form" onSubmit={handleOnSubmit}>
				{canChangeName && (
					<TextField
						defaultValue={roomName}
						name="room-name"
						disabled={status.type === cons.status.IN_FLIGHT}
						label="Name"
						fullWidth
					/>
				)}
				{canChangeTopic && (
					<TextField
						defaultValue={roomTopic}
						name="room-topic"
						disabled={status.type === cons.status.IN_FLIGHT}
						fullWidth
						multiline
						label="Topic"
					/>
				)}
				{(!canChangeName || !canChangeTopic) && (
					<Text variant="b3">{
						getText(
							'room_profile.only',
							getText(room.isSpaceRoom() ? 'room_profile.only.space' : 'room_profile.only.room'),
							getText(canChangeName ? 'room_profile.only.name' : 'room_profile.only.topic')
						)
					}</Text>
				)}
				{status.type === cons.status.IN_FLIGHT && <Typography>{status.msg}</Typography>}
				{status.type === cons.status.SUCCESS && (
					<Typography color='success'>
						{status.msg}
					</Typography>
				)}
				{status.type === cons.status.ERROR && (
					<Typography color='error'>
						{status.msg}
					</Typography>
				)}
				{status.type !== cons.status.IN_FLIGHT && (
					<div>
						<Button type="submit" variant='contained' color="primary">
							{getText('btn.room_profile.save')}
						</Button>
						<Button onClick={handleCancelEditing}>{getText('btn.cancel')}</Button>
					</div>
				)}
			</form>
		),
		[canChangeName, canChangeTopic, handleCancelEditing, handleOnSubmit, room, roomName, roomTopic, status.msg, status.type]
	);

	const renderNameAndTopic = () => (
		<div
			className="room-profile__display"
			style={{ marginBottom: avatarSrc && canChangeAvatar ? '24px' : '0' }}
		>
			<div>
				<Typography color='textPrimary' variant='h5'>
					{roomName}
				</Typography>
			</div>
			<Typography color='textSecondary' variant='subtitle1'>{room.getCanonicalAlias() || room.roomId}</Typography>
		</div>
	);

	return (
		<div className="room-profile">
			<div className="room-profile__content">
				{(!canChangeAvatar || !isEditing) && (
					<Avatar imageSrc={avatarSrc} text={roomName} bgColor={colorMXID(roomId)} size="large" />
				)}
				{canChangeAvatar && isEditing && (
					<ImageUpload
						text={roomName}
						bgColor={colorMXID(roomId)}
						imageSrc={avatarSrc}
						onUpload={handleAvatarUpload}
						onRequestRemove={() => handleAvatarUpload()}
					/>
				)}
				{!isEditing && renderNameAndTopic()}
				{isEditing && renderEditNameAndTopic()}
			</div>
		</div>
	);
}

export default RoomProfile;
