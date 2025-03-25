import React, { useEffect, useState } from 'react';
import { ClientEvent, SyncState } from 'matrix-js-sdk';
import { Alert } from '@mui/material';
import { useMatrixClient } from '../../hooks/useMatrixClient';
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

	return (!syncState || (syncState as string) === 'NULL') ? (
		<Alert severity="info" variant="standard" sx={{ background: 'transparent' }}>
			{getText(`loading`)}
		</Alert>
	) : (
		syncState && syncState !== SyncState.Prepared && syncState !== SyncState.Syncing && (
			<Alert severity={syncState === SyncState.Error ? 'error' : 'info'} sx={{ background: 'transparent' }}>
				{getText(`sync_state.${syncState}`)}
			</Alert>
		)
	);
}