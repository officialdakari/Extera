import React, { useCallback } from 'react';

import { Button, Typography } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { ErrorOutline } from '@mui/icons-material';
import * as css from './RoomTombstone.css';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { genRoomVia } from '../../../util/matrixUtil';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { Membership } from '../../../types/matrix/room';
import { RoomInputPlaceholder } from './RoomInputPlaceholder';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { getText } from '../../../lang';

type RoomTombstoneProps = { roomId: string; body?: string; replacementRoomId: string; newDesign?: boolean; };
export function RoomTombstone({ roomId, body, replacementRoomId, newDesign }: RoomTombstoneProps) {
	const mx = useMatrixClient();
	const { navigateRoom } = useRoomNavigate();

	const [joinState, handleJoin] = useAsyncCallback(
		useCallback(() => {
			const currentRoom = mx.getRoom(roomId);
			const via = currentRoom ? genRoomVia(currentRoom) : [];
			return mx.joinRoom(replacementRoomId, {
				viaServers: via,
			});
		}, [mx, roomId, replacementRoomId])
	);
	const replacementRoom = mx.getRoom(replacementRoomId);

	const handleOpen = () => {
		if (replacementRoom) navigateRoom(replacementRoom.roomId);
		if (joinState.status === AsyncStatus.Success) navigateRoom(joinState.data.roomId);
	};

	return (
		<RoomInputPlaceholder newDesign={newDesign} alignItems="Center" gap="600" className={css.RoomTombstone}>
			<ErrorOutline />
			<Typography flexGrow={1}>
				{body || getText('room_tombstone.default_reason')}
			</Typography>
			{replacementRoom?.getMyMembership() === Membership.Join ||
				joinState.status === AsyncStatus.Success ? (
				<Button onClick={handleOpen}>
					{getText('btn.room_tombstone.new_room')}
				</Button>
			) : (
				<LoadingButton
					onClick={handleJoin}
					loading={joinState.status === AsyncStatus.Loading}
				>
					{getText('btn.room_tombstone.join_room')}
				</LoadingButton>
			)}
		</RoomInputPlaceholder>
	);
}
