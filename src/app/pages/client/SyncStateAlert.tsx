import React, { ReactNode, useEffect, useState } from 'react';
import { useSyncState } from '../../hooks/useSyncState';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { ClientEvent, SyncState } from 'matrix-js-sdk';
import { Alert } from '@mui/material';
import { getText } from '../../../lang';

export default function SyncStateAlert() {
    const mx = useMatrixClient();
    const [syncState, setSyncState] = useState<SyncState | null>(mx.getSyncState());

    const onStateChange = (ss: SyncState) => {
        setSyncState(ss);
    };

    useEffect(() => {
        mx.on(ClientEvent.Sync, onStateChange);
        return () => {
            mx.off(ClientEvent.Sync, onStateChange);
        };
    });

    return syncState && syncState !== SyncState.Prepared && syncState !== SyncState.Syncing && (
        <Alert severity={syncState === SyncState.Error ? 'error' : 'info'}>
            {getText(`sync_state.${syncState}`)}
        </Alert>
    );
}