/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './KeyBackup.scss';

import initMatrix from '../../../client/initMatrix';
import { openReusableDialog } from '../../../client/action/navigation';
import { deletePrivateKey } from '../../../client/state/secretStorageKeys';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import IconButton from '../../atoms/button/IconButton';
import Spinner from '../../atoms/spinner/Spinner';
import InfoCard from '../../atoms/card/InfoCard';
import SettingTile from '../../molecules/setting-tile/SettingTile';

import { accessSecretStorage } from './SecretStorageAccess';

import InfoIC from '../../../../public/res/ic/outlined/info.svg';
import BinIC from '../../../../public/res/ic/outlined/bin.svg';
import DownloadIC from '../../../../public/res/ic/outlined/download.svg';

import { useStore } from '../../hooks/useStore';
import { useCrossSigningStatus } from '../../hooks/useCrossSigningStatus';
import { getText } from '../../../lang';

function CreateKeyBackupDialog({ keyData }) {
    const [done, setDone] = useState(false);
    const mx = initMatrix.matrixClient;
    const mountStore = useStore();

    const doBackup = async () => {
        setDone(false);
        let info;

        try {
            info = await mx.prepareKeyBackupVersion(null, { secureSecretStorage: true });
            info = await mx.createKeyBackupVersion(info);
            await mx.scheduleAllGroupSessionsForBackup();
            if (!mountStore.getItem()) return;
            setDone(true);
        } catch (e) {
            deletePrivateKey(keyData.keyId);
            await mx.deleteKeyBackupVersion(info.version);
            if (!mountStore.getItem()) return;
            setDone(null);
        }
    };

    useEffect(() => {
        mountStore.setItem(true);
        doBackup();
    }, []);

    return (
        <div className="key-backup__create">
            {done === false && (
                <div>
                    <Spinner size="small" />
                    <Text>{getText('key_backup.creating')}</Text>
                </div>
            )}
            {done === true && (
                <>
                    <Text variant="h1">✅</Text>
                    <Text>{getText('key_backup.created')}</Text>
                </>
            )}
            {done === null && (
                <>
                    <Text>{getText('error.key_backup')}</Text>
                    <Button onClick={doBackup}>{getText('btn.retry')}</Button>
                </>
            )}
        </div>
    );
}
CreateKeyBackupDialog.propTypes = {
    keyData: PropTypes.shape({}).isRequired,
};

function RestoreKeyBackupDialog({ keyData }) {
    const [status, setStatus] = useState(false);
    const mx = initMatrix.matrixClient;
    const mountStore = useStore();

    const restoreBackup = async () => {
        setStatus(false);

        let meBreath = true;
        const progressCallback = (progress) => {
            if (!progress.successes) return;
            if (meBreath === false) return;
            meBreath = false;
            setTimeout(() => {
                meBreath = true;
            }, 200);

            setStatus({ message: getText('key_backup.restoring', progress.successes, progress.total) });
        };

        try {
            const backupInfo = await mx.getKeyBackupVersion();
            const info = await mx.restoreKeyBackupWithSecretStorage(backupInfo, undefined, undefined, {
                progressCallback,
            });
            if (!mountStore.getItem()) return;
            setStatus({ done: getText('key_backup.success', info.imported, info.total) });
        } catch (e) {
            if (!mountStore.getItem()) return;
            if (e.errcode === 'RESTORE_BACKUP_ERROR_BAD_KEY') {
                deletePrivateKey(keyData.keyId);
                setStatus({ error: getText('error.key_backup.invalid_key'), errorCode: 'BAD_KEY' });
            } else {
                setStatus({ error: getText('error.key_backup.unknown'), errCode: 'UNKNOWN' });
            }
        }
    };

    useEffect(() => {
        mountStore.setItem(true);
        restoreBackup();
    }, []);

    return (
        <div className="key-backup__restore">
            {(status === false || status.message) && (
                <div>
                    <Spinner size="small" />
                    <Text>{status.message ?? getText('key_backup.restoring.2')}</Text>
                </div>
            )}
            {status.done && (
                <>
                    <Text variant="h1">✅</Text>
                    <Text>{status.done}</Text>
                </>
            )}
            {status.error && (
                <>
                    <Text>{status.error}</Text>
                    <Button onClick={restoreBackup}>{getText('btn.retry')}</Button>
                </>
            )}
        </div>
    );
}
RestoreKeyBackupDialog.propTypes = {
    keyData: PropTypes.shape({}).isRequired,
};

