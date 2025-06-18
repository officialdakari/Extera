/* eslint-disable react/prop-types */
import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import './EmojiVerification.scss';

import { AppBar, Button, CircularProgress, Dialog, IconButton, Toolbar, Typography } from '@mui/material';
import { Close } from '@mui/icons-material';
import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import { hasPrivateKey } from '../../../client/state/secretStorageKeys';
import { getDefaultSSKey, isCrossVerified } from '../../../util/matrixUtil';

import Text from '../../atoms/text/Text';

import { useStore } from '../../hooks/useStore';
import { accessSecretStorage } from '../../features/settings/SecretStorageAccess';
import { getText } from '../../../lang';

function EmojiVerificationContent({ data, requestClose }) {
    const [sas, setSas] = useState(null);
    const [process, setProcess] = useState(false);
    const { request, targetDevice } = data;
    const mx = initMatrix.matrixClient;
    const mountStore = useStore();
    const beginStore = useStore();

    const beginVerification = useCallback(async () => {
        if (
            isCrossVerified(mx.deviceId) &&
            (mx.getCrossSigningId() === null ||
                (await mx.crypto.crossSigningInfo.isStoredInKeyCache('self_signing')) === false)
        ) {
            if (!hasPrivateKey(getDefaultSSKey())) {
                const keyData = await accessSecretStorage('Emoji verification');
                if (!keyData) {
                    request.cancel();
                    return;
                }
            }
            await mx.checkOwnCrossSigningTrust();
        }
        setProcess(true);
        await request.accept();

        const verifier = request.beginKeyVerification('m.sas.v1', targetDevice);

        const handleVerifier = (sasData) => {
            verifier.off('show_sas', handleVerifier);
            if (!mountStore.getItem()) return;
            setSas(sasData);
            setProcess(false);
        };
        verifier.on('show_sas', handleVerifier);
        await verifier.verify();
    }, [mx, request, targetDevice, mountStore]);

    const sasMismatch = () => {
        sas.mismatch();
        setProcess(true);
    };

    const sasConfirm = () => {
        sas.confirm();
        setProcess(true);
    };

    useEffect(() => {
        mountStore.setItem(true);
        const handleChange = () => {
            if (request.done || request.cancelled) {
                requestClose();
                return;
            }
            if (targetDevice && !beginStore.getItem()) {
                beginStore.setItem(true);
                beginVerification();
            }
        };

        if (request === null) return undefined;
        const req = request;
        req.on('change', handleChange);
        return () => {
            req.off('change', handleChange);
            if (req.cancelled === false && req.done === false) {
                req.cancel();
            }
        };
    }, [request, beginStore, beginVerification, mountStore, requestClose, targetDevice]);

    const renderWait = () => (
        <>
            <CircularProgress />
            <Typography>
                {getText('emoji_verification.waiting')}
            </Typography>
        </>
    );

    if (sas !== null) {
        return (
            <div className="emoji-verification__content">
                <Text>{getText('emoji_verification.tip')}</Text>
                <div className="emoji-verification__emojis">
                    {sas.sas.emoji.map((emoji, i) => (
                        // eslint-disable-next-line react/no-array-index-key
                        <div className="emoji-verification__emoji-block" key={`${emoji[1]}-${i}`}>
                            <Text variant="h1">{emoji[0]}</Text>
                            <Text>{emoji[1]}</Text>
                        </div>
                    ))}
                </div>
                <div className="emoji-verification__buttons">
                    {process ? (
                        renderWait()
                    ) : (
                        <>
                            <Button variant="contained" color='primary' onClick={sasConfirm}>
                                {getText('btn.emoji_verification.they_match')}
                            </Button>
                            <Button variant="outlined" color='error' onClick={sasMismatch}>
                                {getText('btn.emoji_verification.no_match')}
                            </Button>
                        </>
                    )}
                </div>
            </div>
        );
    }

    if (targetDevice) {
        return (
            <div className="emoji-verification__content">
                <Text>{getText('emoji_verification.outgoing')}</Text>
                <div className="emoji-verification__buttons">{renderWait()}</div>
            </div>
        );
    }

    return (
        <div className="emoji-verification__content">
            <Text>{getText('emoji_verification.ingoing')}</Text>
            <div className="emoji-verification__buttons">
                {process ? (
                    renderWait()
                ) : (
                    <Button variant="contained" color='primary' onClick={beginVerification}>
                        {getText('btn.emoji_verification.accept')}
                    </Button>
                )}
            </div>
        </div>
    );
}
EmojiVerificationContent.propTypes = {
    data: PropTypes.shape({}).isRequired,
    requestClose: PropTypes.func.isRequired,
};

function useVisibilityToggle() {
    const [data, setData] = useState(null);
    const mx = initMatrix.matrixClient;

    useEffect(() => {
        const handleOpen = (request, targetDevice) => {
            setData({ request, targetDevice });
        };
        navigation.on(cons.events.navigation.EMOJI_VERIFICATION_OPENED, handleOpen);
        mx.on('crypto.verification.request', handleOpen);
        return () => {
            navigation.removeListener(cons.events.navigation.EMOJI_VERIFICATION_OPENED, handleOpen);
            mx.removeListener('crypto.verification.request', handleOpen);
        };
    }, [mx]);

    const requestClose = () => setData(null);

    return [data, requestClose];
}

function EmojiVerification() {
    const [data, requestClose] = useVisibilityToggle();

    return (
        <Dialog
            open={data !== null}
            onClose={requestClose}
        >
            <AppBar position='relative'>
                <Toolbar>
                    <Typography
                        variant='h6'
                        component='div'
                        flexGrow={1}
                    >
                        {getText('emoji_verification.title')}
                    </Typography>
                    <IconButton
                        edge='end'
                        size='large'
                        onClick={requestClose}
                    >
                        <Close />
                    </IconButton>
                </Toolbar>

            </AppBar>
            {data !== null ? (
                <EmojiVerificationContent data={data} requestClose={requestClose} />
            ) : (
                <div />
            )}
        </Dialog>
    );
}

export default EmojiVerification;
