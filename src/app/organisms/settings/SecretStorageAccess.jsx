import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './SecretStorageAccess.scss';
import { deriveKey } from 'matrix-js-sdk/lib/crypto/key_passphrase';

import initMatrix from '../../../client/initMatrix';
import { openReusableDialog } from '../../../client/action/navigation';
import { getDefaultSSKey, getSSKeyInfo } from '../../../util/matrixUtil';
import { storePrivateKey, hasPrivateKey, getPrivateKey } from '../../../client/state/secretStorageKeys';

import Text from '../../atoms/text/Text';

import { useStore } from '../../hooks/useStore';
import { Alert, Button, DialogActions, DialogContent, TextField } from '@mui/material';
import { getText } from '../../../lang';
import { LoadingButton } from '@mui/lab';

function SecretStorageAccess({ onComplete }) {
    const mx = initMatrix.matrixClient;
    const sSKeyId = getDefaultSSKey();
    const sSKeyInfo = getSSKeyInfo(sSKeyId);
    const isPassphrase = !!sSKeyInfo.passphrase;
    const [withPhrase, setWithPhrase] = useState(isPassphrase);
    const [process, setProcess] = useState(false);
    const [error, setError] = useState(null);
    const mountStore = useStore();

    const toggleWithPhrase = () => setWithPhrase(!withPhrase);

    const processInput = async ({ key, phrase }) => {
        mountStore.setItem(true);
        setProcess(true);
        try {
            const { salt, iterations } = sSKeyInfo.passphrase || {};
            const privateKey = key
                ? mx.keyBackupKeyFromRecoveryKey(key)
                : await deriveKey(phrase, salt, iterations);
            const isCorrect = await mx.checkSecretStorageKey(privateKey, sSKeyInfo);

            if (!mountStore.getItem()) return;
            if (!isCorrect) {
                setError(`Incorrect Security ${key ? 'Key' : 'Phrase'}`);
                setProcess(false);
                return;
            }
            onComplete({
                keyId: sSKeyId,
                key,
                phrase,
                privateKey,
            });
        } catch (e) {
            if (!mountStore.getItem()) return;
            setError(`Incorrect Security ${key ? 'Key' : 'Phrase'}`);
            setProcess(false);
        }
    };

    const handleForm = async (e) => {
        e.preventDefault();
        const password = e.target.password.value;
        if (password.trim() === '') return;
        const data = {};
        if (withPhrase) data.phrase = password;
        else data.key = password;
        processInput(data);
    };

    const handleChange = () => {
        setError(null);
        setProcess(false);
    };

    return (
        <form style={{ flexDirection: 'column' }} onSubmit={handleForm}>
            <DialogContent>
                <TextField
                    name="password"
                    label={`Security ${withPhrase ? 'Phrase' : 'Key'}`}
                    type="password"
                    onChange={handleChange}
                    required
                    fullWidth
                    color={error ? 'error' : null}
                />
                {error && <Alert severity='error'>{error}</Alert>}
            </DialogContent>
            <DialogActions>
                {isPassphrase && <Button color='secondary' onClick={toggleWithPhrase}>{`Use Security ${withPhrase ? 'Key' : 'Phrase'}`}</Button>}
                <LoadingButton loading={process} type="submit">{getText('btn.continue')}</LoadingButton>
            </DialogActions>
        </form>
    );
}
SecretStorageAccess.propTypes = {
    onComplete: PropTypes.func.isRequired,
};

/**
 * @param {string} title Title of secret storage access dialog
 * @returns {Promise<keyData | null>} resolve to keyData or null
 */
export const accessSecretStorage = (title) => new Promise((resolve) => {
    let isCompleted = false;
    const defaultSSKey = getDefaultSSKey();
    if (hasPrivateKey(defaultSSKey)) {
        resolve({ keyId: defaultSSKey, privateKey: getPrivateKey(defaultSSKey) });
        return;
    }
    const handleComplete = (keyData) => {
        isCompleted = true;
        storePrivateKey(keyData.keyId, keyData.privateKey);
        resolve(keyData);
    };

    openReusableDialog(
        title,
        (requestClose) => (
            <SecretStorageAccess
                onComplete={(keyData) => {
                    handleComplete(keyData);
                    requestClose(requestClose);
                }}
            />
        ),
        () => {
            if (!isCompleted) resolve(null);
        },
    );
});

export default SecretStorageAccess;
