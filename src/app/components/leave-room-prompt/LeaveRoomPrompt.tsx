import React, { useCallback, useEffect } from 'react';
import FocusTrap from 'focus-trap-react';
import {
    config,
    Box,
    Text,
    color,
} from 'folds';
import { MatrixError } from 'matrix-js-sdk';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { getText, translate } from '../../../lang';
import Icon from '@mdi/react';
import { mdiClose } from '@mdi/js';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { getRoomNameOrId } from '../../utils/matrix';
import { LoadingButton } from '@mui/lab';

type LeaveRoomPromptProps = {
    roomId: string;
    onDone: () => void;
    onCancel: () => void;
};
export function LeaveRoomPrompt({ roomId, onDone, onCancel }: LeaveRoomPromptProps) {
    const mx = useMatrixClient();

    const [leaveState, leaveRoom] = useAsyncCallback<{}, MatrixError, []>(
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
