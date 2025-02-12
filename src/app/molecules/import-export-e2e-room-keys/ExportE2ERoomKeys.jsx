import React, { useState, useEffect, useRef } from 'react';
import './ExportE2ERoomKeys.scss';

import FileSaver from 'file-saver';

import { CircularProgress, TextField } from '@mui/material';
import { LoadingButton } from '@mui/lab';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import { encryptMegolmKeyFile } from '../../../util/cryptE2ERoomKeys';

import Text from '../../atoms/text/Text';

import { useStore } from '../../hooks/useStore';
import { getText } from '../../../lang';

function ExportE2ERoomKeys() {
    const isMountStore = useStore();
    const [status, setStatus] = useState({
        isOngoing: false,
        msg: null,
        type: cons.status.PRE_FLIGHT,
    });
    const passwordRef = useRef(null);
    const confirmPasswordRef = useRef(null);

    const exportE2ERoomKeys = async () => {
        const password = passwordRef.current.value;
        if (password !== confirmPasswordRef.current.value) {
            setStatus({
                isOngoing: false,
                msg: getText('error.passwords_didnt_match'),
                type: cons.status.ERROR,
            });
            return;
        }
        setStatus({
            isOngoing: true,
            msg: getText('export_keys.getting'),
            type: cons.status.IN_FLIGHT,
        });
        try {
            const keys = await initMatrix.matrixClient.exportRoomKeys();
            if (isMountStore.getItem()) {
                setStatus({
                    isOngoing: true,
                    msg: getText('export_keys.encrypting'),
                    type: cons.status.IN_FLIGHT,
                });
            }
            const encKeys = await encryptMegolmKeyFile(JSON.stringify(keys), password);
            const blob = new Blob([encKeys], {
                type: 'text/plain;charset=us-ascii',
            });
            FileSaver.saveAs(blob, 'extera-keys.txt');
            if (isMountStore.getItem()) {
                setStatus({
                    isOngoing: false,
                    msg: getText('success.export_keys'),
                    type: cons.status.SUCCESS,
                });
            }
        } catch (e) {
            if (isMountStore.getItem()) {
                setStatus({
                    isOngoing: false,
                    msg: e.friendlyText || getText('error.export_keys'),
                    type: cons.status.ERROR,
                });
            }
        }
    };

    useEffect(() => {
        isMountStore.setItem(true);
        return () => {
            isMountStore.setItem(false);
        };
    }, [isMountStore]);

    return (
        <div className="export-e2e-room-keys">
            <form className="export-e2e-room-keys__form" onSubmit={(e) => { e.preventDefault(); exportE2ERoomKeys(); }}>
                <TextField sx={{ flexGrow: 1 }} variant='filled' size='small' inputRef={passwordRef} type="password" label={getText('placeholder.password')} required />
                <TextField sx={{ flexGrow: 1 }} variant='filled' size='small' inputRef={confirmPasswordRef} type="password" label={getText('placeholder.confirm_password')} required />
                <LoadingButton loading={status.isOngoing} size='small' variant="contained" type="submit">{getText('btn.export_keys')}</LoadingButton>
            </form>
            {status.type === cons.status.IN_FLIGHT && (
                <div className="import-e2e-room-keys__process">
                    <CircularProgress />
                    <Text variant="b2">{status.msg}</Text>
                </div>
            )}
            {status.type === cons.status.SUCCESS && <Text className="import-e2e-room-keys__success" variant="b2">{status.msg}</Text>}
            {status.type === cons.status.ERROR && <Text className="import-e2e-room-keys__error" variant="b2">{status.msg}</Text>}
        </div>
    );
}

export default ExportE2ERoomKeys;
