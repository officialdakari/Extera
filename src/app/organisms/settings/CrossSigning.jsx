/* eslint-disable react/jsx-one-expression-per-line */
import React, { useState } from 'react';
import './CrossSigning.scss';
import FileSaver from 'file-saver';
import { Formik } from 'formik';

import initMatrix from '../../../client/initMatrix';
import { openReusableDialog } from '../../../client/action/navigation';
import { copyToClipboard } from '../../../util/common';
import { clearSecretStorageKeys } from '../../../client/state/secretStorageKeys';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import Input from '../../atoms/input/Input';
import Spinner from '../../atoms/spinner/Spinner';
import SettingTile from '../../molecules/setting-tile/SettingTile';

import { authRequest } from './AuthRequest';
import { useCrossSigningStatus } from '../../hooks/useCrossSigningStatus';
import { getText, translate } from '../../../lang';

const failedDialog = () => {
    const renderFailure = (requestClose) => (
        <div className="cross-signing__failure">
            <Text variant="h1">❌</Text>
            <Text weight="medium">{getText('error.crosssigning')}</Text>
            <Button onClick={requestClose}>{getText('btn.close')}</Button>
        </div>
    );

    openReusableDialog(
        <Text variant="s1" weight="medium">
            {getText('btn.crosssigning.title')}
        </Text>,
        renderFailure
    );
};

const securityKeyDialog = (key) => {
    const downloadKey = () => {
        const blob = new Blob([key.encodedPrivateKey], {
            type: 'text/plain;charset=us-ascii',
        });
        FileSaver.saveAs(blob, 'security-key.txt');
    };
    const copyKey = () => {
        copyToClipboard(key.encodedPrivateKey);
    };

    const renderSecurityKey = () => (
        <div className="cross-signing__key">
            <Text weight="medium">{getText('crosssigning.tip')}</Text>
            <Text className="cross-signing__key-text">{key.encodedPrivateKey}</Text>
            <div className="cross-signing__key-btn">
                <Button variant="primary" onClick={() => copyKey(key)}>
                    {getText('btn.copy')}
                </Button>
                <Button onClick={() => downloadKey(key)}>
                    {getText('btn.download')}
                </Button>
            </div>
        </div>
    );

    // Download automatically.
    downloadKey();

    openReusableDialog(
        <Text variant="s1" weight="medium">
            {getText('crosssigning.key.title')}
        </Text>,
        () => renderSecurityKey()
    );
};