function DeleteKeyBackupDialog({ requestClose }) {
    const [isDeleting, setIsDeleting] = useState(false);
    const mx = initMatrix.matrixClient;
    const mountStore = useStore();

    const deleteBackup = async () => {
        mountStore.setItem(true);
        setIsDeleting(true);
        try {
            const backupInfo = await mx.getKeyBackupVersion();
            if (backupInfo) await mx.deleteKeyBackupVersion(backupInfo.version);
            if (!mountStore.getItem()) return;
            requestClose(true);
        } catch {
            if (!mountStore.getItem()) return;
            setIsDeleting(false);
        }
    };

    return (
        <div className="key-backup__delete">
            <Text variant="h1">🗑</Text>
            <Text weight="medium">{getText('key_backup.delete.warning')}</Text>
            <Text>{getText('key_backup.delete.warning.2')}</Text>
            {isDeleting ? (
                <Spinner size="small" />
            ) : (
                <Button variant="danger" onClick={deleteBackup}>
                    {getText('btn.key_backup.delete')}
                </Button>
            )}
        </div>
    );
}
DeleteKeyBackupDialog.propTypes = {
    requestClose: PropTypes.func.isRequired,
};

function KeyBackup() {
    const mx = initMatrix.matrixClient;
    const isCSEnabled = useCrossSigningStatus();
    const [keyBackup, setKeyBackup] = useState(undefined);
    const mountStore = useStore();

    const fetchKeyBackupVersion = async () => {
        const info = await mx.getKeyBackupVersion();
        if (!mountStore.getItem()) return;
        setKeyBackup(info);
    };

    useEffect(() => {
        mountStore.setItem(true);
        fetchKeyBackupVersion();

        const handleAccountData = (event) => {
            if (event.getType() === 'm.megolm_backup.v1') {
                fetchKeyBackupVersion();
            }
        };

        mx.on('accountData', handleAccountData);
        return () => {
            mx.removeListener('accountData', handleAccountData);
        };
    }, [isCSEnabled]);

    const openCreateKeyBackup = async () => {
        const keyData = await accessSecretStorage('Create Key Backup');
        if (keyData === null) return;

        openReusableDialog(
            <Text variant="s1" weight="medium">
                {getText('key_backup.create.title')}
            </Text>,
            () => <CreateKeyBackupDialog keyData={keyData} />,
            () => fetchKeyBackupVersion()
        );
    };

    const openRestoreKeyBackup = async () => {
        const keyData = await accessSecretStorage('Restore Key Backup');
        if (keyData === null) return;

        openReusableDialog(
            <Text variant="s1" weight="medium">
                {getText('key_backup.restore.title')}
            </Text>,
            () => <RestoreKeyBackupDialog keyData={keyData} />
        );
    };

    const openDeleteKeyBackup = () =>
        openReusableDialog(
            <Text variant="s1" weight="medium">
                {getText('key_backup.delete.title')}
            </Text>,
            (requestClose) => (
                <DeleteKeyBackupDialog
                    requestClose={(isDone) => {
                        if (isDone) setKeyBackup(null);
                        requestClose();
                    }}
                />
            )
        );

    const renderOptions = () => {
        if (keyBackup === undefined) return <Spinner size="small" />;
        if (keyBackup === null)
            return (
                <Button variant="primary" onClick={openCreateKeyBackup}>
                    {getText('btn.key_backup.create')}
                </Button>
            );
        return (
            <>
                <IconButton
                    src={DownloadIC}
                    variant="positive"
                    onClick={openRestoreKeyBackup}
                    tooltip={getText('tooltip.restore_backup')}
                />
                <IconButton src={BinIC} onClick={openDeleteKeyBackup} tooltip="Delete backup" />
            </>
        );
    };

    return (
        <SettingTile
            title={getText('key_backup.title')}
            content={
                <>
                    <Text variant="b3">
                        {getText('key_backup.tip')}
                    </Text>
                    {!isCSEnabled && (
                        <InfoCard
                            style={{ marginTop: 'var(--sp-ultra-tight)' }}
                            rounded
                            variant="caution"
                            iconSrc={InfoIC}
                            title={getText('crosssigning.tip.2')}
                        />
                    )}
                </>
            }
            options={isCSEnabled ? renderOptions() : null}
        />
    );
}

export default KeyBackup;
