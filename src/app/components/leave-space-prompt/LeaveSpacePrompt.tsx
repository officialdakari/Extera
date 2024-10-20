import React, { useCallback, useEffect } from 'react';
import { MatrixError } from 'matrix-js-sdk';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { getText, translate } from '../../../lang';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { getRoomNameOrId } from '../../utils/matrix';
import { LoadingButton } from '@mui/lab';

type LeaveSpacePromptProps = {
    roomId: string;
    onDone: () => void;
    onCancel: () => void;
};
export function LeaveSpacePrompt({ roomId, onDone, onCancel }: LeaveSpacePromptProps) {
    const mx = useMatrixClient();

    const [leaveState, leaveRoom] = useAsyncCallback<undefined, MatrixError, []>(
        useCallback(async () => {
            mx.leave(roomId);
        }, [mx, roomId])
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
                {getText('leavespace.title')}
            </DialogTitle>
            <DialogContent>
                <DialogContentText>
                    {translate('leavespace.text.2', <b>{getRoomNameOrId(mx, roomId)}</b>)}
                </DialogContentText>
                {leaveState.status === AsyncStatus.Error && (
                    <Alert severity='error'>
                        {getText('error.leavespace', leaveState.error.message)}
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