function CrossSigningSetup() {
    const initialValues = { phrase: '', confirmPhrase: '' };
    const [genWithPhrase, setGenWithPhrase] = useState(undefined);

    const setup = async (securityPhrase = undefined) => {
        const mx = initMatrix.matrixClient;
        setGenWithPhrase(typeof securityPhrase === 'string');
        const recoveryKey = await mx.createRecoveryKeyFromPassphrase(securityPhrase);
        clearSecretStorageKeys();

        await mx.bootstrapSecretStorage({
            createSecretStorageKey: async () => recoveryKey,
            setupNewKeyBackup: true,
            setupNewSecretStorage: true,
        });

        const authUploadDeviceSigningKeys = async (makeRequest) => {
            const isDone = await authRequest(getText('crosssigning.title'), async (auth) => {
                await makeRequest(auth);
            });
            setTimeout(() => {
                if (isDone) securityKeyDialog(recoveryKey);
                else failedDialog();
            });
        };

        await mx.bootstrapCrossSigning({
            authUploadDeviceSigningKeys,
            setupNewCrossSigning: true,
        });
    };

    const validator = (values) => {
        const errors = {};
        if (values.phrase === '12345678') {
            errors.phrase = getText('error.password.12345678');
        } else if (values.phrase === '87654321') {
            errors.phrase = getText('error.password.87654321');
        }
        const PHRASE_REGEX = /^([^\s]){8,127}$/;
        if (values.phrase.length > 0 && !PHRASE_REGEX.test(values.phrase)) {
            errors.phrase = getText('error.password.8127.ns');
        }
        if (values.confirmPhrase.length > 0 && values.confirmPhrase !== values.phrase) {
            errors.confirmPhrase = getText('error.password.dontmatch');
        }
        return errors;
    };

    return (
        <div className="cross-signing__setup">
            <div className="cross-signing__setup-entry">
                <Text>
                    {translate(
                        'crosssigning.intro',
                        <b>
                            {getText('crosssigning.intro.security_key')}
                        </b>
                    )}
                </Text>
                {genWithPhrase !== false && (
                    <Button variant="primary" onClick={() => setup()} disabled={genWithPhrase !== undefined}>
                        {getText('btn.crosssigning.generate')}
                    </Button>
                )}
                {genWithPhrase === false && <Spinner size="small" />}
            </div>
            <Text className="cross-signing__setup-divider">{getText('generic.OR')}</Text>
            <Formik
                initialValues={initialValues}
                onSubmit={(values) => setup(values.phrase)}
                validate={validator}
            >
                {({ values, errors, handleChange, handleSubmit }) => (
                    <form
                        className="cross-signing__setup-entry"
                        onSubmit={handleSubmit}
                        disabled={genWithPhrase !== undefined}
                    >
                        <Text>
                            {getText('crosssigning.intro.2')}
                        </Text>
                        <Input
                            name="phrase"
                            value={values.phrase}
                            onChange={handleChange}
                            label={getText('label.security_phrase')}
                            type="password"
                            required
                            disabled={genWithPhrase !== undefined}
                        />
                        {errors.phrase && (
                            <Text variant="b3" className="cross-signing__error">
                                {errors.phrase}
                            </Text>
                        )}
                        <Input
                            name="confirmPhrase"
                            value={values.confirmPhrase}
                            onChange={handleChange}
                            label={getText('label.security_phrase.confirm')}
                            type="password"
                            required
                            disabled={genWithPhrase !== undefined}
                        />
                        {errors.confirmPhrase && (
                            <Text variant="b3" className="cross-signing__error">
                                {errors.confirmPhrase}
                            </Text>
                        )}
                        {genWithPhrase !== true && (
                            <Button variant="primary" type="submit" disabled={genWithPhrase !== undefined}>
                                {getText('btn.set_phrase_and_generate_key')}
                            </Button>
                        )}
                        {genWithPhrase === true && <Spinner size="small" />}
                    </form>
                )}
            </Formik>
        </div>
    );
}

const setupDialog = () => {
    openReusableDialog(
        <Text variant="s1" weight="medium">
            {getText('crosssigning.title')}
        </Text>,
        () => <CrossSigningSetup />
    );
};

function CrossSigningReset() {
    return (
        <div className="cross-signing__reset">
            <Text variant="h1">✋🧑‍🚒🤚</Text>
            <Text weight="medium">{getText('reset_cross_signing.warning')}</Text>
            <Text>
                {getText('reset_cross_signing.warning.2')}
            </Text>
            <Button variant="danger" onClick={setupDialog}>
                Reset
            </Button>
        </div>
    );
}

const resetDialog = () => {
    openReusableDialog(
        <Text variant="s1" weight="medium">
            {getText('reset_cross_signing.title')}
        </Text>,
        () => <CrossSigningReset />
    );
};

function CrossSignin() {
    const isCSEnabled = useCrossSigningStatus();
    return (
        <SettingTile
            title={getText('cross_signing_tile.title')}
            content={
                <Text variant="b3">
                    {getText('cross_signing_tile.desc')}
                </Text>
            }
            options={
                isCSEnabled ? (
                    <Button variant="danger" onClick={resetDialog}>
                        {getText('btn.reset_cross_signing')}
                    </Button>
                ) : (
                    <Button variant="primary" onClick={setupDialog}>
                        {getText('btn.setup_cross_signing')}
                    </Button>
                )
            }
        />
    );
}

export default CrossSignin;
