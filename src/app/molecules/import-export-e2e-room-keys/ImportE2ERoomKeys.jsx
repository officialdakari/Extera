import React, { useState, useEffect, useRef } from 'react';
import './ImportE2ERoomKeys.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import { decryptMegolmKeyFile } from '../../../util/cryptE2ERoomKeys';

import { useStore } from '../../hooks/useStore';
import { getText } from '../../../lang';
import { mdiPlusCircle } from '@mdi/js';
import { Button, CircularProgress, IconButton, TextField, Typography } from '@mui/material';
import { Close } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';

function ImportE2ERoomKeys() {
    const isMountStore = useStore();
    const [keyFile, setKeyFile] = useState(null);
    const [status, setStatus] = useState({
        isOngoing: false,
        msg: null,
        type: cons.status.PRE_FLIGHT,
    });
    const inputRef = useRef(null);
    const passwordRef = useRef(null);

    async function tryDecrypt(file, password) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            if (isMountStore.getItem()) {
                setStatus({
                    isOngoing: true,
                    msg: getText('import_keys.decrypting'),
                    type: cons.status.IN_FLIGHT,
                });
            }

            const keys = await decryptMegolmKeyFile(arrayBuffer, password);
            if (isMountStore.getItem()) {
                setStatus({
                    isOngoing: true,
                    msg: getText('import_keys.msg_decrypting'),
                    type: cons.status.IN_FLIGHT,
                });
            }
            await initMatrix.matrixClient.importRoomKeys(JSON.parse(keys));
            if (isMountStore.getItem()) {
                setStatus({
                    isOngoing: false,
                    msg: getText('success.import_keys'),
                    type: cons.status.SUCCESS,
                });
                inputRef.current.value = null;
                passwordRef.current.value = null;
            }
        } catch (e) {
            if (isMountStore.getItem()) {
                setStatus({
                    isOngoing: false,
                    msg: e.friendlyText || getText('error.import_keys'),
                    type: cons.status.ERROR,
                });
            }
        }
    }

    const importE2ERoomKeys = () => {
        const password = passwordRef.current.value;
        if (password === '' || keyFile === null) return;
        if (status.isOngoing) return;

        tryDecrypt(keyFile, password);
    };

    const handleFileChange = (e) => {
        const file = e.target.files.item(0);
        passwordRef.current.value = '';
        setKeyFile(file);
        setStatus({
            isOngoing: false,
            msg: null,
            type: cons.status.PRE_FLIGHT,
        });
    };
    const removeImportKeysFile = () => {
        if (status.isOngoing) return;
        inputRef.current.value = null;
        passwordRef.current.value = null;
        setKeyFile(null);
        setStatus({
            isOngoing: false,
            msg: null,
            type: cons.status.PRE_FLIGHT,
        });
    };

    useEffect(() => {
        isMountStore.setItem(true);
        return () => {
            isMountStore.setItem(false);
        };
    }, []);

    return (
        <div className="import-e2e-room-keys">
            <input ref={inputRef} onChange={handleFileChange} style={{ display: 'none' }} type="file" />

            <form className="import-e2e-room-keys__form" onSubmit={(e) => { e.preventDefault(); importE2ERoomKeys(); }}>
                {keyFile !== null && (
                    <div className="import-e2e-room-keys__file">
                        <IconButton onClick={removeImportKeysFile}><Close /></IconButton>
                        <Typography>{keyFile.name}</Typography>
                    </div>
                )}
                {keyFile === null && <Button onClick={() => inputRef.current.click()}>{getText('btn.import_keys')}</Button>}
                <TextField sx={{ flexGrow: 1 }} size='small' variant='filled' forwardRef={passwordRef} type="password" label="Password" required />
                <LoadingButton disabled={status.isOngoing} size='small' variant="contained" type="submit">{getText('btn.import_keys.decrypt')}</LoadingButton>
            </form>
            {status.type === cons.status.IN_FLIGHT && (
                <div className="import-e2e-room-keys__process">
                    <CircularProgress />
                    <Typography fontWeight='bold'>{status.msg}</Typography>
                </div>
            )}
            {status.type === cons.status.SUCCESS && <Typography color='success'>{status.msg}</Typography>}
            {status.type === cons.status.ERROR && <Typography color='error'>{status.msg}</Typography>}
        </div>
    );
}

export default ImportE2ERoomKeys;
