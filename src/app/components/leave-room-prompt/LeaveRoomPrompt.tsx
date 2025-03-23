import React, { useCallback, useEffect } from 'react';
import { MatrixError } from 'matrix-js-sdk';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { getText, translate } from '../../../lang';
import { getRoomNameOrId } from '../../utils/matrix';

type LeaveRoomPromptProps = {
	roomId: string;
	onDone: () => void;
	onCancel: () => void;
};
export function LeaveRoomPrompt({ roomId, onDone, onCancel }: LeaveRoomPromptProps) {
	const mx = useMatrixClient();

	const [leaveState, leaveRoom] = useAsyncCallback<object, MatrixError, []>(
		useCallback(() => mx.leave(roomId), [mx, roomId])
	);

	const handleLeave = () => {
		leaveRoom();
	};

	useEffect(() => {
		if (leaveState.status === AsyncStatus.Success) {
			onDone();
		}
	}, [leaveState, onDone]);

	return (
		<Dialog open onClose={onCancel}>
			<DialogTitle>
				{getText('leaveroom.title')}
			</DialogTitle>
			<DialogContent>
				<DialogContentText>
					{translate('leaveroom.text.2', <b>{getRoomNameOrId(mx, roomId)}</b>)}
				</DialogContentText>
				{leaveState.status === AsyncStatus.Error && (
					<Alert severity='error'>
						{getText('error.leaveroom', leaveState.error.message)}
					</Alert>
				)}
			</DialogContent>
			<DialogActions>
				<Button onClick={onCancel}>{getText('btn.cancel')}</Button>
				<LoadingButton loading={leaveState.status === AsyncStatus.Loading} onClick={handleLeave} color='error'>{getText('btn.leave')}</LoadingButton>
			</DialogActions>
		</Dialog>
	);
}
